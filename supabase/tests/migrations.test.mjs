// Tests the migrations' security rules against real Postgres (PGlite, in memory),
// with small stand-ins for Supabase's auth / storage schemas and roles.
// Covers: documents, signatures, document numbers, document requests.
//
//   npm run test:db
//
// Nothing here touches the real Supabase project.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const MIG = process.argv[2] ?? fileURLToPath(new URL("../migrations", import.meta.url));
const read = (f) => readFileSync(`${MIG}/${f}`, "utf8");
const db = new PGlite();

const A = "aaaaaaaa-0000-0000-0000-000000000001";
const B = "bbbbbbbb-0000-0000-0000-000000000002";
const C = "cccccccc-0000-0000-0000-000000000003";
const TPL = "00000000-0000-0000-0000-00000000d0c1";

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

async function admin(sql) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  return db.exec(sql);
}
async function as(uid, sql, params) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`);
  try {
    const r = params ? await db.query(sql, params) : await db.query(sql);
    return { rows: r.rows, affected: r.affectedRows };
  } catch (e) {
    return { error: e.message };
  } finally {
    await db.exec("reset role;");
  }
}
async function asAnon(sql) {
  await db.exec(`reset role; set role anon;`);
  try { return { rows: (await db.query(sql)).rows }; }
  catch (e) { return { error: e.message }; }
  finally { await db.exec("reset role;"); }
}

// ---- Supabase stand-ins --------------------------------------------------------
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated;

  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;

  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(),
    bucket_id text, name text, owner uuid default auth.uid());
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated;
  grant select, insert, delete on storage.objects to authenticated;
  grant execute on function storage.foldername(text) to authenticated;

  create publication supabase_realtime;

  create table public.projects (job_number text primary key, job_name text);
  insert into public.projects values ('J1', 'Job one');
  insert into auth.users values ('${A}'), ('${B}'), ('${C}');
`);

// ---- Existing migrations the new one depends on --------------------------------
await admin(read("20261124000007_documents.sql"));
await admin(read("20261124000008_field_deficiency_report.sql"));

// An OLD-style document (signatures inside answers) to test the backfill.
const OLD = "0ld00000-0000-0000-0000-000000000000".replace("0ld", "0dd");
await admin(`
  insert into storage.objects (bucket_id, name, owner) values ('document-photos', '${A}/${OLD}/sig-a.png', '${A}');
  insert into public.document_submissions (id, template_id, template_version, job_number, submitted_by, answers)
  values ('${OLD}', '${TPL}', 1, 'J1', '${A}', '{
    "topic": "Ladders",
    "photos": ["${A}/${OLD}/p.jpg"],
    "signatures": [
      {"user_id": "${A}", "signature": "${A}/${OLD}/sig-a.png"},
      {"user_id": "${B}", "signature": null},
      {"user_id": "not-a-uuid", "signature": null},
      {"user_id": "dddddddd-0000-0000-0000-000000000009", "signature": null}
    ]}'::jsonb);
`);

console.log("\n# Migration runs, and re-runs");
try { await admin(read("20261125000015_document_signatures.sql")); ok("first run", true); }
catch (e) { ok("first run", false, e.message); process.exit(1); }
try { await admin(read("20261125000015_document_signatures.sql")); ok("second run (idempotent)", true); }
catch (e) { ok("second run (idempotent)", false, e.message); }

console.log("\n# Backfill of old documents");
{
  const r = (await db.query(
    `select user_id, signature_path, signed_at is not null as signed, sort_order, requested_by
       from public.document_signatures where submission_id = $1 order by sort_order`, [OLD])).rows;
  ok("2 valid rows copied (bad uuid + unknown user skipped), not duplicated on re-run", r.length === 2, JSON.stringify(r));
  ok("A signed, B outstanding", r[0]?.user_id === A && r[0]?.signed && r[1]?.user_id === B && !r[1]?.signed);
  ok("requested_by = submitter", r.every((x) => x.requested_by === A));
  const pub = (await db.query(`select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='document_signatures'`)).rows;
  ok("table added to realtime publication", pub.length === 1);
}

// ---- New document via submit_document() ----------------------------------------
const DOC = "11111111-0000-0000-0000-000000000000";
const aSig = `${A}/${DOC}/signatures-1-${A}.png`;
await admin(`insert into storage.objects (bucket_id, name, owner) values ('document-photos', '${aSig}', '${A}')`);
const submit = (uid, id, sigs) => as(uid,
  `select public.submit_document($1, $2, 1, 'J1', '{"topic":"x","signatures":null}'::jsonb, $3::jsonb) as id`,
  [id, TPL, JSON.stringify(sigs)]);

console.log("\n# Submitting");
{
  const r = await submit(A, DOC, [
    { field_id: "signatures", sort_order: 0, user_id: A, signature_path: aSig },
    { field_id: "signatures", sort_order: 1, user_id: B, signature_path: null },
    { field_id: "signatures", sort_order: 2, user_id: C, signature_path: null },
  ]);
  ok("A submits document + 3 requests", !r.error, r.error);
  const rows = (await db.query(`select user_id, signed_at, requested_by from public.document_signatures where submission_id=$1 order by sort_order`, [DOC])).rows;
  ok("3 rows saved", rows.length === 3);
  ok("A's on-the-spot signature stamped signed_at by server", !!rows[0]?.signed_at);
  ok("B and C outstanding", !rows[1]?.signed_at && !rows[2]?.signed_at);
  ok("requested_by forced to submitter", rows.every((x) => x.requested_by === A));
}
{
  const BAD = "22222222-0000-0000-0000-000000000000";
  const r = await submit(A, BAD, [{ field_id: "signatures", sort_order: 0, user_id: A, signature_path: `${B}/someone-elses.png` }]);
  ok("submit with someone else's signature image is rejected", !!r.error, r.error);
  const left = (await db.query(`select 1 from public.document_submissions where id=$1`, [BAD])).rows;
  ok("...and the document itself was NOT saved (all or nothing)", left.length === 0);
}
{
  const r = await submit(B, "33333333-0000-0000-0000-000000000000", [
    { field_id: "signatures", sort_order: 0, user_id: B, signature_path: null }]);
  ok("B can submit their own document too", !r.error, r.error);
}
{
  const r = await as(B, `select public.submit_document($1, $2, 1, 'J1', '{}'::jsonb, '{"not":"array"}'::jsonb)`,
    ["44444444-0000-0000-0000-000000000000", TPL]);
  ok("non-array p_signatures rejected", !!r.error, r.error);
}

console.log("\n# Signing later");
const rowOf = async (uid) => (await db.query(
  `select id, signed_at from public.document_signatures where submission_id=$1 and user_id=$2`, [DOC, uid])).rows[0];
const bRow = await rowOf(B), cRow = await rowOf(C), aRow = await rowOf(A);
const bSig = `${B}/${DOC}/signatures-${B}-x.png`;
await admin(`insert into storage.objects (bucket_id, name, owner) values ('document-photos', '${bSig}', '${B}')`);

{
  const r = await as(C, `update public.document_signatures set signature_path=$1 where id=$2 returning id`, [`${C}/fake.png`, bRow.id]);
  ok("C can't sign B's request (0 rows)", !r.error && r.rows.length === 0, JSON.stringify(r));
}
{
  const r = await as(C, `update public.document_signatures set signature_path=$1 where id=$2 returning id`, [bSig, cRow.id]);
  ok("C can't use B's image on their own request", !!r.error, JSON.stringify(r));
}
{
  const r = await as(C, `update public.document_signatures set signature_path=$1 where id=$2 returning id`, [`${C}/${DOC}/missing.png`, cRow.id]);
  ok("C can't point at an image that doesn't exist", !!r.error, JSON.stringify(r));
}
{
  const r = await as(C, `update public.document_signatures set user_id=$1 where id=$2`, [B, cRow.id]);
  ok("C can't change who a request is for (column grant)", !!r.error && /permission denied/.test(r.error), JSON.stringify(r));
}
{
  const r = await as(C, `update public.document_signatures set signed_at=now() - interval '1 year' where id=$1`, [cRow.id]);
  ok("C can't set signed_at themselves (column grant)", !!r.error && /permission denied/.test(r.error), JSON.stringify(r));
}
{
  const r = await as(B, `update public.document_signatures set signature_path=null where id=$1 returning id`, [bRow.id]);
  ok("B can't 'sign' with an empty signature", !!r.error, JSON.stringify(r));
}
{
  const r = await as(B, `update public.document_signatures set signature_path=$1 where id=$2 returning id, signed_at`, [bSig, bRow.id]);
  ok("B signs their own request", !r.error && r.rows.length === 1 && !!r.rows[0].signed_at, JSON.stringify(r));
}
{
  const other = `${B}/${DOC}/again.png`;
  await admin(`insert into storage.objects (bucket_id, name, owner) values ('document-photos', '${other}', '${B}')`);
  const r = await as(B, `update public.document_signatures set signature_path=$1 where id=$2 returning id`, [other, bRow.id]);
  ok("B can't change a signature once signed", !!r.error || r.rows.length === 0, JSON.stringify(r));
}
{
  const r = await as(A, `update public.document_signatures set signature_path=$1 where id=$2 returning id`, [aSig, cRow.id]);
  ok("submitter A can't sign on C's behalf", !r.error && r.rows.length === 0, JSON.stringify(r));
}

console.log("\n# The rest of the document is untouchable by signers");
{
  const r = await as(B, `update public.document_submissions set answers='{"topic":"hacked"}' where id=$1 returning id`, [DOC]);
  ok("B can't edit the document's answers", !r.error && r.rows.length === 0, JSON.stringify(r));
  const r2 = await as(C, `update public.document_submissions set job_number=null where id=$1 returning id`, [DOC]);
  ok("C can't edit the document", !r2.error && r2.rows.length === 0, JSON.stringify(r2));
}

console.log("\n# Requests: adding / removing");
{
  const r = await as(B, `insert into public.document_signatures (submission_id, field_id, user_id) values ($1, 'signatures', $2)`, [DOC, B]);
  ok("B can't add requests to A's document", !!r.error, JSON.stringify(r));
}
{
  const r = await as(B, `delete from public.document_signatures where id=$1 returning id`, [cRow.id]);
  ok("B can't remove requests on A's document", !r.error && r.rows.length === 0, JSON.stringify(r));
}
{
  const r = await as(A, `delete from public.document_signatures where id=$1 returning id`, [bRow.id]);
  ok("A can't remove a request that's been signed", !r.error && r.rows.length === 0, JSON.stringify(r));
}
{
  const r = await as(A, `delete from public.document_signatures where id=$1 returning id`, [aRow.id]);
  ok("A can't remove their own signed row either", !r.error && r.rows.length === 0, JSON.stringify(r));
}
{
  const r = await as(A, `delete from public.document_signatures where id=$1 returning id`, [cRow.id]);
  ok("A can withdraw C's unsigned request", !r.error && r.rows.length === 1, JSON.stringify(r));
}
{
  const r = await as(A, `insert into public.document_signatures (submission_id, field_id, user_id, signed_at, requested_by)
                         values ($1, 'signatures', $2, now(), $3) returning signed_at, requested_by`, [DOC, C, B]);
  ok("A can re-request C, but can't pre-fill signed_at or fake requested_by",
    !r.error && r.rows[0]?.signed_at === null && r.rows[0]?.requested_by === A, JSON.stringify(r));
}

console.log("\n# Lookups and outsiders");
{
  const r = await as(C, `select count(*)::int as n from public.document_signatures where user_id=$1 and signed_at is null`, [C]);
  ok("C sees their outstanding request", r.rows?.[0]?.n === 1, JSON.stringify(r));
  const plan = (await db.query(`explain select id from public.document_signatures where user_id='${C}' and signed_at is null`)).rows
    .map((x) => Object.values(x)[0]).join(" ");
  console.log(`  (plan: ${plan})`);
}
{
  const r = await asAnon(`select * from public.document_signatures`);
  ok("logged-out (anon) can't read the table", !!r.error, JSON.stringify(r));
  const r2 = await asAnon(`select public.submit_document(gen_random_uuid(), '${TPL}', 1, null, '{}', '[]')`);
  ok("logged-out (anon) can't call submit_document", !!r2.error, JSON.stringify(r2));
}

// ---- Follow-up migration: 20261125000016 ----------------------------------------
console.log("\n# Follow-up migration runs, and re-runs");
const beforeUpdatedAt = (await db.query(`select updated_at from public.document_submissions where id=$1`, [OLD])).rows[0].updated_at;
try { await admin(read("20261125000016_signature_integrity.sql")); ok("first run", true); }
catch (e) { ok("first run", false, e.message); }
try { await admin(read("20261125000016_signature_integrity.sql")); ok("second run (idempotent)", true); }
catch (e) { ok("second run (idempotent)", false, e.message); }
try { await admin(read("20261125000015_document_signatures.sql")); ok("re-running the first migration afterwards is still fine", true); }
catch (e) { ok("re-running the first migration afterwards is still fine", false, e.message); }

console.log("\n# Old documents fully moved out of answers");
{
  const rows = (await db.query(`select sort_order, user_id, signature_path, signed_at from public.document_signatures
                                where submission_id=$1 order by sort_order`, [OLD])).rows;
  ok("all 4 old entries now rows (2 real users + 2 removed users), no duplicates", rows.length === 4, JSON.stringify(rows));
  ok("removed-user rows have user_id null and aren't signed", rows.slice(2).every((r) => r.user_id === null && !r.signed_at));
  const a = (await db.query(`select answers, updated_at from public.document_submissions where id=$1`, [OLD])).rows[0];
  ok("signature list in answers cleared to null", a.answers.signatures === null, JSON.stringify(a.answers));
  ok("other answers untouched (topic, photos list)", a.answers.topic === "Ladders" && Array.isArray(a.answers.photos));
  ok("updated_at not changed by the clean-up", +a.updated_at === +beforeUpdatedAt);
}

console.log("\n# Signature images are locked");
{
  const r = await as(A, `delete from storage.objects where name=$1 returning name`, [aSig]);
  ok("A can't delete a signature image they uploaded", !r.error && r.rows.length === 0, JSON.stringify(r));
  const r2 = await as(B, `delete from storage.objects where name=$1 returning name`, [bSig]);
  ok("B can't delete their own signed image", !r2.error && r2.rows.length === 0, JSON.stringify(r2));
  const r3 = await as(B, `update storage.objects set name='${B}/swap.png' where name=$1 returning name`, [bSig]);
  ok("...or rename/overwrite it", !!r3.error || r3.rows.length === 0, JSON.stringify(r3));
  const loose = `${B}/${DOC}/unused.png`;
  await admin(`insert into storage.objects (bucket_id, name, owner) values ('document-photos', '${loose}', '${B}')`);
  const r4 = await as(B, `delete from storage.objects where name=$1 returning name`, [loose]);
  ok("B can still delete their own files that aren't signatures", !r4.error && r4.rows.length === 1, JSON.stringify(r4));
}

console.log("\n# Progress view");
{
  const r = await as(C, `select submission_id, signed, total from public.document_signature_progress where submission_id in ($1, $2) order by submission_id`, [OLD, DOC]);
  const byId = Object.fromEntries((r.rows ?? []).map((x) => [x.submission_id, x]));
  // OLD: A signed, B unsigned, 2 removed-user unsigned (don't count) => 1/2
  ok("old doc: 1 of 2 (removed users not counted)", byId[OLD]?.signed === 1 && byId[OLD]?.total === 2, JSON.stringify(r));
  // DOC: A signed, B signed, C re-requested unsigned => 2/3
  ok("new doc: 2 of 3", byId[DOC]?.signed === 2 && byId[DOC]?.total === 3, JSON.stringify(r));
  const r2 = await asAnon(`select * from public.document_signature_progress`);
  ok("logged-out (anon) can't read the view", !!r2.error, JSON.stringify(r2));
}

// ---- Document numbers: 20261125000018 -------------------------------------------
console.log("\n# Document numbers");
const docsBefore = (await db.query(`select id, submitted_at, updated_at from public.document_submissions order by submitted_at, id`)).rows;
try {
  await admin(read("20261125000017_submissions_realtime.sql"));
  await admin(read("20261125000018_document_numbers.sql"));
  await admin(read("20261125000018_document_numbers.sql"));
  ok("migrations 17 + 18 run, and 18 re-runs", true);
} catch (e) { ok("migrations 17 + 18 run, and 18 re-runs", false, e.message); }
{
  const rows = (await db.query(`select id, document_number, updated_at from public.document_submissions order by submitted_at, id`)).rows;
  ok("existing documents numbered 0,1,2… in submission order",
    rows.map((r) => r.document_number).join() === rows.map((_, i) => i).join(), JSON.stringify(rows.map((r) => r.document_number)));
  ok("numbering existing documents didn't change updated_at",
    rows.every((r, i) => +r.updated_at === +docsBefore[i].updated_at));
}
const nextExpected = docsBefore.length;
{
  const id = "55555555-0000-0000-0000-000000000000";
  const r = await submit(B, id, []);
  const row = (await db.query(`select document_number, submitted_at from public.document_submissions where id=$1`, [id])).rows[0];
  ok("a new document gets the next number", !r.error && row?.document_number === nextExpected, JSON.stringify({ r, row }));
  ok("...and its submit time is the server's clock", row && Math.abs(Date.now() - +row.submitted_at) < 60_000);
}
{
  // A save that fails (bad signature image) must not use up a number
  const bad = await submit(A, "66666666-0000-0000-0000-000000000000",
    [{ field_id: "signatures", sort_order: 0, user_id: A, signature_path: `${B}/nope.png` }]);
  const id = "77777777-0000-0000-0000-000000000000";
  const r = await submit(A, id, []);
  const row = (await db.query(`select document_number from public.document_submissions where id=$1`, [id])).rows[0];
  ok("a failed save doesn't use up a number (no gaps)", !!bad.error && !r.error && row?.document_number === nextExpected + 1, JSON.stringify({ bad: bad.error, row }));
}
{
  const id = "88888888-0000-0000-0000-000000000000";
  const r = await as(A, `insert into public.document_submissions (id, template_id, template_version, document_number, submitted_at, answers)
                         values ($1, $2, 1, 999, '2020-01-01', '{}') returning document_number, submitted_at`, [id, TPL]);
  ok("can't pick your own number or backdate the submit time",
    !r.error && r.rows[0].document_number === nextExpected + 2 && new Date(r.rows[0].submitted_at).getFullYear() > 2020, JSON.stringify(r));
  const u = await as(A, `update public.document_submissions set document_number=0, submitted_at='2020-01-01' where id=$1 returning document_number, submitted_at`, [id]);
  ok("can't change the number or submit time afterwards",
    !u.error && u.rows[0].document_number === nextExpected + 2 && new Date(u.rows[0].submitted_at).getFullYear() > 2020, JSON.stringify(u));
}
{
  const n = (await db.query(`select count(*)::int as n, count(distinct document_number)::int as d, min(document_number) as lo, max(document_number) as hi from public.document_submissions`)).rows[0];
  ok("numbers unique and gap-free from 0", n.n === n.d && n.lo === 0 && n.hi === n.n - 1, JSON.stringify(n));
}

// ---- PSA template: 20261125000019 -----------------------------------------------
console.log("\n# PSA template");
const PSA = "00000000-0000-0000-0000-00000000d0c3";
try {
  await admin(read("20261125000019_psa_template.sql"));
  await admin(read("20261125000019_psa_template.sql"));
  ok("runs, and re-runs", true);
} catch (e) { ok("runs, and re-runs", false, e.message); }
{
  const t = (await db.query(`select name, archived from public.document_templates where id=$1`, [PSA])).rows;
  ok("template 'PSA' exists, not archived, only once", t.length === 1 && t[0].name === "PSA" && !t[0].archived, JSON.stringify(t));
  const v = (await db.query(`select version, fields from public.document_template_versions where template_id=$1`, [PSA])).rows;
  ok("one version (v1)", v.length === 1 && v[0].version === 1);
  const fields = v[0]?.fields ?? [];
  const ids = fields.map((f) => f.id);
  const KNOWN = ["text", "textarea", "number", "date", "checkbox", "select", "job", "photos", "signature", "completed_by", "signatures"];
  ok("field ids unique", new Set(ids).size === ids.length);
  ok("every field type is one the app knows", fields.every((f) => KNOWN.includes(f.type)), JSON.stringify(fields.map((f) => f.type)));
  ok("every field has a label", fields.every((f) => typeof f.label === "string" && f.label.trim()));
  const div = fields.find((f) => f.id === "division");
  ok("Division options as asked (with Other)", JSON.stringify(div?.options) === JSON.stringify(["Decker", "Structural erection", "Misc. metal", "Painter", "Other"]));
  ok("every showIf points at a real field + option",
    fields.filter((f) => f.showIf).every((f) => {
      const target = fields.find((x) => x.id === f.showIf.field);
      return target && (!target.options || target.options.includes(f.showIf.equals));
    }));
  ok("exactly one Foreman (person) field and one signatures table",
    fields.filter((f) => f.type === "completed_by").length === 1 && fields.filter((f) => f.type === "signatures").length === 1);
  console.log("  fields: " + fields.map((f) => `${f.label} [${f.type}]`).join(", "));
}
{
  const id = "99999999-0000-0000-0000-000000000000";
  const maxBefore = (await db.query(`select max(document_number) as m from public.document_submissions`)).rows[0].m;
  const r = await as(A, `select public.submit_document($1, $2, 1, 'J1', $3::jsonb, $4::jsonb)`, [id, PSA,
    JSON.stringify({ foreman: A, task_location: "Level 3 east", division: "Other", division_other: "Rigging",
      muster_point: "Gate 2", documents_referenced: "SWP-12", fall_protection: "Retractable lanyard",
      notify_harness: true, hazards_and_ppe: "x", ppe_requirements: "x", task: "x", hazards: "x", controls: "x", signatures: null }),
    JSON.stringify([{ field_id: "signatures", sort_order: 0, user_id: A, signature_path: null },
                    { field_id: "signatures", sort_order: 1, user_id: B, signature_path: null }])]);
  const row = (await db.query(`select document_number from public.document_submissions where id=$1`, [id])).rows[0];
  const sigs = (await db.query(`select count(*)::int as n from public.document_signatures where submission_id=$1 and signed_at is null`, [id])).rows[0];
  ok("a PSA submits, gets the next document number, and its 2 signers are outstanding",
    !r.error && row?.document_number === maxBefore + 1 && sigs.n === 2, JSON.stringify({ r: r.error, row, sigs }));
}

// ---- Harness Inspection template: 20261125000020 ---------------------------------
console.log("\n# Harness Inspection template");
const HI = "00000000-0000-0000-0000-00000000d0c4";
try {
  await admin(read("20261125000020_harness_inspection_template.sql"));
  await admin(read("20261125000020_harness_inspection_template.sql"));
  ok("runs, and re-runs", true);
} catch (e) { ok("runs, and re-runs", false, e.message); }
{
  const v = (await db.query(`select fields from public.document_template_versions where template_id=$1`, [HI])).rows;
  const fields = v[0]?.fields ?? [];
  const ids = fields.map((f) => f.id);
  const KNOWN = ["text", "textarea", "number", "date", "checkbox", "select", "job", "photos", "signature",
    "completed_by", "signatures", "person", "datetime", "yes_no_na", "section"];
  ok("one version, field ids unique, every type known",
    v.length === 1 && new Set(ids).size === ids.length && fields.every((f) => KNOWN.includes(f.type)),
    JSON.stringify(fields.map((f) => f.type)));
  const checklist = fields.filter((f) => f.type === "yes_no_na");
  ok("12 checklist items, all required", checklist.length === 12 && checklist.every((f) => f.required));
  const secs = fields.map((f, i) => [f, i]).filter(([f]) => f.type === "section");
  ok("2 sections: Inspection, Comments and corrective action",
    secs.map(([f]) => f.label).join("|") === "Inspection|Comments and corrective action");
  ok("all checklist items sit under 'Inspection'",
    checklist.every((f) => { const i = ids.indexOf(f.id); return i > secs[0][1] && i < secs[1][1]; }));
  console.log("  fields: " + fields.map((f) => `${f.label} [${f.type}]`).join(", "));
}
{
  const id = "aaaaaaaa-1111-0000-0000-000000000000";
  const answers = { foreman: A, inspected_by: B, inspected_at: "2026-11-25T21:05:00.000Z", harness_type: "Full body", model_number: "M-1" };
  for (const k of ["harness_stitching","harness_webbing","harness_components","harness_wear","lanyard_stitching","lanyard_webbing",
    "lanyard_components","lanyard_wear","signage_available","buddy_system","communication","rescue_procedure"]) answers[k] = "yes";
  answers.lanyard_wear = "no"; answers.signage_available = "na"; answers.signatures = null;
  const r = await as(A, `select public.submit_document($1, $2, 1, 'J1', $3::jsonb, $4::jsonb)`, [id, HI, JSON.stringify(answers),
    JSON.stringify([{ field_id: "signatures", sort_order: 0, user_id: A, signature_path: null }])]);
  const row = (await db.query(`select document_number, answers from public.document_submissions where id=$1`, [id])).rows[0];
  ok("a Harness Inspection submits with a number and its answers intact",
    !r.error && Number.isInteger(row?.document_number) && row.answers.lanyard_wear === "no" && row.answers.signage_available === "na",
    JSON.stringify({ r: r.error }));
}

// ---- Document requests: 20261125000021 ------------------------------------------
console.log("\n# Document requests");
try {
  await admin(read("20261125000021_document_requests.sql"));
  await admin(read("20261125000021_document_requests.sql"));
  ok("runs, and re-runs", true);
} catch (e) { ok("runs, and re-runs", false, e.message); }
{
  const fns = (await db.query(`select pg_get_function_identity_arguments(p.oid) as args from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace where n.nspname='public' and p.proname='submit_document'`)).rows;
  ok("exactly one submit_document (old 6-arg version replaced)", fns.length === 1 && fns[0].args.split(",").length === 7, JSON.stringify(fns));
  const v2 = (await db.query(`select fields from public.document_template_versions where template_id=$1 and version=2`, [PSA])).rows[0];
  const cb = v2?.fields.find((f) => f.id === "notify_harness");
  ok("PSA v2: harness checkbox requests the Harness Inspection", cb?.requestDocument?.templateId === HI && cb.label === "Request harness inspection");
  const pub = (await db.query(`select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='document_requests'`)).rows;
  ok("document_requests is live (realtime)", pub.length === 1);
}
const PSA2 = "bbbbbbbb-2222-0000-0000-000000000000";
const submit7 = (uid, id, tpl, version, sigs, reqs) => as(uid,
  `select public.submit_document($1, $2, $3, 'J1', '{}'::jsonb, $4::jsonb, $5::jsonb)`,
  [id, tpl, version, JSON.stringify(sigs), JSON.stringify(reqs)]);
{
  // Foreman A submits a PSA with B and C signing, harness inspection requested
  const sigs = [A, B, C].map((u, i) => ({ field_id: "signatures", sort_order: i, user_id: u, signature_path: null }));
  const reqs = [A, B, C, B].map((u) => ({ template_id: HI, user_id: u })); // B twice: deduped
  const r = await submit7(A, PSA2, PSA, 2, sigs, reqs);
  const rows = (await db.query(`select requested_user_id, requested_by, fulfilled_at from public.document_requests
                                where source_submission_id=$1 order by requested_user_id`, [PSA2])).rows;
  ok("PSA submits and asks all 3 signers (deduped) for a Harness Inspection",
    !r.error && rows.length === 3 && rows.every((x) => x.requested_by === A && !x.fulfilled_at), JSON.stringify({ e: r.error, rows }));
}
{
  const r = await submit7(A, "bbbbbbbb-3333-0000-0000-000000000000", PSA, 2, [], [{ template_id: HI, user_id: "not-a-uuid" }]);
  const left = (await db.query(`select 1 from public.document_submissions where id='bbbbbbbb-3333-0000-0000-000000000000'`)).rows;
  ok("a bad request rolls back the whole document (all or nothing)", !!r.error && left.length === 0, r.error);
}
{
  // B can't fake-complete their request with someone else's document or a different type
  const req = (await db.query(`select id from public.document_requests where source_submission_id=$1 and requested_user_id=$2`, [PSA2, B])).rows[0];
  const r1 = await as(B, `update public.document_requests set fulfilled_submission_id=$1 where id=$2 returning id`, [PSA2, req.id]);
  ok("B can't complete it with a document that isn't theirs / isn't a Harness Inspection", !!r1.error, JSON.stringify(r1));
  const r2 = await as(C, `update public.document_requests set fulfilled_submission_id=$1 where id=$2 returning id`, [PSA2, req.id]);
  ok("C can't touch B's request", !r2.error && r2.rows.length === 0, JSON.stringify(r2));
  const r3 = await as(B, `update public.document_requests set requested_user_id=$1 where id=$2`, [C, req.id]);
  ok("B can't reassign the request (column grant)", !!r3.error && /permission denied/.test(r3.error), JSON.stringify(r3));
  const r4 = await as(B, `insert into public.document_requests (template_id, requested_user_id, source_submission_id) values ($1, $2, $3)`, [HI, C, PSA2]);
  ok("B can't add requests to A's PSA", !!r4.error, JSON.stringify(r4));
}
{
  // B submits a Harness Inspection -> their open request is completed automatically
  const HI_B = "bbbbbbbb-4444-0000-0000-000000000000";
  const r = await submit7(B, HI_B, HI, 1, [], []);
  const rows = (await db.query(`select requested_user_id, fulfilled_submission_id, fulfilled_at from public.document_requests
                                where source_submission_id=$1 order by requested_user_id`, [PSA2])).rows;
  const byUser = Object.fromEntries(rows.map((x) => [x.requested_user_id, x]));
  ok("B's Harness Inspection completes B's request (server-stamped)",
    !r.error && byUser[B]?.fulfilled_submission_id === HI_B && !!byUser[B]?.fulfilled_at, JSON.stringify({ e: r.error, rows }));
  ok("...and leaves A's and C's open", !byUser[A]?.fulfilled_at && !byUser[C]?.fulfilled_at);
  const again = await as(B, `update public.document_requests set fulfilled_submission_id=$1 where requested_user_id=$2 and source_submission_id=$3 returning id`, [HI_B, B, PSA2]);
  ok("a completed request can't be changed", !again.error && again.rows.length === 0, JSON.stringify(again));
}
{
  // C submits a PSA (not a Harness Inspection) -> doesn't complete C's harness request
  await submit7(C, "bbbbbbbb-5555-0000-0000-000000000000", PSA, 2, [], []);
  const c = (await db.query(`select fulfilled_at from public.document_requests where source_submission_id=$1 and requested_user_id=$2`, [PSA2, C])).rows[0];
  ok("a different document type doesn't complete the request", c && !c.fulfilled_at);
}
{
  const r = await as(B, `delete from public.document_requests where source_submission_id=$1 and requested_user_id=$2 returning id`, [PSA2, C]);
  ok("only the requester can withdraw a request", !r.error && r.rows.length === 0, JSON.stringify(r));
  const r2 = await as(A, `delete from public.document_requests where source_submission_id=$1 and requested_user_id=$2 returning id`, [PSA2, B]);
  ok("...and not once it's completed", !r2.error && r2.rows.length === 0, JSON.stringify(r2));
  const r3 = await asAnon(`select * from public.document_requests`);
  ok("logged-out (anon) can't read requests", !!r3.error);
}

// ---- TEMP: clear all documents: 20261125000022 -----------------------------------
console.log("\n# Temporary: clear all documents");
try {
  await admin(read("20261125000022_temp_clear_documents.sql"));
  await admin(read("20261125000022_temp_clear_documents.sql"));
  ok("runs, and re-runs", true);
} catch (e) { ok("runs, and re-runs", false, e.message); }
{
  const before = (await db.query(`select count(*)::int as n from public.document_submissions`)).rows[0].n;
  const templatesBefore = (await db.query(`select count(*)::int as n from public.document_template_versions`)).rows[0].n;
  const anon = await asAnon(`select public.dev_clear_all_documents('DELETE ALL DOCUMENTS')`);
  ok("logged-out (anon) can't call it", !!anon.error, JSON.stringify(anon));
  const wrong = await as(B, `select public.dev_clear_all_documents('yes')`);
  ok("wrong confirmation text is refused, nothing deleted",
    !!wrong.error && (await db.query(`select count(*)::int as n from public.document_submissions`)).rows[0].n === before);
  const r = await as(B, `select public.dev_clear_all_documents('DELETE ALL DOCUMENTS') as n`);
  const counts = (await db.query(`select
      (select count(*) from public.document_submissions)::int as subs,
      (select count(*) from public.document_signatures)::int as sigs,
      (select count(*) from public.document_requests)::int as reqs,
      (select count(*) from public.document_template_versions)::int as tpl`)).rows[0];
  ok(`clears all ${before} documents + their signatures and requests`, !r.error && r.rows[0].n === before
    && counts.subs === 0 && counts.sigs === 0 && counts.reqs === 0, JSON.stringify({ e: r.error, counts }));
  ok("forms (templates) are kept", counts.tpl === templatesBefore);
  const again = await submit7(B, "cccccccc-9999-0000-0000-000000000000", HI, 1, [], []);
  const num = (await db.query(`select document_number from public.document_submissions where id='cccccccc-9999-0000-0000-000000000000'`)).rows[0];
  ok("next document is #0 again", !again.error && num?.document_number === 0, JSON.stringify({ e: again.error, num }));
  const loose = await as(B, `delete from storage.objects where name=$1 returning name`, [bSig]);
  ok("signature images can be cleaned up afterwards (no longer referenced)", !loose.error && loose.rows.length === 1, JSON.stringify(loose));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { LocalDate } from "@/components/local-date";
import { createClient } from "@/lib/supabase/client";
import {
  formatDocumentNumber,
  YES_NO_NA,
  isFieldVisible,
  PHOTO_BUCKET,
  type Answers,
  type AnswerValue,
  type DocumentTemplate,
  type DocumentTemplateVersion,
  type TemplateField,
} from "@/lib/documents";
import type { Person } from "@/lib/person";
import type { Project } from "@/lib/projects";
import { cn } from "@/lib/utils";
import { JobPicker } from "./job-picker";
import { PhotoUpload, type PhotoItem } from "./photo-upload";
import { personOption, SearchSelect } from "./search-select";
import { SignaturePad } from "./signature-pad";
import { newSignatureRow, SignatureTable, type SignatureRow } from "./signature-table";
import { inputClass } from "./styles";

// Field types whose values live in their own state (files / drawings),
// not in `answers`, until the form is submitted.
const FILE_TYPES = new Set(["photos", "signature", "signatures"]);
// Field types that are just layout and never have an answer
const LAYOUT_TYPES = new Set(["section"]);

// "now" in the format a datetime-local input uses (local time, to the minute)
function localNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// Fills in any document template. Each field in the template's list is drawn
// according to its type.
export function DocumentForm({
  template,
  version,
  projects,
  currentJob,
  people,
  currentUserId,
  crewIds,
}: {
  template: DocumentTemplate;
  version: DocumentTemplateVersion;
  projects: Project[];
  currentJob: string | null;
  people: Person[];
  currentUserId: string;
  crewIds: string[]; // the signed-in user's crew, for "Quick add" on signature tables
}) {
  const fields = version.fields;

  // Starting values: job = current job, completed by = current user
  const [answers, setAnswers] = useState<Answers>(() =>
    Object.fromEntries(
      fields
        .filter((f) => !FILE_TYPES.has(f.type) && !LAYOUT_TYPES.has(f.type))
        .map((f) => [
          f.id,
          f.type === "job"
            ? currentJob ?? ""
            : f.type === "completed_by"
              ? currentUserId
              : f.type === "checkbox"
                ? false
                : "",
        ]),
    ),
  );
  useEffect(() => {
    const now = localNow();
    setAnswers((prev) => {
      const next = { ...prev };
      for (const f of fields) if (f.type === "datetime" && !next[f.id]) next[f.id] = now;
      return next;
    });
  }, [fields]);
  const [photos, setPhotos] = useState<Record<string, PhotoItem[]>>({});
  const [signature, setSignature] = useState<Record<string, Blob | null>>({});
  // Signature tables always start with the current user
  const [signatureRows, setSignatureRows] = useState<Record<string, SignatureRow[]>>(() =>
    Object.fromEntries(
      fields
        .filter((f) => f.type === "signatures")
        .map((f) => [f.id, [newSignatureRow(currentUserId, `${f.id}-first-signer`)]]),
    ),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // After saving: the new document's id and how many people still need to sign
  const [submitted, setSubmitted] = useState<{
    id: string;
    awaiting: number;
    requested: number; // people asked to complete another document
    number: number | null;
    submittedAt: string | null;
  } | null>(null);

  const clearError = (id: string) =>
    setErrors((prev) => {
      const { [id]: _removed, ...rest } = prev; // eslint-disable-line @typescript-eslint/no-unused-vars
      return rest;
    });

  const setAnswer = (id: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    clearError(id);
  };

  // The first signer is always whoever "Completed by" is set to.
  // Changing it starts that row fresh (a new person needs a new signature).
  function setCompletedBy(id: string, userId: string) {
    setAnswer(id, userId);
    setSignatureRows((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([fieldId, rows]) => [
          fieldId,
          [newSignatureRow(userId), ...rows.slice(1).filter((r) => r.userId !== userId)],
        ]),
      ),
    );
  }

  const visibleFields = fields.filter((f) => isFieldVisible(f, answers));

  function validate() {
    const found: Record<string, string> = {};
    for (const f of visibleFields) {
      if (f.type === "signatures") {
        const rows = signatureRows[f.id] ?? [];
        // Anyone who hasn't signed yet is sent a request to sign later
        if (rows.some((r) => !r.userId)) found[f.id] = "Choose a person for every row, or remove the empty row";
        continue;
      }
      if (f.type === "completed_by") {
        if (!answers[f.id]) found[f.id] = "Choose who completed this";
        continue;
      }
      if (!f.required) continue;
      const v = answers[f.id];
      const empty =
        f.type === "photos"
          ? (photos[f.id] ?? []).length === 0
          : f.type === "signature"
            ? !signature[f.id]
            : f.type === "checkbox"
              ? v !== true
              : v === null || v === undefined || String(v).trim() === "";
      if (empty) found[f.id] = `${f.label} is required`;
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setSubmitting(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) {
      setSubmitError("You're not signed in.");
      setSubmitting(false);
      return;
    }

    const submissionId = crypto.randomUUID();
    const uploaded: string[] = [];

    // Upload one file to <uid>/<submission id>/<name> and remember it for cleanup
    async function upload(name: string, file: Blob, contentType: string) {
      const path = `${userId}/${submissionId}/${name}`;
      const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType });
      if (error) throw new Error(`Upload failed: ${error.message}`);
      uploaded.push(path);
      return path;
    }

    try {
      const finalAnswers: Answers = {};
      const signatureRequests: {
        field_id: string;
        sort_order: number;
        user_id: string;
        signature_path: string | null;
      }[] = [];
      let jobNumber: string | null = null;

      for (const f of visibleFields) {
        switch (f.type) {
          case "job":
            jobNumber = (answers[f.id] as string) || null;
            break;
          case "completed_by":
            finalAnswers[f.id] = (answers[f.id] as string) || userId;
            break;
          case "photos": {
            const paths: string[] = [];
            for (const [i, photo] of (photos[f.id] ?? []).entries()) {
              const safeName = photo.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
              paths.push(await upload(`${i + 1}-${safeName}`, photo.file, photo.file.type));
            }
            finalAnswers[f.id] = paths;
            break;
          }
          case "signature": {
            const png = signature[f.id];
            finalAnswers[f.id] = png ? await upload(`signature-${f.id}.png`, png, "image/png") : null;
            break;
          }
          case "signatures": {
            // Saved in document_signatures (one row per person), not in answers.
            // Rows without a drawing become requests the person signs later.
            for (const [i, row] of (signatureRows[f.id] ?? []).entries()) {
              signatureRequests.push({
                field_id: f.id,
                sort_order: i,
                user_id: row.userId,
                signature_path: row.png
                  ? await upload(`${f.id}-${i + 1}-${row.userId}.png`, row.png, "image/png")
                  : null,
              });
            }
            finalAnswers[f.id] = null; // marks the field as part of this document
            break;
          }
          case "section":
            break; // headings save nothing
          case "datetime": {
            // Typed in local time; saved as an exact moment so it reads right anywhere
            const v = answers[f.id];
            finalAnswers[f.id] = typeof v === "string" && v ? new Date(v).toISOString() : null;
            break;
          }
          default: {
            const v = answers[f.id];
            finalAnswers[f.id] = typeof v === "string" ? v.trim() : v;
          }
        }
      }

      // Ticked "request a document" checkboxes ask everyone on the signature list
      const signerIds = [...new Set(signatureRequests.map((r) => r.user_id).filter(Boolean))];
      const documentRequests = visibleFields
        .filter((f) => f.type === "checkbox" && f.requestDocument && answers[f.id] === true)
        .flatMap((f) => signerIds.map((user_id) => ({ template_id: f.requestDocument!.templateId, user_id })));

      // Saves the document, its signature requests and document requests together
      // (all or nothing)
      const { error } = await supabase.rpc("submit_document", {
        p_id: submissionId,
        p_template_id: template.id,
        p_template_version: version.version,
        p_job_number: jobNumber,
        p_answers: finalAnswers,
        p_signatures: signatureRequests,
        p_requests: documentRequests,
      });
      if (error) throw new Error(`Couldn't save: ${error.message}`);

      // The database gave it a number and time; fetch them to show. Saved
      // already, so a failed lookup must NOT throw (that would delete its files).
      const { data: saved } = await supabase
        .from("document_submissions")
        .select("document_number, submitted_at")
        .eq("id", submissionId)
        .maybeSingle();

      setSubmitted({
        id: submissionId,
        awaiting: signatureRequests.filter((r) => !r.signature_path).length,
        requested: documentRequests.length,
        number: saved?.document_number ?? null,
        submittedAt: saved?.submitted_at ?? null,
      });
    } catch (err) {
      // Don't leave orphaned files behind if saving failed
      if (uploaded.length) await supabase.storage.from(PHOTO_BUCKET).remove(uploaded);
      const message = err instanceof Error ? err.message : "Something went wrong";
      console.error(message);
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        <h2 className="mt-4 text-xl font-semibold">Submitted</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your {template.name} has been saved.</p>
        {(submitted.number !== null || submitted.submittedAt) && (
          <p className="mt-2 text-sm">
            {submitted.number !== null && (
              <span className="font-semibold tabular-nums">
                Document {formatDocumentNumber(submitted.number)}
              </span>
            )}
            {submitted.number !== null && submitted.submittedAt && (
              <span className="text-muted-foreground"> · </span>
            )}
            {submitted.submittedAt && (
              <span className="text-muted-foreground">
                submitted <LocalDate iso={submitted.submittedAt} withTime />
              </span>
            )}
          </p>
        )}
        {submitted.awaiting > 0 && (
          <p className="mt-3 rounded-full bg-amber-500/15 px-3 py-1 text-sm font-medium text-amber-800 dark:text-amber-300">
            {submitted.awaiting} {submitted.awaiting === 1 ? "person has" : "people have"} been asked to sign
          </p>
        )}
        {submitted.requested > 0 && (
          <p className="mt-2 rounded-full bg-sky-500/15 px-3 py-1 text-sm font-medium text-sky-800 dark:text-sky-300">
            {submitted.requested} document {submitted.requested === 1 ? "request" : "requests"} sent
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-full border border-white/70 bg-white/60 px-4 py-2 text-sm font-medium transition hover:bg-white/90 dark:border-white/15 dark:bg-white/10"
          >
            Back to dashboard
          </Link>
          <Link
            href={`/dashboard/documents/${submitted.id}`}
            className="rounded-full border border-white/70 bg-white/60 px-4 py-2 text-sm font-medium transition hover:bg-white/90 dark:border-white/15 dark:bg-white/10"
          >
            View document
          </Link>
          <Link
            href="/dashboard/documents/new"
            className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
          >
            New document
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {visibleFields.map((field) => (
        <FieldRow key={field.id} field={field} error={errors[field.id]}>
          <FieldInput
            field={field}
            value={answers[field.id]}
            onChange={(v) =>
              field.type === "completed_by"
                ? setCompletedBy(field.id, String(v ?? ""))
                : setAnswer(field.id, v)
            }
            invalid={!!errors[field.id]}
            projects={projects}
            people={people}
            currentUserId={currentUserId}
            crewIds={crewIds}
            firstSignerLabel={fields.find((f) => f.type === "completed_by")?.label}
            photos={photos[field.id] ?? []}
            onPhotosChange={(p) => {
              setPhotos((prev) => ({ ...prev, [field.id]: p }));
              clearError(field.id);
            }}
            onSignatureChange={(png) => {
              setSignature((prev) => ({ ...prev, [field.id]: png }));
              clearError(field.id);
            }}
            signatureRows={signatureRows[field.id] ?? []}
            onSignatureRowsChange={(rows) => {
              setSignatureRows((prev) => ({ ...prev, [field.id]: rows }));
              clearError(field.id);
            }}
          />
        </FieldRow>
      ))}

      {submitError && (
        <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 flex h-11 items-center justify-center gap-2 rounded-full bg-sky-600 font-medium text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 active:scale-[0.99] disabled:opacity-70"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}

function FieldRow({
  field,
  error,
  children,
}: {
  field: TemplateField;
  error?: string;
  children: React.ReactNode;
}) {
  const errorText = error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>;

  // A heading that starts a group of fields
  if (field.type === "section") {
    return (
      <div className="-mb-1 mt-3 border-b border-foreground/10 pb-2">
        <h2 className="text-base font-semibold tracking-tight">{field.label}</h2>
      </div>
    );
  }

  // Checklist item: question on the left, Yes / No / N/A on the right
  if (field.type === "yes_no_na") {
    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span id={`${field.id}-label`} className="text-sm font-medium">
            {field.label}
            {field.required && <span className="ml-0.5 text-red-500">*</span>}
          </span>
          {children}
        </div>
        {errorText}
      </div>
    );
  }

  // Checkboxes carry their own label
  if (field.type === "checkbox") {
    return (
      <div>
        {children}
        {errorText}
      </div>
    );
  }
  return (
    <div className="animate-in fade-in duration-200">
      <label htmlFor={field.id} className="mb-1.5 block text-sm font-medium">
        {field.label}
        {field.required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {errorText}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  invalid,
  projects,
  people,
  currentUserId,
  crewIds,
  firstSignerLabel,
  photos,
  onPhotosChange,
  onSignatureChange,
  signatureRows,
  onSignatureRowsChange,
}: {
  field: TemplateField;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
  invalid: boolean;
  projects: Project[];
  people: Person[];
  currentUserId: string;
  crewIds: string[];
  firstSignerLabel?: string;
  photos: PhotoItem[];
  onPhotosChange: (p: PhotoItem[]) => void;
  onSignatureChange: (png: Blob | null) => void;
  signatureRows: SignatureRow[];
  onSignatureRowsChange: (rows: SignatureRow[]) => void;
}) {
  const cls = cn(inputClass, invalid && "border-red-400 dark:border-red-400");
  const text = typeof value === "string" || typeof value === "number" ? String(value) : "";

  switch (field.type) {
    case "job":
      return (
        <JobPicker id={field.id} projects={projects} value={text} onChange={onChange} invalid={invalid} />
      );

    case "completed_by": {
      // Starts as the signed-in user; can be changed to anyone
      const chosen = people.find((p) => p.user_id === text);
      return (
        <div className="flex items-center gap-3">
          <Avatar color={chosen?.color ?? "#d1d5db"} className="h-9 w-9" />
          <SearchSelect
            id={field.id}
            value={text}
            onChange={onChange}
            invalid={invalid}
            className="min-w-0 flex-1"
            placeholder="Choose a person…"
            searchPlaceholder="Search people"
            options={people.map((p) => personOption(p, currentUserId))}
          />
        </div>
      );
    }

    case "person": {
      // Anyone; starts empty
      const chosen = people.find((p) => p.user_id === text);
      return (
        <div className="flex items-center gap-3">
          <Avatar color={chosen?.color ?? "#d1d5db"} className="h-9 w-9" />
          <SearchSelect
            id={field.id}
            value={text}
            onChange={onChange}
            invalid={invalid}
            className="min-w-0 flex-1"
            placeholder="Choose a person…"
            searchPlaceholder="Search people"
            options={people.map((p) => personOption(p, currentUserId))}
          />
        </div>
      );
    }

    case "datetime":
      return (
        <input
          id={field.id}
          type="datetime-local"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        />
      );

    case "yes_no_na":
      return (
        <div
          role="radiogroup"
          aria-labelledby={`${field.id}-label`}
          // Standard radio keys: one Tab stop per question, arrows move + choose
          onKeyDown={(e) => {
            const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
            if (!step) return;
            e.preventDefault();
            const current = YES_NO_NA.findIndex((o) => o.value === text);
            const next = (current + step + YES_NO_NA.length) % YES_NO_NA.length;
            onChange(YES_NO_NA[next].value);
            e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
          }}
          className={cn(
            "inline-flex shrink-0 overflow-hidden rounded-xl border border-white/70 bg-white/60 p-0.5 dark:border-white/15 dark:bg-white/10",
            invalid && "border-red-400 dark:border-red-400",
          )}
        >
          {YES_NO_NA.map((option, i) => {
            const selected = text === option.value;
            return (
              <button
                key={option.value}
                id={i === 0 ? field.id : undefined}
                type="button"
                role="radio"
                aria-checked={selected}
                // Only the chosen option (or the first, if none) is a Tab stop
                tabIndex={selected || (!text && i === 0) ? 0 : -1}
                onClick={() => onChange(option.value)}
                className={cn(
                  "min-w-[3.25rem] rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  !selected && "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                  selected && option.value === "yes" && "bg-emerald-600 text-white",
                  selected && option.value === "no" && "bg-red-600 text-white",
                  selected && option.value === "na" && "bg-slate-600 text-white dark:bg-slate-500",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      );

    case "section":
      return null; // drawn by FieldRow

    case "select":
      return (
        <SearchSelect
          id={field.id}
          value={text}
          onChange={onChange}
          invalid={invalid}
          options={(field.options ?? []).map((o) => ({ value: o, label: o }))}
        />
      );

    case "textarea":
      return (
        <textarea
          id={field.id}
          rows={4}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className={cn(cls, "resize-y")}
        />
      );

    case "checkbox":
      return (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/70 bg-white/60 p-3 text-sm font-medium dark:border-white/15 dark:bg-white/10">
          <input
            id={field.id}
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 shrink-0 accent-sky-600"
          />
          <span>
            {field.label}
            {field.required && <span className="ml-0.5 text-red-500">*</span>}
            {field.requestDocument && (
              <span className="block text-xs font-normal text-muted-foreground">
                Everyone on the signature list will be asked to complete one
              </span>
            )}
          </span>
        </label>
      );

    case "photos":
      return <PhotoUpload id={field.id} photos={photos} onChange={onPhotosChange} />;

    case "signature":
      return <SignaturePad id={field.id} onChange={onSignatureChange} invalid={invalid} />;

    case "signatures":
      return (
        <SignatureTable
          rows={signatureRows}
          onChange={onSignatureRowsChange}
          people={people}
          currentUserId={currentUserId}
          quickAddGroups={[{ label: "My crew", userIds: crewIds }]}
          firstSignerLabel={firstSignerLabel}
          invalid={invalid}
        />
      );

    case "number":
    case "date":
    case "text":
      return (
        <input
          id={field.id}
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          value={text}
          onChange={(e) =>
            onChange(
              field.type === "number"
                ? e.target.value === ""
                  ? null
                  : Number(e.target.value)
                : e.target.value,
            )
          }
          className={cls}
        />
      );

    default:
      // A type this form doesn't know about: show it instead of guessing
      return (
        <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          Unknown field type &quot;{String(field.type)}&quot; for &quot;{field.label}&quot;. Check this
          template&apos;s fields in Supabase.
        </p>
      );
  }
}

"use client";

import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { createClient } from "@/lib/supabase/client";
import {
  isFieldVisible,
  PHOTO_BUCKET,
  type Answers,
  type AnswerValue,
  type DocumentTemplate,
  type DocumentTemplateVersion,
  type SignatureEntry,
  type TemplateField,
} from "@/lib/documents";
import { personName, type Person } from "@/lib/person";
import type { Project } from "@/lib/projects";
import { cn } from "@/lib/utils";
import { JobPicker } from "./job-picker";
import { PhotoUpload, type PhotoItem } from "./photo-upload";
import { SignaturePad } from "./signature-pad";
import { newSignatureRow, SignatureTable, type SignatureRow } from "./signature-table";
import { inputClass } from "./styles";

// Field types whose values live in their own state (files / drawings),
// not in `answers`, until the form is submitted.
const FILE_TYPES = new Set(["photos", "signature", "signatures"]);

// Fills in any document template. Each field in the template's list is drawn
// according to its type.
export function DocumentForm({
  template,
  version,
  projects,
  currentJob,
  people,
  currentUserId,
}: {
  template: DocumentTemplate;
  version: DocumentTemplateVersion;
  projects: Project[];
  currentJob: string | null;
  people: Person[];
  currentUserId: string;
}) {
  const fields = version.fields;

  // Starting values: job = current job, completed by = current user
  const [answers, setAnswers] = useState<Answers>(() =>
    Object.fromEntries(
      fields
        .filter((f) => !FILE_TYPES.has(f.type))
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
  const [photos, setPhotos] = useState<Record<string, PhotoItem[]>>({});
  const [signature, setSignature] = useState<Record<string, Blob | null>>({});
  // Signature tables always start with the current user
  const [signatureRows, setSignatureRows] = useState<Record<string, SignatureRow[]>>(() =>
    Object.fromEntries(
      fields.filter((f) => f.type === "signatures").map((f) => [f.id, [newSignatureRow(currentUserId)]]),
    ),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

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
        if (rows.some((r) => !r.userId)) found[f.id] = "Choose a person for every row, or remove the empty row";
        else if (f.required && rows.some((r) => !r.png)) found[f.id] = "Everyone listed needs to sign";
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
            const entries: SignatureEntry[] = [];
            for (const [i, row] of (signatureRows[f.id] ?? []).entries()) {
              entries.push({
                user_id: row.userId,
                signature: row.png
                  ? await upload(`${f.id}-${i + 1}-${row.userId}.png`, row.png, "image/png")
                  : null,
              });
            }
            finalAnswers[f.id] = entries;
            break;
          }
          default: {
            const v = answers[f.id];
            finalAnswers[f.id] = typeof v === "string" ? v.trim() : v;
          }
        }
      }

      const { error } = await supabase.from("document_submissions").insert({
        id: submissionId,
        template_id: template.id,
        template_version: version.version,
        job_number: jobNumber,
        answers: finalAnswers,
      });
      if (error) throw new Error(`Couldn't save: ${error.message}`);

      setSubmitted(true);
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
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-full border border-white/70 bg-white/60 px-4 py-2 text-sm font-medium transition hover:bg-white/90 dark:border-white/15 dark:bg-white/10"
          >
            Back to dashboard
          </Link>
          <Link
            href="/dashboard/documents"
            className="rounded-full border border-white/70 bg-white/60 px-4 py-2 text-sm font-medium transition hover:bg-white/90 dark:border-white/15 dark:bg-white/10"
          >
            View documents
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
          <div className="relative min-w-0 flex-1">
            <select
              id={field.id}
              value={text}
              onChange={(e) => onChange(e.target.value)}
              className={cn(cls, "appearance-none pr-10", !text && "text-muted-foreground")}
            >
              <option value="" disabled>
                Choose a person…
              </option>
              {people.map((p) => (
                <option key={p.user_id} value={p.user_id} className="text-foreground">
                  {personName(p)}
                  {p.position ? ` — ${p.position}` : ""}
                  {p.user_id === currentUserId ? " (You)" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      );
    }

    case "select":
      return (
        <div className="relative">
          <select
            id={field.id}
            value={text}
            onChange={(e) => onChange(e.target.value)}
            className={cn(cls, "appearance-none pr-10", !text && "text-muted-foreground")}
          >
            <option value="" disabled>
              Choose…
            </option>
            {(field.options ?? []).map((o) => (
              <option key={o} value={o} className="text-foreground">
                {o}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
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
            className="h-4 w-4 accent-sky-600"
          />
          {field.label}
          {field.required && <span className="-ml-2 text-red-500">*</span>}
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

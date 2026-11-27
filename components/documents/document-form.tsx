"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AnswerValue, Answers, DocumentTemplate, DocumentTemplateVersion } from "@/lib/documents";
import {
  initialAnswers,
  toLocalInputValue,
  validateForm,
  fullWidthFieldIds,
  visibleFields as getVisibleFields,
  withDatetimeDefaults,
} from "@/lib/forms";
import type { Person } from "@/lib/person";
import type { Project } from "@/lib/projects";
import { cn } from "@/lib/utils";
import { submitDocument, type SubmitResult } from "@/lib/submit-document";
import { FieldInput, type FieldContext } from "./form/field-input";
import { FieldRow } from "./form/field-row";
import { SubmittedScreen } from "./form/submitted-screen";
import type { PhotoItem } from "./photo-upload";
import { personOption } from "./search-select";
import { newSignatureRow, type SignatureRow } from "./signature-table";
import { errorBoxClass } from "./styles";

// Fills in any document template. Each field in the template's list is drawn
// according to its type (form/field-input.tsx). The rules (starting values,
// validation, what gets saved) are in lib/forms.ts; saving is lib/submit-document.ts.
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

  const [answers, setAnswers] = useState<Answers>(() =>
    initialAnswers(fields, { currentJob, currentUserId }),
  );
  // Date/time fields start at "now": set after loading, so server and browser match
  useEffect(() => {
    setAnswers((prev) => withDatetimeDefaults(fields, prev, toLocalInputValue()));
  }, [fields]);
  const [photos, setPhotos] = useState<Record<string, PhotoItem[]>>({});
  const [signature, setSignature] = useState<Record<string, Blob | null>>({});
  // Signature tables always start with the current user (fixed key: same on server and browser)
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
  const [submitted, setSubmitted] = useState<SubmitResult | null>(null);

  // Same for every field; built once instead of per field per keystroke
  const ctx = useMemo<FieldContext>(
    () => ({
      projects,
      people,
      personOptions: people.map((p) => personOption(p, currentUserId)),
      currentUserId,
      crewIds,
      firstSignerLabel: fields.find((f) => f.type === "completed_by")?.label,
    }),
    [projects, people, currentUserId, crewIds, fields],
  );

  const clearError = (id: string) =>
    setErrors((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
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

  const visibleFields = getVisibleFields(fields, answers);
  const fullWidth = fullWidthFieldIds(visibleFields);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);
    const found = validateForm(visibleFields, { answers, photos, signature, signatureRows });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      setSubmitted(
        await submitDocument({
          template,
          version,
          fields: visibleFields,
          answers,
          photos: Object.fromEntries(
            Object.entries(photos).map(([id, items]) => [id, items.map((p) => p.file)]),
          ),
          signature,
          signatureRows,
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      console.error(message);
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) return <SubmittedScreen templateName={template.name} result={submitted} />;

  return (
    // Two columns on wide screens: short fields side by side, long ones full width
    <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-x-6">
      {visibleFields.map((field) => (
        <div key={field.id} className={cn("min-w-0", fullWidth.has(field.id) && "lg:col-span-2")}>
          <FieldRow field={field} error={errors[field.id]}>
            <FieldInput
              field={field}
              value={answers[field.id]}
              onChange={(v) =>
                field.type === "completed_by"
                  ? setCompletedBy(field.id, String(v ?? ""))
                  : setAnswer(field.id, v)
              }
              invalid={!!errors[field.id]}
              ctx={ctx}
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
        </div>
      ))}

      {submitError && <p className={cn(errorBoxClass, "lg:col-span-2")}>{submitError}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 flex h-11 items-center justify-center gap-2 rounded-lg bg-sky-600 lg:col-span-2 font-medium text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700 active:scale-[0.99] disabled:opacity-70"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}

// The rules for filling in and showing a document, as pure functions (no React,
// no database), so they can be unit tested (forms.test.ts).
// Used by components/documents/document-form.tsx and the document view page.

import {
  isFieldVisible,
  type AnswerValue,
  type Answers,
  type FieldType,
  type TemplateField,
} from "@/lib/documents";

// Field types whose values live in their own state (files / drawings),
// not in `answers`, until the form is submitted.
export const FILE_TYPES = new Set<FieldType>(["photos", "signature", "signatures"]);
// Field types that are just layout and never have an answer
export const LAYOUT_TYPES = new Set<FieldType>(["section"]);

// A moment in the format a datetime-local input uses (local time, to the minute)
export function toLocalInputValue(date: Date = new Date()) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// Starting answers: job = current job, completed by = current user,
// checkboxes unticked, everything else empty.
export function initialAnswers(
  fields: TemplateField[],
  { currentJob, currentUserId }: { currentJob: string | null; currentUserId: string },
): Answers {
  return Object.fromEntries(
    fields
      .filter((f) => !FILE_TYPES.has(f.type) && !LAYOUT_TYPES.has(f.type))
      .map((f): [string, AnswerValue] => {
        switch (f.type) {
          case "job":
            return [f.id, currentJob ?? ""];
          case "completed_by":
            return [f.id, currentUserId];
          case "checkbox":
            return [f.id, false];
          default:
            return [f.id, ""];
        }
      }),
  );
}

// Fills empty date/time fields with `now` (done after the page loads, so the
// server and browser agree on the first render).
export function withDatetimeDefaults(fields: TemplateField[], answers: Answers, now: string): Answers {
  const next = { ...answers };
  for (const f of fields) if (f.type === "datetime" && !next[f.id]) next[f.id] = now;
  return next;
}

export const visibleFields = (fields: TemplateField[], answers: Answers) =>
  fields.filter((f) => isFieldVisible(f, answers));

// Everything the form holds while being filled in
export type FormState = {
  answers: Answers;
  photos: Record<string, unknown[]>; // per photos field
  signature: Record<string, unknown>; // per signature field: the drawing, if any
  signatureRows: Record<string, { userId: string }[]>; // per signatures field
};

// Error message per field id; empty when the form can be submitted.
// Only checks the fields that are showing.
export function validateForm(fields: TemplateField[], state: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    if (f.type === "signatures") {
      // Anyone who hasn't signed yet is sent a request to sign later
      if ((state.signatureRows[f.id] ?? []).some((r) => !r.userId)) {
        errors[f.id] = "Choose a person for every row, or remove the empty row";
      }
      continue;
    }
    if (f.type === "completed_by") {
      if (!state.answers[f.id]) errors[f.id] = "Choose who completed this";
      continue;
    }
    if (!f.required) continue;
    const v = state.answers[f.id];
    const empty =
      f.type === "photos"
        ? (state.photos[f.id] ?? []).length === 0
        : f.type === "signature"
          ? !state.signature[f.id]
          : f.type === "checkbox"
            ? v !== true
            : v === null || v === undefined || String(v).trim() === "";
    if (empty) errors[f.id] = `${f.label} is required`;
  }
  return errors;
}

// The value saved for a field that isn't a file. (Files are uploaded first and
// saved as their storage paths; see lib/submit-document.ts.)
export function finalAnswer(
  field: TemplateField,
  value: AnswerValue | undefined,
  userId: string,
): AnswerValue {
  switch (field.type) {
    case "completed_by":
      return (value as string) || userId;
    case "datetime":
      // Typed in local time; saved as an exact moment so it reads right anywhere
      return typeof value === "string" && value ? new Date(value).toISOString() : null;
    default:
      return typeof value === "string" ? value.trim() : (value ?? null);
  }
}

// Ticked "request a document" checkboxes ask everyone on the signature list
// to complete that document.
export function buildDocumentRequests(
  fields: TemplateField[],
  answers: Answers,
  signerIds: string[],
): { template_id: string; user_id: string }[] {
  const people = [...new Set(signerIds.filter(Boolean))];
  return fields
    .filter((f) => f.type === "checkbox" && f.requestDocument && answers[f.id] === true)
    .flatMap((f) => people.map((user_id) => ({ template_id: f.requestDocument!.templateId, user_id })));
}

// --- Showing a finished document ---------------------------------------------------

// The fields that were part of a saved document (skips hidden "Specify other"
// etc.), keeping section headings only when something under them is shown.
export function fieldsOnDocument(allFields: TemplateField[], answers: Answers): TemplateField[] {
  const isShown = (f: TemplateField) => f.type === "job" || f.id in answers;
  return allFields.filter((f, i) => {
    if (f.type !== "section") return isShown(f);
    const next = allFields.slice(i + 1);
    const end = next.findIndex((x) => x.type === "section");
    return (end === -1 ? next : next.slice(0, end)).some(isShown);
  });
}

export type FieldGroup = { heading: TemplateField | null; items: TemplateField[] };

// Splits fields into groups: those before the first section, then one per section.
export function groupBySection(fields: TemplateField[]): FieldGroup[] {
  const groups: FieldGroup[] = [];
  for (const f of fields) {
    if (f.type === "section") groups.push({ heading: f, items: [] });
    else if (groups.length === 0) groups.push({ heading: null, items: [f] });
    else groups[groups.length - 1].items.push(f);
  }
  return groups;
}

export const isStringList = (v: AnswerValue | undefined): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

// --- Two-column layout on wide screens ------------------------------------------------

// Field types that always take the full width (long text, drawings, tables, headings)
const FULL_WIDTH_TYPES = new Set<FieldType>([
  "section",
  "textarea",
  "photos",
  "signature",
  "signatures",
  "yes_no_na",
  "checkbox",
  "toolbox_talk",
]);

// Which fields take the full row on a two-column layout. Short fields sit side
// by side; one left alone on its row (before a full-width field, or at the end)
// is stretched so there's no empty gap.
export function fullWidthFieldIds(fields: TemplateField[]): Set<string> {
  const full = new Set<string>();
  let column = 0; // 0 = starting a new row, 1 = right half
  fields.forEach((f, i) => {
    if (FULL_WIDTH_TYPES.has(f.type)) {
      full.add(f.id);
      column = 0;
    } else if (column === 0) {
      const next = fields[i + 1];
      if (!next || FULL_WIDTH_TYPES.has(next.type)) full.add(f.id);
      else column = 1;
    } else {
      column = 0;
    }
  });
  return full;
}

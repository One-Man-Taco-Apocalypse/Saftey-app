// Shapes of the JSON stored in the document tables (shared by server and browser).

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "checkbox"
  | "select"
  | "job" // project picker; saved to document_submissions.job_number
  | "photos" // photo upload; saved as a list of storage paths
  | "signature" // drawn signature; saved as one storage path (PNG)
  | "completed_by" // the signed-in user; saved as their uid
  | "signatures" // table of people + their signatures; saved in document_signatures
  | "person" // pick anyone (starts empty); saved as their uid
  | "datetime" // date + time, starts at "now"; saved as an ISO timestamp (UTC)
  | "yes_no_na" // Yes / No / N/A buttons; saved as "yes" | "no" | "na"
  | "section" // a heading that groups the fields after it; saves nothing
  | "toolbox_talk"; // pick a talk from the toolbox talk library; saved as its id

// Answers for "yes_no_na" fields
export const YES_NO_NA = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "na", label: "N/A" },
] as const;

export type TemplateField = {
  id: string; // key used in answers, e.g. "hazards"
  type: FieldType;
  label: string; // shown to the worker, e.g. "Hazards discussed"
  required?: boolean;
  options?: string[]; // for "select"
  // Only show (and require) this field when another field has this value
  showIf?: { field: string; equals: string };
  // Checkbox only: when ticked, everyone on this form's signature list is asked
  // to complete this other document (saved in document_requests)
  requestDocument?: { templateId: string };
};

// One person asked to complete one type of document. Open until fulfilled_at.
export type DocumentRequest = {
  id: string;
  template_id: string;
  requested_user_id: string | null;
  requested_by: string | null;
  source_submission_id: string;
  fulfilled_submission_id: string | null;
  fulfilled_at: string | null;
  created_at: string;
};

export type DocumentTemplate = {
  id: string;
  name: string;
  description: string | null;
  archived: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentTemplateVersion = {
  template_id: string;
  version: number;
  fields: TemplateField[];
  created_by: string | null;
  created_at: string;
};

// Answers keyed by field id.
// SignatureEntry is the OLD way signatures were saved (inside answers). New
// documents keep them in the document_signatures table (DocumentSignature);
// for those, answers[field.id] is null.
export type SignatureEntry = { user_id: string; signature: string | null };

// One person asked to sign one "signatures" field on a document.
// Not signed yet while signature_path / signed_at are null.
export type DocumentSignature = {
  id: string;
  submission_id: string;
  field_id: string;
  sort_order: number;
  user_id: string | null;
  requested_by: string | null;
  signature_path: string | null;
  signed_at: string | null;
  created_at: string;
};

export type AnswerValue =
  | string
  | number
  | boolean
  | string[]
  | SignatureEntry[]
  | null;
export type Answers = Record<string, AnswerValue>;

export function isFieldVisible(field: TemplateField, answers: Answers) {
  return !field.showIf || answers[field.showIf.field] === field.showIf.equals;
}

// Storage bucket for photos attached to documents
export const PHOTO_BUCKET = "document-photos";

export type DocumentSubmission = {
  id: string;
  document_number: number; // internal number, from 0, set by the database
  template_id: string;
  template_version: number;
  job_number: string | null;
  submitted_by: string | null;
  submitted_at: string;
  updated_at: string;
  answers: Answers;
};

// How a document number is shown, e.g. "#12"
export function formatDocumentNumber(n: number | null | undefined) {
  return n === null || n === undefined ? "" : `#${n}`;
}

// A document's display title: its "title" answer if it has one, else the
// fallback (usually the template's name).
export function documentTitle(answers: Answers | null | undefined, fallback = "Document") {
  const title = answers?.title;
  return typeof title === "string" && title.trim() ? title : fallback;
}

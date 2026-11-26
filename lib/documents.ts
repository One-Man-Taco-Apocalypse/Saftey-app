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
  | "signatures"; // table of people + their signatures; saved as SignatureEntry[]

export type TemplateField = {
  id: string; // key used in answers, e.g. "hazards"
  type: FieldType;
  label: string; // shown to the worker, e.g. "Hazards discussed"
  required?: boolean;
  options?: string[]; // for "select"
  // Only show (and require) this field when another field has this value
  showIf?: { field: string; equals: string };
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

// Answers keyed by field id
export type SignatureEntry = { user_id: string; signature: string | null };

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
  template_id: string;
  template_version: number;
  job_number: string | null;
  submitted_by: string | null;
  submitted_at: string;
  updated_at: string;
  answers: Answers;
};

// Saves a filled-in document from the browser: uploads its files, then saves
// the document, its signature requests and document requests in one go
// (the submit_document database function: all or nothing).
// If anything fails, files uploaded so far are removed again.

import {
  PHOTO_BUCKET,
  type Answers,
  type DocumentTemplate,
  type DocumentTemplateVersion,
  type TemplateField,
} from "@/lib/documents";
import { buildDocumentRequests, finalAnswer } from "@/lib/forms";
import { createClient } from "@/lib/supabase/client";

export type SignatureRowInput = { userId: string; png: Blob | null };

export type SubmitInput = {
  template: DocumentTemplate;
  version: DocumentTemplateVersion;
  fields: TemplateField[]; // the visible fields
  answers: Answers;
  photos: Record<string, File[]>;
  signature: Record<string, Blob | null>;
  signatureRows: Record<string, SignatureRowInput[]>;
};

export type SubmitResult = {
  id: string;
  awaiting: number; // people still to sign
  requested: number; // people asked to complete another document
  number: number | null;
  submittedAt: string | null;
};

const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

// Throws an Error with a message fit to show the user.
export async function submitDocument(input: SubmitInput): Promise<SubmitResult> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("You're not signed in.");

  const bucket = supabase.storage.from(PHOTO_BUCKET);
  const submissionId = crypto.randomUUID();
  const uploaded: string[] = [];

  // Upload one file to <uid>/<submission id>/<name> and remember it for cleanup
  async function upload(name: string, file: Blob, contentType: string) {
    const path = `${userId}/${submissionId}/${name}`;
    const { error } = await bucket.upload(path, file, { contentType });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    uploaded.push(path);
    return path;
  }

  try {
    const answers: Answers = {};
    const signatures: {
      field_id: string;
      sort_order: number;
      user_id: string;
      signature_path: string | null;
    }[] = [];
    let jobNumber: string | null = null;

    for (const f of input.fields) {
      switch (f.type) {
        case "job":
          jobNumber = (input.answers[f.id] as string) || null;
          break;
        case "section":
          break; // headings save nothing
        case "photos": {
          const paths: string[] = [];
          for (const [i, file] of (input.photos[f.id] ?? []).entries()) {
            paths.push(await upload(`${i + 1}-${safeFileName(file.name)}`, file, file.type));
          }
          answers[f.id] = paths;
          break;
        }
        case "signature": {
          const png = input.signature[f.id];
          answers[f.id] = png ? await upload(`signature-${f.id}.png`, png, "image/png") : null;
          break;
        }
        case "signatures": {
          // Saved in document_signatures (one row per person), not in answers.
          // Rows without a drawing become requests the person signs later.
          for (const [i, row] of (input.signatureRows[f.id] ?? []).entries()) {
            signatures.push({
              field_id: f.id,
              sort_order: i,
              user_id: row.userId,
              signature_path: row.png
                ? await upload(`${f.id}-${i + 1}-${row.userId}.png`, row.png, "image/png")
                : null,
            });
          }
          answers[f.id] = null; // marks the field as part of this document
          break;
        }
        default:
          answers[f.id] = finalAnswer(f, input.answers[f.id], userId);
      }
    }

    const requests = buildDocumentRequests(
      input.fields,
      input.answers,
      signatures.map((s) => s.user_id),
    );

    const { error } = await supabase.rpc("submit_document", {
      p_id: submissionId,
      p_template_id: input.template.id,
      p_template_version: input.version.version,
      p_job_number: jobNumber,
      p_answers: answers,
      p_signatures: signatures,
      p_requests: requests,
    });
    if (error) throw new Error(`Couldn't save: ${error.message}`);

    // The database gave it a number and time; fetch them to show. Saved
    // already, so a failed lookup must NOT throw (that would delete its files).
    const { data: saved } = await supabase
      .from("document_submissions")
      .select("document_number, submitted_at")
      .eq("id", submissionId)
      .maybeSingle();

    return {
      id: submissionId,
      awaiting: signatures.filter((s) => !s.signature_path).length,
      requested: requests.length,
      number: saved?.document_number ?? null,
      submittedAt: saved?.submitted_at ?? null,
    };
  } catch (err) {
    // Don't leave orphaned files behind if saving failed
    if (uploaded.length) await bucket.remove(uploaded);
    throw err instanceof Error ? err : new Error("Something went wrong");
  }
}

// Smoke test: the form and the read-only view can draw every field type.
// Renders to HTML on the server (no browser), so it catches crashes, unknown
// field types and server/browser differences in the first render.
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DocumentForm } from "@/components/documents/document-form";
import { AnswerView, type AnswerContext } from "@/components/documents/view/answer-view";
import type { Answers, FieldType, TemplateField } from "@/lib/documents";
import type { Person } from "@/lib/person";

const ALL_TYPES: FieldType[] = [
  "text",
  "textarea",
  "number",
  "date",
  "checkbox",
  "select",
  "job",
  "photos",
  "signature",
  "completed_by",
  "signatures",
  "person",
  "datetime",
  "yes_no_na",
  "section",
];

const fields: TemplateField[] = ALL_TYPES.map((type) => ({
  id: `f_${type}`,
  type,
  label: `Label ${type}`,
  ...(type === "select" ? { options: ["One", "Two"] } : {}),
}));

const me: Person = {
  user_id: "11111111-1111-1111-1111-111111111111",
  first_name: "Pat",
  last_name: "Lee",
  color: "#0075ba",
  email: null,
  position: "Foreman",
};

describe("DocumentForm", () => {
  it("draws every field type", () => {
    const html = renderToString(
      <DocumentForm
        template={{
          id: "t",
          name: "Test form",
          description: null,
          archived: false,
          created_by: null,
          created_at: "",
          updated_at: "",
        }}
        version={{ template_id: "t", version: 1, fields, created_by: null, created_at: "" }}
        projects={[{ job_number: "J-1", job_name: "Tower" }]}
        currentJob="J-1"
        people={[me]}
        currentUserId={me.user_id}
        crewIds={[]}
      />,
    );
    expect(html).not.toContain("Unknown field type");
    for (const f of fields) expect(html).toContain(f.label);
    expect(html).toContain("Submit");
  });
});

describe("AnswerView", () => {
  const answers: Answers = {
    f_text: "hello",
    f_textarea: "line",
    f_number: 3,
    f_date: "2026-11-26",
    f_checkbox: true,
    f_select: "One",
    f_photos: ["a/b/1.png"],
    f_signature: "a/b/sig.png",
    f_completed_by: me.user_id,
    f_signatures: null,
    f_person: me.user_id,
    f_datetime: "2026-11-26T14:00:00.000Z",
    f_yes_no_na: "na",
  };
  const ctx: AnswerContext = {
    submissionId: "s",
    currentUserId: me.user_id,
    jobLabel: { name: "Tower", number: "J-1" },
    fileUrls: { "a/b/1.png": "https://example.test/1.png" },
    personById: new Map([[me.user_id, me]]),
    signaturesFor: () => [],
    documentRequests: [],
  };

  it("draws every field type's answer", () => {
    const html = renderToString(
      <div>
        {fields.map((f) => (
          <AnswerView key={f.id} field={f} value={answers[f.id]} ctx={ctx} />
        ))}
      </div>,
    );
    expect(html).toContain("hello");
    expect(html).toContain("Tower");
    expect(html).toContain("Pat Lee");
    expect(html).toContain("N/A");
    expect(html).toContain("https://example.test/1.png");
  });
});

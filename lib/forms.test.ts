import { describe, expect, it } from "vitest";
import type { TemplateField } from "@/lib/documents";
import {
  buildDocumentRequests,
  fieldsOnDocument,
  finalAnswer,
  groupBySection,
  initialAnswers,
  toLocalInputValue,
  validateForm,
  visibleFields,
  withDatetimeDefaults,
  type FormState,
} from "@/lib/forms";

const f = (id: string, type: TemplateField["type"], extra: Partial<TemplateField> = {}): TemplateField => ({
  id,
  type,
  label: id,
  ...extra,
});

const emptyState = (answers = {}): FormState => ({ answers, photos: {}, signature: {}, signatureRows: {} });

describe("initialAnswers", () => {
  it("starts job, completed by and checkboxes with defaults, and skips files and sections", () => {
    const fields = [
      f("job", "job"),
      f("by", "completed_by"),
      f("ok", "checkbox"),
      f("notes", "textarea"),
      f("pics", "photos"),
      f("sign", "signatures"),
      f("head", "section"),
    ];
    expect(initialAnswers(fields, { currentJob: "J-1", currentUserId: "me" })).toEqual({
      job: "J-1",
      by: "me",
      ok: false,
      notes: "",
    });
  });

  it("uses an empty job when the user has no current project", () => {
    expect(initialAnswers([f("job", "job")], { currentJob: null, currentUserId: "me" })).toEqual({ job: "" });
  });
});

describe("withDatetimeDefaults", () => {
  it("fills only empty datetime fields", () => {
    const fields = [f("a", "datetime"), f("b", "datetime"), f("c", "text")];
    const out = withDatetimeDefaults(fields, { a: "", b: "2026-01-01T08:00", c: "" }, "NOW");
    expect(out).toEqual({ a: "NOW", b: "2026-01-01T08:00", c: "" });
  });
});

describe("toLocalInputValue", () => {
  it("formats to the minute in local time", () => {
    const d = new Date(2026, 10, 26, 9, 5, 42);
    expect(toLocalInputValue(d)).toBe("2026-11-26T09:05");
  });
});

describe("visibleFields", () => {
  it("hides showIf fields until the other field has the value", () => {
    const fields = [f("division", "select"), f("other", "text", { showIf: { field: "division", equals: "Other" } })];
    expect(visibleFields(fields, { division: "Painter" }).map((x) => x.id)).toEqual(["division"]);
    expect(visibleFields(fields, { division: "Other" }).map((x) => x.id)).toEqual(["division", "other"]);
  });
});

describe("validateForm", () => {
  it("requires required fields by type", () => {
    const fields = [
      f("t", "text", { required: true }),
      f("c", "checkbox", { required: true }),
      f("p", "photos", { required: true }),
      f("s", "signature", { required: true }),
      f("n", "number", { required: true }),
      f("optional", "text"),
    ];
    const errors = validateForm(fields, emptyState({ t: "   ", c: false, n: 0, optional: "" }));
    expect(Object.keys(errors).sort()).toEqual(["c", "p", "s", "t"]); // 0 is a real number
    expect(errors.t).toBe("t is required");
  });

  it("passes when everything required is filled in", () => {
    const fields = [f("t", "text", { required: true }), f("p", "photos", { required: true })];
    const state: FormState = { ...emptyState({ t: "hi" }), photos: { p: [{}] } };
    expect(validateForm(fields, state)).toEqual({});
  });

  it("always requires completed by, even when not marked required", () => {
    expect(validateForm([f("by", "completed_by")], emptyState({ by: "" }))).toHaveProperty("by");
  });

  it("rejects signature rows with nobody chosen", () => {
    const state: FormState = { ...emptyState(), signatureRows: { s: [{ userId: "a" }, { userId: "" }] } };
    expect(validateForm([f("s", "signatures")], state)).toHaveProperty("s");
  });
});

describe("finalAnswer", () => {
  it("trims text and falls back to the user for completed by", () => {
    expect(finalAnswer(f("t", "text"), "  hi  ", "me")).toBe("hi");
    expect(finalAnswer(f("by", "completed_by"), "", "me")).toBe("me");
    expect(finalAnswer(f("by", "completed_by"), "other", "me")).toBe("other");
    expect(finalAnswer(f("n", "number"), 3, "me")).toBe(3);
    expect(finalAnswer(f("x", "text"), undefined, "me")).toBeNull();
  });

  it("saves datetimes as an exact UTC moment", () => {
    const local = "2026-11-26T09:05";
    expect(finalAnswer(f("d", "datetime"), local, "me")).toBe(new Date(local).toISOString());
    expect(finalAnswer(f("d", "datetime"), "", "me")).toBeNull();
  });
});

describe("buildDocumentRequests", () => {
  const fields = [
    f("harness", "checkbox", { requestDocument: { templateId: "T-HARNESS" } }),
    f("plain", "checkbox"),
  ];

  it("asks every signer once when the box is ticked", () => {
    expect(buildDocumentRequests(fields, { harness: true, plain: true }, ["a", "b", "a", ""])).toEqual([
      { template_id: "T-HARNESS", user_id: "a" },
      { template_id: "T-HARNESS", user_id: "b" },
    ]);
  });

  it("asks nobody when the box isn't ticked", () => {
    expect(buildDocumentRequests(fields, { harness: false }, ["a"])).toEqual([]);
  });
});

describe("fieldsOnDocument + groupBySection", () => {
  const all = [
    f("job", "job"),
    f("s1", "section"),
    f("a", "text"),
    f("hidden", "text"),
    f("s2", "section"),
    f("only-hidden", "text"),
    f("s3", "section"),
    f("b", "yes_no_na"),
  ];
  const answers = { a: "x", b: "yes" };

  it("keeps answered fields, the job, and sections that still have something", () => {
    expect(fieldsOnDocument(all, answers).map((x) => x.id)).toEqual(["job", "s1", "a", "s3", "b"]);
  });

  it("groups fields under their section heading", () => {
    const groups = groupBySection(fieldsOnDocument(all, answers));
    expect(groups.map((g) => [g.heading?.id ?? null, g.items.map((i) => i.id)])).toEqual([
      [null, ["job"]],
      ["s1", ["a"]],
      ["s3", ["b"]],
    ]);
  });
});

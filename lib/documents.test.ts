import { describe, expect, it } from "vitest";
import { documentTitle, formatDocumentNumber, isFieldVisible } from "@/lib/documents";
import { isAwaitingSignatures, isOutstanding } from "@/lib/signatures";
import type { DocumentSignature } from "@/lib/documents";

describe("formatDocumentNumber", () => {
  it("shows #n, including #0", () => {
    expect(formatDocumentNumber(0)).toBe("#0");
    expect(formatDocumentNumber(12)).toBe("#12");
    expect(formatDocumentNumber(null)).toBe("");
    expect(formatDocumentNumber(undefined)).toBe("");
  });
});

describe("documentTitle", () => {
  it("uses the title answer, else the fallback", () => {
    expect(documentTitle({ title: "Roof deck" }, "PSA")).toBe("Roof deck");
    expect(documentTitle({ title: "   " }, "PSA")).toBe("PSA");
    expect(documentTitle({ title: 5 }, "PSA")).toBe("PSA");
    expect(documentTitle(null)).toBe("Document");
  });
});

describe("isFieldVisible", () => {
  it("shows fields without showIf, and showIf fields only on a match", () => {
    expect(isFieldVisible({ id: "a", type: "text", label: "A" }, {})).toBe(true);
    const field = { id: "b", type: "text" as const, label: "B", showIf: { field: "a", equals: "yes" } };
    expect(isFieldVisible(field, { a: "no" })).toBe(false);
    expect(isFieldVisible(field, { a: "yes" })).toBe(true);
  });
});

describe("signature helpers", () => {
  const row = (over: Partial<DocumentSignature>): DocumentSignature => ({
    id: "1",
    submission_id: "s",
    field_id: "f",
    sort_order: 0,
    user_id: "u",
    requested_by: null,
    signature_path: null,
    signed_at: null,
    created_at: "",
    ...over,
  });

  it("only counts unsigned rows for people who still have an account", () => {
    expect(isOutstanding(row({}))).toBe(true);
    expect(isOutstanding(row({ signed_at: "now" }))).toBe(false);
    expect(isOutstanding(row({ user_id: null }))).toBe(false);
  });

  it("is awaiting signatures until everyone has signed", () => {
    expect(isAwaitingSignatures({ signed: 1, total: 2 })).toBe(true);
    expect(isAwaitingSignatures({ signed: 2, total: 2 })).toBe(false);
    expect(isAwaitingSignatures(undefined)).toBe(false);
  });
});

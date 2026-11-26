import { describe, expect, it } from "vitest";
import { buildCrewDocuments, groupByType, type CrewDocRow, type CrewRequestRow } from "@/lib/crew-status";

const doc = (over: Partial<CrewDocRow>): CrewDocRow => ({
  id: "d1",
  document_number: 1,
  template_id: "PSA",
  submitted_by: null,
  submitted_at: "2026-11-26T10:00:00Z",
  title: null,
  signatures: [],
  ...over,
});

describe("buildCrewDocuments", () => {
  it("gives each crew member their own status on a document", () => {
    const result = buildCrewDocuments(
      ["a", "b"],
      [
        doc({
          signatures: [
            { user_id: "a", signed_at: "2026-11-26T10:05:00Z" },
            { user_id: "b", signed_at: null },
            { user_id: "outsider", signed_at: null },
          ],
        }),
      ],
      [],
    );
    expect(result.a.map((d) => d.status)).toEqual(["complete"]);
    expect(result.b.map((d) => d.status)).toEqual(["waiting"]);
    expect(result).not.toHaveProperty("outsider");
  });

  it("counts the submitter as complete even with nothing to sign", () => {
    const result = buildCrewDocuments(["a"], [doc({ submitted_by: "a", signatures: null })], []);
    expect(result.a).toHaveLength(1);
    expect(result.a[0].status).toBe("complete");
  });

  it("says waiting if someone has any unsigned row", () => {
    const result = buildCrewDocuments(
      ["a"],
      [
        doc({
          submitted_by: "a",
          signatures: [
            { user_id: "a", signed_at: "2026-11-26T10:05:00Z" },
            { user_id: "a", signed_at: null },
          ],
        }),
      ],
      [],
    );
    expect(result.a.map((d) => d.status)).toEqual(["waiting"]);
  });

  it("adds open requests, linking to the document that asked", () => {
    const requests: CrewRequestRow[] = [
      {
        id: "r1",
        template_id: "HARNESS",
        requested_user_id: "a",
        created_at: "2026-11-26T09:00:00Z",
        source: { id: "d9", document_number: 9 },
      },
      { id: "r2", template_id: "HARNESS", requested_user_id: null, created_at: "x", source: null },
    ];
    const [request] = buildCrewDocuments(["a"], [], requests).a;
    expect(request).toMatchObject({
      status: "requested",
      href: "/dashboard/documents/d9",
      fromNumber: 9,
      documentNumber: null,
    });
  });
});

describe("groupByType", () => {
  it("sorts types A-Z, requests first, then newest first", () => {
    const docs = buildCrewDocuments(
      ["a"],
      [
        doc({ id: "old", template_id: "PSA", submitted_by: "a", submitted_at: "2026-11-26T08:00:00Z" }),
        doc({ id: "new", template_id: "PSA", submitted_by: "a", submitted_at: "2026-11-26T11:00:00Z" }),
        doc({ id: "h", template_id: "HARNESS", submitted_by: "a" }),
      ],
      [{ id: "r", template_id: "PSA", requested_user_id: "a", created_at: "2026-11-26T07:00:00Z", source: null }],
    ).a;

    const groups = groupByType(docs, { PSA: "PSA", HARNESS: "Harness Inspection" });
    expect(groups.map((g) => [g.name, g.docs.map((d) => d.key)])).toEqual([
      ["Harness Inspection", ["doc-h"]],
      ["PSA", ["request-r", "doc-new", "doc-old"]],
    ]);
  });
});

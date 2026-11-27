import { describe, expect, it } from "vitest";
import { crewTitle, groupWorkforce } from "@/lib/workforce";

describe("groupWorkforce", () => {
  const names: Record<string, string> = { f1: "Zed", f2: "Amy" };
  const nameOf = (id: string) => names[id] ?? id;

  it("groups crews under their foreman, in crew order, foremen A-Z", () => {
    const out = groupWorkforce(
      [
        { foreman_id: "f1", member_id: "b", member_order: 2 },
        { foreman_id: "f1", member_id: "a", member_order: 1 },
        { foreman_id: "f2", member_id: null, member_order: null },
      ],
      nameOf,
    );
    expect(out).toEqual([
      { foremanId: "f2", memberIds: [] },
      { foremanId: "f1", memberIds: ["a", "b"] },
    ]);
  });

  it("lists someone only once per crew", () => {
    const out = groupWorkforce(
      [
        { foreman_id: "f1", member_id: "a", member_order: 1 },
        { foreman_id: "f1", member_id: "a", member_order: 1 },
      ],
      nameOf,
    );
    expect(out[0].memberIds).toEqual(["a"]);
  });
});

describe("crewTitle", () => {
  it("adds the possessive", () => {
    expect(crewTitle("Pat Lee")).toBe("Pat Lee's crew");
    expect(crewTitle("Chris Jones")).toBe("Chris Jones' crew");
  });
});

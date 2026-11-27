import { describe, expect, it } from "vitest";
import {
  addCard,
  availableCards,
  DEFAULT_LAYOUT,
  moveCard,
  parseLayout,
  removeCard,
  resizeCard,
  serializeLayout,
  type DashboardLayout,
} from "@/lib/dashboard-layout";

const layout: DashboardLayout = [
  { type: "stats", size: "full" },
  { type: "crew", size: "medium" },
  { type: "apps", size: "small" },
];

describe("parseLayout", () => {
  it("uses the default when nothing is saved", () => {
    expect(parseLayout(undefined)).toEqual(DEFAULT_LAYOUT);
    expect(parseLayout({})).toEqual(DEFAULT_LAYOUT);
    expect(parseLayout({ cards: "nope" })).toEqual(DEFAULT_LAYOUT);
  });

  it("keeps a saved layout, including an empty one", () => {
    expect(parseLayout(serializeLayout(layout))).toEqual(layout);
    expect(parseLayout({ cards: [] })).toEqual([]);
  });

  it("drops unknown cards and duplicates, and fixes sizes a card doesn't allow", () => {
    expect(
      parseLayout({
        cards: [
          { type: "crew", size: "small" }, // crew can't be small
          { type: "ghost", size: "full" },
          { type: "crew", size: "full" },
          { type: "toString", size: "full" }, // not a real card, just an object key
          { type: "apps" },
        ],
      }),
    ).toEqual([
      { type: "crew", size: "medium" },
      { type: "apps", size: "medium" },
    ]);
  });
});

describe("editing", () => {
  it("moves cards", () => {
    expect(moveCard(layout, 0, 2).map((c) => c.type)).toEqual(["crew", "apps", "stats"]);
    expect(moveCard(layout, 2, 0).map((c) => c.type)).toEqual(["apps", "stats", "crew"]);
    expect(moveCard(layout, 1, 99).map((c) => c.type)).toEqual(["stats", "apps", "crew"]);
    expect(moveCard(layout, 1, 1)).toBe(layout);
  });

  it("resizes only to allowed sizes", () => {
    expect(resizeCard(layout, "crew", "full")[1].size).toBe("full");
    expect(resizeCard(layout, "crew", "small")).toBe(layout);
  });

  it("removes and adds cards (no duplicates, default size)", () => {
    expect(removeCard(layout, "crew").map((c) => c.type)).toEqual(["stats", "apps"]);
    expect(addCard(layout, "workforce").at(-1)).toEqual({ type: "workforce", size: "full" });
    expect(addCard(layout, "crew")).toBe(layout);
  });

  it("lists the cards that can still be added", () => {
    const left = availableCards(layout);
    expect(left).not.toContain("crew");
    expect(left).toContain("workforce");
    expect(availableCards([])).toHaveLength(8);
  });
});

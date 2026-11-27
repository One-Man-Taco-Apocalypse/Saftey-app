import { describe, expect, it } from "vitest";
import { randomId } from "@/lib/uuid";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("randomId", () => {
  it("makes a v4 UUID", () => {
    expect(randomId()).toMatch(UUID_V4);
  });

  it("still works where crypto.randomUUID is missing (plain http on a phone)", () => {
    const original = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(crypto), "randomUUID");
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
    try {
      expect(typeof crypto.randomUUID).toBe("undefined");
      const ids = new Set(Array.from({ length: 200 }, () => randomId()));
      for (const id of ids) expect(id).toMatch(UUID_V4);
      expect(ids.size).toBe(200);
    } finally {
      delete (crypto as { randomUUID?: unknown }).randomUUID; // back to the built-in one
      if (original) expect(typeof crypto.randomUUID).toBe("function");
    }
  });
});

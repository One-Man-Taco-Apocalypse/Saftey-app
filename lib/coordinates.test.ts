import { describe, expect, it } from "vitest";
import { coordinateError, coordinatesError, mapLinks, parseCoordinatePair } from "@/lib/coordinates";

describe("coordinateError", () => {
  it("accepts decimal degrees in range, and blank", () => {
    expect(coordinateError("43.6532", "latitude")).toBeNull();
    expect(coordinateError("-79.3832", "longitude")).toBeNull();
    expect(coordinateError("  ", "latitude")).toBeNull();
    expect(coordinateError("180", "longitude")).toBeNull();
  });

  it("rejects text and out-of-range numbers", () => {
    expect(coordinateError("abc", "latitude")).toMatch(/decimal number/);
    expect(coordinateError("43°39'N", "latitude")).toMatch(/decimal number/);
    expect(coordinateError("91", "latitude")).toMatch(/between -90 and 90/);
    expect(coordinateError("-181", "longitude")).toMatch(/between -180 and 180/);
  });
});

describe("coordinatesError", () => {
  it("needs both or neither", () => {
    expect(coordinatesError("", "")).toBeNull();
    expect(coordinatesError("43.6", "-79.3")).toBeNull();
    expect(coordinatesError("43.6", "")).toMatch(/both/);
  });
});

describe("parseCoordinatePair", () => {
  it("splits a pasted pair", () => {
    expect(parseCoordinatePair("43.6532, -79.3832")).toEqual({ latitude: "43.6532", longitude: "-79.3832" });
    expect(parseCoordinatePair("43.6532 -79.3832")).toEqual({ latitude: "43.6532", longitude: "-79.3832" });
  });

  it("ignores anything that isn't a valid pair", () => {
    expect(parseCoordinatePair("43.6532")).toBeNull();
    expect(parseCoordinatePair("95, 10")).toBeNull();
    expect(parseCoordinatePair("Toronto")).toBeNull();
  });
});

describe("mapLinks", () => {
  it("builds Google and Apple Maps links", () => {
    const links = mapLinks("43.6532", "-79.3832", "Tower A");
    expect(links?.google).toBe("https://www.google.com/maps/search/?api=1&query=43.6532%2C-79.3832");
    expect(links?.apple).toBe("https://maps.apple.com/?ll=43.6532%2C-79.3832&q=Tower%20A");
  });

  it("gives nothing without valid coordinates", () => {
    expect(mapLinks("", "")).toBeNull();
    expect(mapLinks("99", "1")).toBeNull();
  });
});

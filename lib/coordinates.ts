// Map coordinates (decimal degrees). Pure functions, unit tested in coordinates.test.ts.

// A latitude/longitude typed as text: a number in range, or "" for none.
// Returns an error message, or null if it's fine.
export function coordinateError(value: string, kind: "latitude" | "longitude"): string | null {
  const v = value.trim();
  if (!v) return null;
  const n = Number(v);
  const max = kind === "latitude" ? 90 : 180;
  if (!/^[-+]?\d+(\.\d+)?$/.test(v) || !Number.isFinite(n)) {
    return `Enter the ${kind} as a decimal number, e.g. ${kind === "latitude" ? "43.6532" : "-79.3832"}`;
  }
  if (Math.abs(n) > max) return `The ${kind} must be between -${max} and ${max}`;
  return null;
}

// Error for the pair: each must be valid, and both or neither filled in.
export function coordinatesError(latitude: string, longitude: string): string | null {
  const lat = coordinateError(latitude, "latitude");
  const lng = coordinateError(longitude, "longitude");
  if (lat || lng) return lat ?? lng;
  if (!latitude.trim() !== !longitude.trim()) return "Enter both latitude and longitude, or neither";
  return null;
}

// "43.6532, -79.3832" (as copied from Google Maps) -> both numbers, else null.
export function parseCoordinatePair(text: string): { latitude: string; longitude: string } | null {
  const m = text.trim().match(/^([-+]?\d+(?:\.\d+)?)\s*[,\s]\s*([-+]?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const [latitude, longitude] = [m[1], m[2]];
  return coordinatesError(latitude, longitude) ? null : { latitude, longitude };
}

// Links that open the spot in each maps app, or null without valid coordinates.
export function mapLinks(latitude: string, longitude: string, label?: string) {
  if (!latitude.trim() || !longitude.trim() || coordinatesError(latitude, longitude)) return null;
  const ll = `${latitude.trim()},${longitude.trim()}`;
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ll)}`,
    apple: `https://maps.apple.com/?ll=${encodeURIComponent(ll)}&q=${encodeURIComponent(label || "Project")}`,
  };
}

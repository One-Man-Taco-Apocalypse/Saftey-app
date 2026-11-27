// A random UUID (v4), e.g. "3b241101-e2bb-4255-8caf-4136c566a962".
//
// Use this instead of crypto.randomUUID(): browsers only provide that on
// secure pages (https:// or localhost), so it's missing when the app is opened
// over plain http on another device, like a phone on the same Wi-Fi.
// crypto.getRandomValues() works everywhere and is just as random.
export function randomId(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === "function") return c.randomUUID();

  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// The user's own dashboard layout: which cards, in what order, at what size.
// Saved in user_settings.preferences.dashboard. Pure functions (no React, no
// database), unit tested in dashboard-layout.test.ts.

export type CardSize = "small" | "medium" | "large" | "full";

export const SIZE_LABELS: Record<CardSize, { short: string; long: string }> = {
  small: { short: "S", long: "Small (¼ width)" },
  medium: { short: "M", long: "Medium (½ width)" },
  large: { short: "L", long: "Large (¾ width)" },
  full: { short: "Full", long: "Full width" },
};
const ALL_SIZES: CardSize[] = ["small", "medium", "large", "full"];

// Every card a dashboard can have. To add a new one: add it here, then render
// it in app/dashboard/(home)/page.tsx (CARD_CONTENT).
export const CARD_TYPES = {
  stats: {
    title: "Key numbers",
    description: "Signatures needed, requests, crew and today's documents",
    sizes: ["medium", "large", "full"],
    defaultSize: "full",
  },
  signatures: {
    title: "Waiting on you",
    description: "Documents to sign and documents requested from you",
    sizes: ["medium", "large", "full"],
    defaultSize: "medium",
  },
  crew: {
    title: "My crew",
    description: "Your crew and their documents from the last 12 hours",
    sizes: ["medium", "large", "full"],
    defaultSize: "medium",
  },
  project: {
    title: "Current project",
    description: "Your active project and favourites",
    sizes: ALL_SIZES,
    defaultSize: "medium",
  },
  apps: {
    title: "Quick links",
    description: "Shortcuts and outside resources",
    sizes: ALL_SIZES,
    defaultSize: "medium",
  },
  jobInfo: {
    title: "Job information",
    description: "Your project's location, map and team",
    sizes: ["large", "full"],
    defaultSize: "full",
  },
  workforce: {
    title: "Project workforce",
    description: "Every crew on your project",
    sizes: ["large", "full"],
    defaultSize: "full",
  },
  announcements: {
    title: "Project announcements",
    description: "Updates for everyone on your project",
    sizes: ALL_SIZES,
    defaultSize: "medium",
  },
} satisfies Record<string, { title: string; description: string; sizes: CardSize[]; defaultSize: CardSize }>;

export type CardType = keyof typeof CARD_TYPES;
export type DashboardCard = { type: CardType; size: CardSize };
export type DashboardLayout = DashboardCard[];

export const isCardType = (t: unknown): t is CardType =>
  typeof t === "string" && Object.prototype.hasOwnProperty.call(CARD_TYPES, t);

export const sizesFor = (type: CardType): CardSize[] => CARD_TYPES[type].sizes;

// What everyone starts with (and "Reset to default")
export const DEFAULT_LAYOUT: DashboardLayout = [
  { type: "stats", size: "full" },
  { type: "signatures", size: "medium" },
  { type: "crew", size: "medium" },
  { type: "project", size: "medium" },
  { type: "apps", size: "medium" },
];

// A saved layout, made safe: unknown cards dropped, duplicates removed, sizes a
// card doesn't allow replaced by its default. Nothing saved = the default.
// (An empty list is respected: the user removed every card.)
export function parseLayout(saved: unknown): DashboardLayout {
  const cards = (saved as { cards?: unknown } | null)?.cards;
  if (!Array.isArray(cards)) return DEFAULT_LAYOUT;
  const seen = new Set<CardType>();
  const layout: DashboardLayout = [];
  for (const c of cards) {
    const type = (c as { type?: unknown })?.type;
    if (!isCardType(type) || seen.has(type)) continue;
    seen.add(type);
    const size = (c as { size?: unknown }).size as CardSize;
    layout.push({ type, size: sizesFor(type).includes(size) ? size : CARD_TYPES[type].defaultSize });
  }
  return layout;
}

// What's stored in preferences.dashboard
export const serializeLayout = (layout: DashboardLayout) => ({ version: 1, cards: layout });

// --- Editing ----------------------------------------------------------------------------

// Move a card from one position to another.
export function moveCard(layout: DashboardLayout, from: number, to: number): DashboardLayout {
  if (from === to || from < 0 || from >= layout.length) return layout;
  const next = [...layout];
  const [card] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, card);
  return next;
}

export function resizeCard(layout: DashboardLayout, type: CardType, size: CardSize): DashboardLayout {
  if (!sizesFor(type).includes(size)) return layout;
  return layout.map((c) => (c.type === type ? { ...c, size } : c));
}

export const removeCard = (layout: DashboardLayout, type: CardType): DashboardLayout =>
  layout.filter((c) => c.type !== type);

// Added at the end, at its default size. Already there = no change.
export function addCard(layout: DashboardLayout, type: CardType): DashboardLayout {
  if (layout.some((c) => c.type === type)) return layout;
  return [...layout, { type, size: CARD_TYPES[type].defaultSize }];
}

// Cards not on the dashboard yet (for "Add card")
export const availableCards = (layout: DashboardLayout): CardType[] =>
  (Object.keys(CARD_TYPES) as CardType[]).filter((t) => !layout.some((c) => c.type === t));

export const sameLayout = (a: DashboardLayout, b: DashboardLayout) => JSON.stringify(a) === JSON.stringify(b);

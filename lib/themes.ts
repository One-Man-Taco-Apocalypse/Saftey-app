// App themes. Each one's colours live in app/globals.css under
// [data-theme="<value>"]. Add `dark: true` for themes with a dark background
// (and list it in darkMode in tailwind.config.ts).
export const THEMES = [
  { value: "midnight", label: "Midnight", description: "The original dark look" },
  { value: "light", label: "Light", description: "Bright, with a #0075ba blue accent" },
  { value: "dark", label: "Dark", description: "Deep navy, with a #0075ba blue accent" },
] as const;

export type ThemeName = (typeof THEMES)[number]["value"];

export const DEFAULT_THEME: ThemeName = "midnight";
export const THEME_NAMES: string[] = THEMES.map((t) => t.value);

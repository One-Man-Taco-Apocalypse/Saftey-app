"use client";

import { useTheme } from "next-themes";
import { SearchSelect } from "@/components/documents/search-select";
import { DEFAULT_THEME, THEMES } from "@/lib/themes";

const options = THEMES.map(({ value, label, description }) => ({ value, label, description }));

// Theme picker. The choice is remembered in this browser.
// Only render it in the browser (it reads the saved theme).
export function ThemeSelect({ id = "theme" }: { id?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <SearchSelect
      id={id}
      value={theme ?? DEFAULT_THEME}
      options={options}
      onChange={setTheme}
      searchPlaceholder="Search themes"
    />
  );
}

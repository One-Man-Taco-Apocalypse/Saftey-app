<<<<<<< Updated upstream
// Shared look for form inputs (glass style)
export const inputClass =
  "w-full rounded-xl border border-white/70 bg-white/60 px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40 dark:border-white/15 dark:bg-white/10";
=======
// Shared looks. Combine with cn() to add or override classes.

// Text inputs, textareas and dropdown buttons
export const inputClass =
  "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40";

// Main action, e.g. "New document"
export const primaryButtonClass =
  "rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-60";

// Secondary action, e.g. "Back to dashboard"
export const secondaryButtonClass =
  "rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted";

// Red error message box
export const errorBoxClass =
  "rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400";
>>>>>>> Stashed changes

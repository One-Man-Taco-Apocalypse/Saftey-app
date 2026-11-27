import { YES_NO_NA } from "@/lib/documents";
import { cn } from "@/lib/utils";

const selectedTone = {
  yes: "bg-emerald-600 text-white",
  no: "bg-red-600 text-white",
  na: "bg-slate-600 text-white dark:bg-slate-500",
} as const;

// Yes / No / N/A buttons that behave like radio buttons: one Tab stop per
// question, arrow keys move and choose.
export function YesNoNaInput({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string; // also labels the group via `${id}-label`
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={`${id}-label`}
      onKeyDown={(e) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        const current = YES_NO_NA.findIndex((o) => o.value === value);
        const next = (current + step + YES_NO_NA.length) % YES_NO_NA.length;
        onChange(YES_NO_NA[next].value);
        e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
      }}
      className={cn(
        "inline-flex shrink-0 overflow-hidden rounded-xl border border-border bg-card p-0.5",
        invalid && "border-red-400 dark:border-red-400",
      )}
    >
      {YES_NO_NA.map((option, i) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            id={i === 0 ? id : undefined}
            type="button"
            role="radio"
            aria-checked={selected}
            // Only the chosen option (or the first, if none) is a Tab stop
            tabIndex={selected || (!value && i === 0) ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-w-[3.25rem] rounded-lg px-3 py-1.5 text-sm font-medium transition",
              selected
                ? selectedTone[option.value]
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

import { CheckCircle2, Clock, Send } from "lucide-react";
import { cn } from "@/lib/utils";

// The coloured status badges used across documents:
//   complete   green   (signed / done)
//   waiting    amber   (still needs a signature)
//   requested  blue    (asked to complete a document)
export type PillTone = "complete" | "waiting" | "requested";

const tones: Record<PillTone, { className: string; icon: typeof Clock }> = {
  complete: { className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", icon: CheckCircle2 },
  waiting: { className: "bg-amber-500/15 text-amber-800 dark:text-amber-300", icon: Clock },
  requested: { className: "bg-sky-500/15 text-sky-800 dark:text-sky-300", icon: Send },
};

const sizes = {
  sm: { pill: "gap-1 px-2 py-0.5", icon: "h-3 w-3" },
  md: { pill: "gap-1 px-2.5 py-1 text-xs", icon: "h-3 w-3" },
  lg: { pill: "gap-1.5 px-3 py-1 text-xs", icon: "h-3.5 w-3.5" },
};

export function statusPillClass(tone: PillTone, size: keyof typeof sizes = "md") {
  return cn("inline-flex shrink-0 items-center rounded-full font-medium", sizes[size].pill, tones[tone].className);
}

export function StatusPill({
  tone,
  size = "md",
  icon = true,
  className,
  children,
}: {
  tone: PillTone;
  size?: keyof typeof sizes;
  icon?: boolean | typeof Clock; // false = no icon, or a different icon
  className?: string;
  children: React.ReactNode;
}) {
  const Icon = icon === true ? tones[tone].icon : icon || null;
  return (
    <span className={cn(statusPillClass(tone, size), className)}>
      {Icon && <Icon className={sizes[size].icon} />}
      {children}
    </span>
  );
}

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Panel } from "./panel";

const tones = {
  accent: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

// A number with a label and an icon, for the row of stats at the top of the
// dashboard. With `href` the whole card is a link.
export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "accent",
  href,
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode; // small line under the number
  icon: LucideIcon;
  tone?: keyof typeof tones;
  href?: string;
}) {
  const body = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
        {detail && <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>}
      </div>
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", tones[tone])}>
        <Icon className="h-5 w-5" />
      </span>
    </div>
  );

  return (
    <Panel className={cn("col-span-1", href && "p-0 transition hover:border-sky-400/50 hover:shadow-md")}>
      {href ? (
        <Link
          href={href}
          className="block rounded-xl p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          {body}
        </Link>
      ) : (
        body
      )}
    </Panel>
  );
}

export function StatCardSkeleton() {
  return (
    <Panel className="col-span-1">
      <div className="h-4 w-28 animate-pulse rounded-full bg-muted" />
      <div className="mt-3 h-8 w-14 animate-pulse rounded-full bg-muted" />
    </Panel>
  );
}

import { cn } from "@/lib/utils";
import { Panel } from "./panel";

// The dashboard is a grid of "modules" (cards). On wide screens it has 4 columns,
// 2 on tablets, 1 on phones. Each module's height grows with its content.
export function ModuleGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-4">{children}</div>;
}

// How many columns a module takes up.
const sizes = {
  small: "col-span-1", // 1/4 width on desktop
  medium: "col-span-1 md:col-span-2", // 1/2 width
  large: "col-span-1 md:col-span-2 xl:col-span-3", // 3/4 width
  full: "col-span-1 md:col-span-2 xl:col-span-4", // full row
};

export type ModuleSize = keyof typeof sizes;

export function Module({
  size = "small",
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { size?: ModuleSize }) {
  return <Panel className={cn(sizes[size], className)} {...props} />;
}

const iconTones = {
  accent: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

// The top line of a card: icon, title, optional line under it, and an action
// (button) on the right. Ends with a divider, like the examples' cards.
export function ModuleHeader({
  title,
  description,
  icon: Icon,
  tone = "accent",
  action,
}: {
  title: string;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: keyof typeof iconTones;
  action?: React.ReactNode;
}) {
  return (
    <div className="-mx-5 -mt-5 mb-4 flex items-center gap-3 border-b border-border px-5 py-4">
      {Icon && (
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", iconTones[tone])}>
          <Icon className="h-[1.125rem] w-[1.125rem]" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-semibold tracking-tight">{title}</h2>
        {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

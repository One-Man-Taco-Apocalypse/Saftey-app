import { cn } from "@/lib/utils";
import { GlassCard } from "./glass-card";

// The dashboard is a grid of "modules". On wide screens it has 4 columns,
// 2 on tablets, 1 on phones. Each module's height grows with its content.
export function ModuleGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-4">
      {children}
    </div>
  );
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
  return <GlassCard className={cn(sizes[size], className)} {...props} />;
}

import { cn } from "@/lib/utils";

// Frosted "liquid glass" panel. Use it for anything that should float
// over the dashboard background.
export function GlassCard({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        // shape
        "relative overflow-hidden rounded-3xl p-6",
        // see-through + blur of whatever is behind it
        "bg-white/55 backdrop-blur-2xl backdrop-saturate-150 dark:bg-white/[0.07]",
        // thin bright edge + soft shadow + inner highlight along the top
        "border border-white/70 shadow-[0_8px_32px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]",
        "dark:border-white/15 dark:shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]",
        className,
      )}
      {...props}
    />
  );
}

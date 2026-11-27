import { cn } from "@/lib/utils";

// A white card (themed) that holds a section of a page.
export function Panel({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm shadow-black/[0.03]",
        className,
      )}
      {...props}
    />
  );
}

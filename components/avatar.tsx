import { User } from "lucide-react";
import { cn } from "@/lib/utils";

// Pick black or white for the icon so it's readable on any background color.
function iconColorFor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? "#000000" : "#ffffff";
}

// Colored circle with a person icon. Size it with className, e.g. "h-8 w-8".
export function Avatar({
  color,
  className,
}: {
  color: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
        className,
      )}
      style={{ backgroundColor: color, color: iconColorFor(color) }}
    >
      <User className="h-1/2 w-1/2" />
    </div>
  );
}

import { cn } from "@/lib/utils";

// Widths a page can use:
//   wide     dashboards, lists, tables: fills the screen (up to a very large cap,
//            so lines don't get absurdly long on ultra-wide monitors)
//   form     forms and single documents: wide enough for two columns of fields
const widths = {
  wide: "max-w-[120rem]", // 1920px
  form: "max-w-6xl", // 1152px
};

// Padding grows with the screen; matches the top bar's side padding.
export const pagePadding = "px-4 py-5 sm:px-6 lg:px-8 lg:py-7";

// The outer box of every dashboard page.
export function PageContainer({
  width = "wide",
  className,
  children,
}: {
  width?: keyof typeof widths;
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("mx-auto w-full", widths[width], pagePadding, className)}>{children}</div>;
}

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

export type Crumb = { label: string; href?: string };

// "Dashboard > Documents > #12". The last item is the current page (no link).
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {items.map((c, i) => (
          <Fragment key={`${c.label}-${i}`}>
            {i > 0 && <ChevronRight aria-hidden className="h-3 w-3" />}
            <li>
              {c.href ? (
                <Link href={c.href} className="transition hover:text-foreground">
                  {c.label}
                </Link>
              ) : (
                <span aria-current="page" className="font-medium text-foreground">
                  {c.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

// Top of a page: breadcrumb trail, title, an optional line underneath, and
// actions (buttons) on the right.
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumbs?: Crumb[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} className="mb-1.5" />}
        <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

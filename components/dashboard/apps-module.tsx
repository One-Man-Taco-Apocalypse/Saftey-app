import { FilePlus2, Scale } from "lucide-react";
import Link from "next/link";
import { Module } from "./module-grid";

// Quick links. Add more apps to this list; each gets an icon tile with its
// title underneath. `gradient` is the tile color. Links to other websites
// (starting with http) open in a new tab.
const apps = [
  {
    title: "Create document",
    href: "/dashboard/documents/new",
    icon: FilePlus2,
    gradient: "from-sky-400 to-blue-600",
  },
  {
    title: "OSHA Online Regs",
    href: "https://www.ontario.ca/laws/statute/90o01#BK0",
    icon: Scale,
    gradient: "from-red-500 to-rose-700",
  },
];

const tileClass =
  "group flex flex-col items-center gap-2 rounded-2xl p-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500";

export function AppsModule() {
  return (
    <Module size="full">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Apps
      </p>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-4">
        {apps.map(({ title, href, icon: Icon, gradient }) => {
          const tile = (
            <>
              {/* iOS-style rounded icon tile */}
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg shadow-black/10 ring-1 ring-inset ring-white/30 transition duration-200 group-hover:-translate-y-0.5 group-hover:scale-105 group-active:scale-95`}
              >
                <Icon className="h-7 w-7" />
              </span>
              <span className="text-xs font-medium leading-tight">{title}</span>
            </>
          );
          return href.startsWith("http") ? (
            <a key={title} href={href} target="_blank" rel="noopener noreferrer" className={tileClass}>
              {tile}
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            <Link key={title} href={href} className={tileClass}>
              {tile}
            </Link>
          );
        })}
      </div>
    </Module>
  );
}

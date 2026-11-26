import { FilePlus2 } from "lucide-react";
import Link from "next/link";
import { Module } from "./module-grid";

// Quick links. Add more apps to this list; each gets an icon tile with its
// title underneath. `gradient` is the tile color.
const apps = [
  {
    title: "Create document",
    href: "/dashboard/documents/new",
    icon: FilePlus2,
    gradient: "from-sky-400 to-blue-600",
  },
];

export function AppsModule() {
  return (
    <Module size="full">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Apps
      </p>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-4">
        {apps.map(({ title, href, icon: Icon, gradient }) => (
          <Link
            key={title}
            href={href}
            className="group flex flex-col items-center gap-2 rounded-2xl p-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            {/* iOS-style rounded icon tile */}
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg shadow-black/10 ring-1 ring-inset ring-white/30 transition duration-200 group-hover:-translate-y-0.5 group-hover:scale-105 group-active:scale-95`}
            >
              <Icon className="h-7 w-7" />
            </span>
            <span className="text-xs font-medium leading-tight">{title}</span>
          </Link>
        ))}
      </div>
    </Module>
  );
}

"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { personName, type Person } from "@/lib/person";
import { cn } from "@/lib/utils";
import { inputClass } from "./styles";

export type SearchSelectOption = {
  value: string;
  label: string;
  description?: string; // smaller grey line under the label
  keywords?: string; // extra text the search matches on
};

// A person as a dropdown option: name (plus "(You)"), position underneath,
// and searchable by email too.
export function personOption(person: Person, currentUserId?: string): SearchSelectOption {
  return {
    value: person.user_id,
    label: personName(person) + (person.user_id === currentUserId ? " (You)" : ""),
    description: person.position ?? undefined,
    keywords: person.email ?? undefined,
  };
}

// A dropdown with a search bar at the top of its list.
// Replaces the browser's <select>, whose list can't be searched or reliably
// coloured (it showed light text on a light list in dark mode).
export function SearchSelect({
  id,
  value,
  options,
  onChange,
  placeholder = "Choose…",
  searchPlaceholder = "Search",
  invalid,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: string;
  options: SearchSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  invalid?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0); // highlighted row, for the arrow keys
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const results = q
    ? options.filter((o) =>
        `${o.label} ${o.description ?? ""} ${o.keywords ?? ""}`.toLowerCase().includes(q),
      )
    : options;

  function openList() {
    setQuery("");
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }

  function close(focusTrigger = true) {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }

  function choose(option: SearchSelectOption) {
    onChange(option.value);
    close();
  }

  // Focus the search bar when the list opens
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  // Clicking anywhere outside closes the list
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Keep the highlighted row scrolled into view
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function onSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault(); // don't submit the form
      if (results[active]) choose(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation(); // don't also close a popup this sits in
      close();
    } else if (e.key === "Tab") {
      close(false);
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            openList();
          }
        }}
        className={cn(
          inputClass,
          "flex items-center gap-2 pr-10 text-left",
          invalid && "border-red-400 dark:border-red-400",
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-muted-foreground")}>
          {selected ? selected.label : placeholder}
          {selected?.description && (
            <span className="text-muted-foreground"> — {selected.description}</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        // Solid background (not glass) so the text is always readable
        <div className="absolute left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
          <div className="relative border-b border-slate-200 dark:border-slate-700">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder}
              className="h-10 w-full bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-slate-400"
            />
          </div>

          <ul ref={listRef} id={listId} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {results.length === 0 ? (
              <li className="px-3 py-3 text-center text-sm text-slate-500 dark:text-slate-400">
                {options.length === 0 ? "Nothing to choose from" : "No matches"}
              </li>
            ) : (
              results.map((option, i) => {
                const isSelected = option.value === value;
                return (
                  <li
                    key={option.value}
                    id={`${listId}-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={isSelected}
                    onPointerMove={() => setActive(i)}
                    onClick={() => choose(option)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-3 py-2",
                      i === active && "bg-sky-500/10 dark:bg-sky-400/15",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{option.label}</span>
                      {option.description && (
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                          {option.description}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  GripVertical,
  LayoutGrid,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { primaryButtonClass, secondaryButtonClass } from "@/components/documents/styles";
import {
  addCard,
  availableCards,
  CARD_TYPES,
  DEFAULT_LAYOUT,
  moveCard,
  removeCard,
  resizeCard,
  sameLayout,
  serializeLayout,
  SIZE_LABELS,
  sizesFor,
  type CardType,
  type DashboardLayout,
} from "@/lib/dashboard-layout";
import { saveUserSettings } from "@/lib/save-settings";
import { cn } from "@/lib/utils";
import { moduleSizeClass, ModuleHeader } from "../module-grid";
import { Panel } from "../panel";
import { PopupDialog } from "../popup";

const gridClass = "grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-4 2xl:gap-6";

// The "My Overview" dashboard: the user's own cards in their own order and
// sizes. "Edit dashboard" lets them add, remove, move and resize cards, then
// Save (stored in user_settings.preferences.dashboard).
//
// `cards` holds each card's content, rendered on the server; a card just added
// in edit mode has none yet and shows a preview until saved.
export function DashboardBoard({
  userId,
  preferences,
  initialLayout,
  cards,
}: {
  userId: string;
  preferences: Record<string, unknown>;
  initialLayout: DashboardLayout;
  cards: Partial<Record<CardType, React.ReactNode>>;
}) {
  const router = useRouter();
  const addDialogRef = useRef<HTMLDialogElement>(null);
  const [saved, setSaved] = useState(initialLayout);
  const [prefs, setPrefs] = useState(preferences);
  const [draft, setDraft] = useState<DashboardLayout | null>(null); // null = not editing
  const [dragging, setDragging] = useState<CardType | null>(null);
  const [dropTarget, setDropTarget] = useState<CardType | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editing = draft !== null;
  const layout = draft ?? saved;
  const changed = editing && !sameLayout(draft, saved);
  const canAdd = editing ? availableCards(draft) : [];

  function startEditing() {
    setDraft(saved);
    setError(null);
  }
  function cancel() {
    setDraft(null);
    setError(null);
  }
  async function save() {
    if (!draft) return;
    if (!changed) {
      setDraft(null);
      return;
    }
    setSaving(true);
    setError(null);
    const nextPrefs = { ...prefs, dashboard: serializeLayout(draft) };
    const err = await saveUserSettings(userId, { preferences: nextPrefs });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setPrefs(nextPrefs);
    setSaved(draft);
    setDraft(null);
    router.refresh(); // loads the content of any cards just added
  }

  const update = (fn: (l: DashboardLayout) => DashboardLayout) => setDraft((d) => (d ? fn(d) : d));

  return (
    <div>
      {/* Edit controls, top right */}
      {editing ? (
        <div className="sticky top-16 z-20 -mx-1 mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-sky-400/40 bg-card/95 p-3 shadow-lg backdrop-blur">
          <p className="mr-auto flex items-center gap-2 text-sm">
            <LayoutGrid className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <span>
              <span className="font-semibold">Editing your dashboard.</span>{" "}
              <span className="text-muted-foreground">Drag cards to move them, or use the arrows.</span>
            </span>
          </p>
          <button
            type="button"
            onClick={() => addDialogRef.current?.showModal()}
            disabled={canAdd.length === 0}
            className={cn(secondaryButtonClass, "flex items-center gap-1.5 disabled:opacity-50")}
          >
            <Plus className="h-4 w-4" /> Add card
          </button>
          <button
            type="button"
            onClick={() => setDraft(DEFAULT_LAYOUT)}
            className={cn(secondaryButtonClass, "flex items-center gap-1.5")}
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button type="button" onClick={cancel} disabled={saving} className={secondaryButtonClass}>
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className={cn(primaryButtonClass, "flex items-center gap-1.5")}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? "Saving…" : "Save"}
          </button>
          {error && (
            <p className="w-full rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={startEditing}
            className={cn(secondaryButtonClass, "flex items-center gap-1.5")}
          >
            <Pencil className="h-4 w-4" /> Edit dashboard
          </button>
        </div>
      )}

      {layout.length === 0 ? (
        <Panel className="flex flex-col items-center gap-3 py-12 text-center">
          <LayoutGrid className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Your dashboard is empty</p>
          <button
            type="button"
            onClick={() => {
              if (!editing) startEditing();
              addDialogRef.current?.showModal();
            }}
            className={cn(primaryButtonClass, "flex items-center gap-1.5")}
          >
            <Plus className="h-4 w-4" /> Add a card
          </button>
        </Panel>
      ) : (
        <div className={gridClass}>
          {layout.map((card, index) => {
            const info = CARD_TYPES[card.type];
            const content = cards[card.type] ?? (
              // Just added: its content loads once the layout is saved
              <Panel>
                <ModuleHeader title={info.title} description={info.description} />
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Shows here after you save
                </p>
              </Panel>
            );

            if (!editing) {
              return (
                <div key={card.type} className={cn(moduleSizeClass[card.size], "min-w-0 [&>*]:h-full")}>
                  {content}
                </div>
              );
            }

            return (
              <div
                key={card.type}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", card.type);
                  setDragging(card.type);
                }}
                onDragOver={(e) => {
                  if (!dragging) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dropTarget !== card.type) setDropTarget(card.type);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragging && dragging !== card.type) {
                    update((l) =>
                      moveCard(
                        l,
                        l.findIndex((c) => c.type === dragging),
                        index,
                      ),
                    );
                  }
                  setDragging(null);
                  setDropTarget(null);
                }}
                onDragEnd={() => {
                  setDragging(null);
                  setDropTarget(null);
                }}
                className={cn(
                  moduleSizeClass[card.size],
                  "flex min-w-0 cursor-grab flex-col gap-2 rounded-xl border-2 border-dashed border-sky-400/50 bg-sky-500/5 p-2 transition active:cursor-grabbing",
                  dragging === card.type && "opacity-40",
                  dropTarget === card.type && dragging !== card.type && "border-sky-500 bg-sky-500/15",
                )}
              >
                {/* Card toolbar */}
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-card px-2 py-1.5 shadow-sm">
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="mr-auto min-w-0 truncate text-sm font-medium">{info.title}</span>

                  <div
                    role="group"
                    aria-label={`${info.title} size`}
                    className="flex rounded-md border border-border p-0.5"
                  >
                    {sizesFor(card.type).map((size) => (
                      <button
                        key={size}
                        type="button"
                        title={SIZE_LABELS[size].long}
                        aria-label={`${SIZE_LABELS[size].long}`}
                        aria-pressed={card.size === size}
                        onClick={() => update((l) => resizeCard(l, card.type, size))}
                        className={cn(
                          "rounded px-2 py-0.5 text-xs font-semibold transition",
                          card.size === size
                            ? "bg-sky-600 text-white"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {SIZE_LABELS[size].short}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => update((l) => moveCard(l, index, index - 1))}
                    disabled={index === 0}
                    aria-label={`Move ${info.title} earlier`}
                    className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => update((l) => moveCard(l, index, index + 1))}
                    disabled={index === layout.length - 1}
                    aria-label={`Move ${info.title} later`}
                    className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => update((l) => removeCard(l, card.type))}
                    aria-label={`Remove ${info.title}`}
                    title="Remove card"
                    className="rounded-md p-1 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* The card itself, frozen while editing */}
                <div inert className="pointer-events-none flex-1 select-none opacity-75 [&>*]:h-full">
                  {content}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add card */}
      <PopupDialog dialogRef={addDialogRef} title="Add a card">
        {canAdd.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Every card is already on your dashboard.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {canAdd.map((type) => (
              <li key={type} className="flex items-center gap-3 p-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{CARD_TYPES[type].title}</span>
                  <span className="block text-xs text-muted-foreground">{CARD_TYPES[type].description}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    update((l) => addCard(l, type));
                    if (canAdd.length <= 1) addDialogRef.current?.close();
                  }}
                  className={cn(primaryButtonClass, "flex shrink-0 items-center gap-1 px-3 py-1.5")}
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopupDialog>
    </div>
  );
}

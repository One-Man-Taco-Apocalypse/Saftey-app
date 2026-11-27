"use client";

import { Archive, ArchiveRestore, ExternalLink, FileUp, Loader2, Pencil, Plus, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ModuleHeader } from "@/components/dashboard/module-grid";
import { Panel } from "@/components/dashboard/panel";
import {
  errorBoxClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/documents/styles";
import { createClient } from "@/lib/supabase/client";
import type { ToolboxTalk } from "@/lib/toolbox-talks";
import { cn } from "@/lib/utils";
import { randomId } from "@/lib/uuid";

const BUCKET = "toolbox-talks";
const MAX_MB = 25;

type Draft = { title: string; category: string; code: string; summary: string };
const emptyDraft: Draft = { title: "", category: "", code: "", summary: "" };
const draftOf = (t: ToolboxTalk): Draft => ({
  title: t.title,
  category: t.category,
  code: t.code ?? "",
  summary: t.summary ?? "",
});

// Admin: add and edit toolbox talks (with a PDF), and archive / restore them.
// Talks are never deleted, so signed toolbox talk records keep their talk.
// `initialEditId` opens that talk for editing (from "Edit talk" on its page).
export function TalkManager({ talks, initialEditId }: { talks: ToolboxTalk[]; initialEditId?: string }) {
  const router = useRouter();
  const categoryListId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const initial = talks.find((t) => t.id === initialEditId) ?? null;
  const [editingId, setEditingId] = useState<string | null>(initial?.id ?? null);
  const [draft, setDraft] = useState<Draft>(initial ? draftOf(initial) : emptyDraft);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const editing = editingId ? (talks.find((t) => t.id === editingId) ?? null) : null;
  const categories = [...new Set(talks.map((t) => t.category))].sort((a, b) => a.localeCompare(b));

  // Opened from a talk's "Edit talk" button: bring the form into view
  useEffect(() => {
    if (initial) formRef.current?.scrollIntoView({ block: "start" });
  }, [initial]);

  const set = (field: keyof Draft, value: string) => setDraft((d) => ({ ...d, [field]: value }));

  function resetForm() {
    setEditingId(null);
    setDraft(emptyDraft);
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function startEdit(t: ToolboxTalk) {
    setEditingId(t.id);
    setDraft(draftOf(t));
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    setError(null);
    setDone(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    if (!draft.title.trim() || !draft.category.trim()) {
      setError("A talk needs a title and a category.");
      return;
    }
    if (file && file.type !== "application/pdf") {
      setError("The file must be a PDF.");
      return;
    }
    if (file && file.size > MAX_MB * 1024 * 1024) {
      setError(`The PDF must be under ${MAX_MB} MB.`);
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const bucket = supabase.storage.from(BUCKET);

    // A new PDF (adding, or replacing on edit) is uploaded first
    let newPath: string | null = null;
    if (file) {
      newPath = `talks/${randomId()}.pdf`;
      const { error: upErr } = await bucket.upload(newPath, file, { contentType: "application/pdf" });
      if (upErr) {
        setSaving(false);
        setError(`Upload failed: ${upErr.message}`);
        return;
      }
    }

    const fields = {
      title: draft.title.trim(),
      category: draft.category.trim(),
      code: draft.code.trim() || null,
      summary: draft.summary.trim() || null,
    };
    const { error: saveErr } = editing
      ? await supabase
          .from("toolbox_talks")
          .update(newPath ? { ...fields, pdf_path: newPath } : fields)
          .eq("id", editing.id)
      : await supabase.from("toolbox_talks").insert({ ...fields, pdf_path: newPath });

    if (saveErr) {
      if (newPath) await bucket.remove([newPath]); // don't leave the new file behind
      setSaving(false);
      setError(`Couldn't save: ${saveErr.message}`);
      return;
    }

    // Replaced a PDF: remove the old file. Best effort (only whoever uploaded it
    // can); a file left behind isn't used by anything.
    if (editing && newPath && editing.pdf_path) await bucket.remove([editing.pdf_path]);

    setSaving(false);
    setDone(editing ? `Saved changes to "${fields.title}".` : `Added "${fields.title}".`);
    resetForm();
    router.refresh();
  }

  async function setArchived(talk: ToolboxTalk, archived: boolean) {
    setBusyId(talk.id);
    setError(null);
    const { error: updErr } = await createClient()
      .from("toolbox_talks")
      .update({ archived })
      .eq("id", talk.id);
    setBusyId(null);
    if (updErr) setError(`Couldn't update: ${updErr.message}`);
    else router.refresh();
  }

  const active = talks.filter((t) => !t.archived);
  const archived = talks.filter((t) => t.archived);
  const smallButton =
    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50";

  const row = (t: ToolboxTalk) => (
    <li
      key={t.id}
      className={cn("flex flex-wrap items-center gap-2 px-3 py-2.5", editingId === t.id && "bg-sky-500/10")}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {t.code && <span className="mr-1.5 tabular-nums text-muted-foreground">{t.code}</span>}
          {t.title}
        </span>
        <span className="block text-xs text-muted-foreground">
          {t.category}
          {!t.pdf_path && " · no PDF"}
        </span>
      </span>
      <button type="button" onClick={() => startEdit(t)} className={smallButton}>
        <Pencil className="h-3.5 w-3.5" /> Edit
      </button>
      <Link href={`/dashboard/toolbox-talks/${t.id}`} className={smallButton}>
        View <ExternalLink className="h-3 w-3" />
      </Link>
      <button
        type="button"
        onClick={() => setArchived(t, !t.archived)}
        disabled={busyId === t.id}
        className={smallButton}
      >
        {busyId === t.id ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : t.archived ? (
          <ArchiveRestore className="h-3.5 w-3.5" />
        ) : (
          <Archive className="h-3.5 w-3.5" />
        )}
        {t.archived ? "Restore" : "Archive"}
      </button>
    </li>
  );

  return (
    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div ref={formRef} className="scroll-mt-20">
        <Panel className={cn(editing && "ring-2 ring-sky-500/40")}>
          <ModuleHeader
            title={editing ? "Edit talk" : "Add a talk"}
            description={editing ? editing.title : "Only upload PDFs you have the right to use"}
            icon={editing ? Pencil : Plus}
          />
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="talk-title" className="mb-1.5 block text-sm font-medium">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="talk-title"
                value={draft.title}
                onChange={(e) => set("title", e.target.value)}
                maxLength={150}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div>
                <label htmlFor="talk-category" className="mb-1.5 block text-sm font-medium">
                  Category <span className="text-red-500">*</span>
                </label>
                <input
                  id="talk-category"
                  value={draft.category}
                  onChange={(e) => set("category", e.target.value)}
                  list={categoryListId}
                  maxLength={60}
                  placeholder="e.g. Fall protection"
                  className={inputClass}
                />
                <datalist id={categoryListId}>
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label htmlFor="talk-code" className="mb-1.5 block text-sm font-medium">
                  Code (optional)
                </label>
                <input
                  id="talk-code"
                  value={draft.code}
                  onChange={(e) => set("code", e.target.value)}
                  maxLength={20}
                  placeholder="e.g. FP-01"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="talk-summary" className="mb-1.5 block text-sm font-medium">
                Summary (optional)
              </label>
              <textarea
                id="talk-summary"
                value={draft.summary}
                onChange={(e) => set("summary", e.target.value)}
                maxLength={500}
                rows={2}
                className={cn(inputClass, "resize-y")}
              />
            </div>
            <div>
              <label htmlFor="talk-pdf" className="mb-1.5 block text-sm font-medium">
                {editing ? "Replace PDF (optional)" : "PDF"}
              </label>
              <label
                htmlFor="talk-pdf"
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-3 text-sm transition hover:bg-muted"
              >
                <FileUp className="h-5 w-5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 truncate">
                  {file
                    ? file.name
                    : editing
                      ? editing.pdf_path
                        ? "Keeping the current PDF. Choose a file to replace it."
                        : `No PDF yet. Choose one (up to ${MAX_MB} MB)`
                      : `Choose a PDF (up to ${MAX_MB} MB)`}
                </span>
              </label>
              <input
                ref={fileRef}
                id="talk-pdf"
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </div>

            {error && <p className={errorBoxClass}>{error}</p>}
            {done && (
              <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                {done}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className={cn(primaryButtonClass, "flex flex-1 items-center justify-center gap-2")}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editing ? (
                  <Save className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {saving ? "Saving…" : editing ? "Save changes" : "Add talk"}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setError(null);
                  }}
                  disabled={saving}
                  className={secondaryButtonClass}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </Panel>
      </div>

      <Panel>
        <ModuleHeader
          title="Talks"
          description={`${active.length} in the list · ${archived.length} archived`}
        />
        {active.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No talks yet. Add the first one.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {active.map(row)}
          </ul>
        )}
        {archived.length > 0 && (
          <details className="mt-4" open={!!editing?.archived}>
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
              Archived ({archived.length})
            </summary>
            <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border opacity-80">
              {archived.map(row)}
            </ul>
          </details>
        )}
      </Panel>
    </div>
  );
}

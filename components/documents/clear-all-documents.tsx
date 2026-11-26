"use client";

// TEMPORARY (for testing): wipes every filled-in document for everyone.
// To remove: delete this file, its <ClearAllDocuments /> on the Documents page,
// and run `drop function if exists public.dev_clear_all_documents(text);`

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PHOTO_BUCKET } from "@/lib/documents";
import { createClient } from "@/lib/supabase/client";

const CONFIRM_WORD = "DELETE";

// Removes the signed-in user's own uploaded files (photos, signatures).
// Files are stored as <uid>/<document id>/<file>. Best effort: other people's
// files can only be removed by them (or in the Supabase dashboard).
async function removeMyFiles(supabase: ReturnType<typeof createClient>, userId: string) {
  const bucket = supabase.storage.from(PHOTO_BUCKET);
  const { data: folders } = await bucket.list(userId, { limit: 1000 });
  const paths: string[] = [];
  for (const folder of folders ?? []) {
    const { data: files } = await bucket.list(`${userId}/${folder.name}`, { limit: 1000 });
    for (const f of files ?? []) paths.push(`${userId}/${folder.name}/${f.name}`);
  }
  for (let i = 0; i < paths.length; i += 100) {
    await bucket.remove(paths.slice(i, i + 100));
  }
  return paths.length;
}

export function ClearAllDocuments() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function clearAll() {
    setWorking(true);
    setError(null);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) {
      setError("You're not signed in.");
      setWorking(false);
      return;
    }

    const { data, error: rpcError } = await supabase.rpc("dev_clear_all_documents", {
      p_confirm: "DELETE ALL DOCUMENTS",
    });
    if (rpcError) {
      setError(`Couldn't clear: ${rpcError.message}`);
      setWorking(false);
      return;
    }

    const files = await removeMyFiles(supabase, userId);
    setResult(
      `Deleted ${data ?? 0} ${data === 1 ? "document" : "documents"}` +
        (files ? ` and ${files} of your uploaded ${files === 1 ? "file" : "files"}` : "") +
        ".",
    );
    setWorking(false);
    setOpen(false);
    setTyped("");
    router.refresh();
  }

  return (
    <div className="mt-8 rounded-2xl border border-dashed border-red-400/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
        Testing only · temporary
      </p>

      {!open ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Delete every filled-in document, for everyone. Forms are kept.
          </p>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setResult(null);
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-red-400/60 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
            Clear all document data
          </button>
        </div>
      ) : (
        <form
          className="mt-2 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed === CONFIRM_WORD) clearAll();
          }}
        >
          <label htmlFor="confirm-clear" className="text-sm">
            This deletes <strong>all documents, signatures and document requests</strong> for
            everyone, and can&apos;t be undone. Type <strong>{CONFIRM_WORD}</strong> to confirm.
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="confirm-clear"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoFocus
              className="h-10 min-w-0 flex-1 rounded-xl border border-white/70 bg-white/60 px-3 text-sm outline-none focus:ring-2 focus:ring-red-500/40 dark:border-white/15 dark:bg-white/10"
            />
            <button
              type="submit"
              disabled={typed !== CONFIRM_WORD || working}
              className="flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {working && <Loader2 className="h-4 w-4 animate-spin" />}
              {working ? "Deleting…" : "Delete everything"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTyped("");
                setError(null);
              }}
              disabled={working}
              className="rounded-full border border-white/70 bg-white/60 px-4 py-2 text-sm font-medium transition hover:bg-white/90 dark:border-white/15 dark:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {result && (
        <p className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          {result}
        </p>
      )}
    </div>
  );
}

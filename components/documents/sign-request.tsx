"use client";

import { Loader2, PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PHOTO_BUCKET } from "@/lib/documents";
import { createClient } from "@/lib/supabase/client";
import { SignaturePad } from "./signature-pad";

// Lets the signed-in user add THEIR signature to a document they were asked to
// sign. Only their own request row changes; the rest of the document can't be
// edited (the database only allows updating the signature on your own request).
export function SignRequest({
  requestId,
  submissionId,
  fieldId,
}: {
  requestId: string;
  submissionId: string;
  fieldId: string;
}) {
  const router = useRouter();
  const [png, setPng] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Links from the dashboard end in #sign. The page streams in after navigation,
  // so the browser can't jump there itself; scroll to the first sign box instead.
  useEffect(() => {
    if (window.location.hash !== "#sign") return;
    const first = document.querySelector("[data-sign-request]");
    if (first === boxRef.current) {
      boxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  async function sign() {
    if (!png) {
      setError("Draw your signature first");
      return;
    }
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) {
      setError("You're not signed in.");
      setSaving(false);
      return;
    }

    // Your own folder: <your uid>/<document id>/<file>
    const path = `${userId}/${submissionId}/${fieldId}-${userId}-${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, png, { contentType: "image/png" });
    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`);
      setSaving(false);
      return;
    }

    const { data, error: saveError } = await supabase
      .from("document_signatures")
      .update({ signature_path: path })
      .eq("id", requestId)
      .select("id"); // returns the row only if it really changed

    if (saveError || !data || data.length === 0) {
      await supabase.storage.from(PHOTO_BUCKET).remove([path]); // don't leave the image behind
      setError(
        saveError
          ? `Couldn't save: ${saveError.message}`
          : "Couldn't save: this request may already be signed or was removed.",
      );
      setSaving(false);
      return;
    }

    router.refresh(); // show the saved signature
  }

  return (
    <div
      ref={boxRef}
      id={`sign-${requestId}`}
      data-sign-request
      className="w-full scroll-mt-24 rounded-xl border-2 border-amber-400/60 bg-amber-500/5 p-3"
    >
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-amber-800 dark:text-amber-300">
        <PenLine className="h-4 w-4" />
        Your signature is needed
      </p>
      <SignaturePad id={`sign-${requestId}`} onChange={setPng} invalid={!!error && !png} />
      {error && (
        <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={sign}
        disabled={saving}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-60 sm:w-auto"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saving ? "Saving…" : "Sign document"}
      </button>
    </div>
  );
}

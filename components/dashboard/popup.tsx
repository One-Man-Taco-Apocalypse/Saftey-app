"use client";

import { X } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

// The glass popup window itself. Opened with dialogRef.current.showModal().
export function PopupDialog({
  dialogRef,
  title,
  children,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  title: string;
  children?: React.ReactNode;
}) {
  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      // Clicking the dimmed area outside the popup closes it
      onClick={(e) => {
        if (e.target === dialogRef.current) close();
      }}
      className={cn(
        "w-[min(42rem,calc(100vw-2rem))] rounded-3xl p-0 text-foreground",
        "border border-white/70 bg-white/75 shadow-2xl backdrop-blur-2xl backdrop-saturate-150",
        "dark:border-white/15 dark:bg-slate-900/70",
        "backdrop:bg-slate-900/30 backdrop:backdrop-blur-sm",
        "open:animate-in open:fade-in open:zoom-in-95 open:duration-200",
      )}
    >
      <div className="min-h-[20rem] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

// Wrap any part of a card to make just that part open a popup.
// `children` is the clickable bit; `popup` is what shows inside the popup.
export function PopupButton({
  title,
  popup,
  className,
  children,
}: {
  title: string;
  popup?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={cn(
          "rounded-xl text-left transition hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
          className,
        )}
      >
        {children}
      </button>
      <PopupDialog dialogRef={dialogRef} title={title}>
        {popup}
      </PopupDialog>
    </>
  );
}

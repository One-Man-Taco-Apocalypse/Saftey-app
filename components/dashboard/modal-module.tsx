"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { Module, type ModuleSize } from "./module-grid";
import { PopupDialog } from "./popup";

// A dashboard module where clicking anywhere on the card opens a popup.
// `children` is what shows on the card; `popup` is what shows in the popup.
// (To make only part of a card clickable, use <PopupButton> instead.)
export function ModalModule({
  title,
  size,
  className,
  children,
  popup,
}: {
  title: string;
  size?: ModuleSize;
  className?: string;
  children: React.ReactNode;
  popup?: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Module
        size={size}
        className={cn("transition duration-200 hover:-translate-y-0.5 hover:bg-muted", className)}
      >
        {/* Invisible button covering the whole card, so the entire card is clickable */}
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          aria-label={`Open ${title}`}
          className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        />
        {children}
      </Module>

      <PopupDialog dialogRef={dialogRef} title={title}>
        {popup}
      </PopupDialog>
    </>
  );
}

"use client";

import { Settings } from "lucide-react";
import { useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { PopupDialog } from "@/components/dashboard/popup";
import { ThemeSelect } from "@/components/theme-select";

const subscribe = () => () => {};

// Sidebar "Settings" button that opens the settings popup.
export function SettingsButton({ className }: { className: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // The popup is rendered on <body>, not inside the sidebar, so the sidebar
  // doesn't stay expanded while it's open. (document only exists in the browser.)
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  return (
    <>
      <button
        type="button"
        title="Settings"
        onClick={() => dialogRef.current?.showModal()}
        className={className}
      >
        <Settings className="h-[1.125rem] w-[1.125rem] shrink-0" />
        Settings
      </button>

      {mounted &&
        createPortal(
          <PopupDialog dialogRef={dialogRef} title="Settings">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="settings-theme" className="text-sm font-medium">
                Theme
              </label>
              <ThemeSelect id="settings-theme" />
              <p className="text-xs text-muted-foreground">Saved on this device.</p>
            </div>
          </PopupDialog>,
          document.body,
        )}
    </>
  );
}

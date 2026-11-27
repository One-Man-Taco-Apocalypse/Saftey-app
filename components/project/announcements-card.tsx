import { Megaphone } from "lucide-react";
import { Module, ModuleHeader } from "@/components/dashboard/module-grid";

// Project announcements. Empty for now.
export function AnnouncementsCard() {
  return (
    <Module size="full">
      <ModuleHeader title="Project announcements" icon={Megaphone} tone="emerald" />
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm font-medium">No announcements yet</p>
        <p className="text-xs text-muted-foreground">
          Updates for everyone on this project will show up here.
        </p>
      </div>
    </Module>
  );
}

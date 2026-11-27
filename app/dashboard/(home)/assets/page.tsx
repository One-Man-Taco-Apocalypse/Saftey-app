import { Boxes } from "lucide-react";
import { Panel } from "@/components/dashboard/panel";

// Dashboard tab: My Assets. Empty for now.
export default function MyAssetsPage() {
  return (
    <Panel>
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400">
          <Boxes className="h-6 w-6" />
        </span>
        <p className="font-medium">No assets yet</p>
        <p className="text-sm text-muted-foreground">
          Equipment and tools assigned to you will show up here.
        </p>
      </div>
    </Panel>
  );
}

import { Settings2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Panel } from "@/components/dashboard/panel";
import { secondaryButtonClass } from "@/components/documents/styles";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { TalkLibrary } from "@/components/toolbox/talk-library";
import { getToolboxTalks } from "@/lib/toolbox-talks";
import { cn } from "@/lib/utils";

async function Talks() {
  return <TalkLibrary talks={await getToolboxTalks()} />;
}

function TalksSkeleton() {
  return (
    <div>
      <div className="mb-4 h-10 w-full max-w-md animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/60" />
        ))}
      </div>
    </div>
  );
}

// All toolbox talks. Opened from the "Toolbox Talks" quick link.
export default function ToolboxTalksPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Toolbox talks"
        description="Pick a talk to read it, then record who attended."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Toolbox talks" }]}
        actions={
          <Link
            href="/dashboard/admin/toolbox-talks"
            className={cn(secondaryButtonClass, "flex items-center gap-2")}
          >
            <Settings2 className="h-4 w-4" />
            Manage talks
          </Link>
        }
      />
      <Panel>
        <Suspense fallback={<TalksSkeleton />}>
          <Talks />
        </Suspense>
      </Panel>
    </PageContainer>
  );
}

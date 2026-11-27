import { Suspense } from "react";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { TalkManager } from "@/components/toolbox/talk-manager";
import { getToolboxTalks } from "@/lib/toolbox-talks";

type SearchParams = Promise<{ edit?: string | string[] }>;

// ?edit=<id> opens that talk for editing (from "Edit talk" on its page)
async function Manager({ searchParams }: { searchParams: SearchParams }) {
  const { edit } = await searchParams;
  return (
    <TalkManager
      talks={await getToolboxTalks(true)}
      initialEditId={typeof edit === "string" ? edit : undefined}
    />
  );
}

// Admin: add, edit and archive toolbox talks.
export default function ManageToolboxTalksPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageContainer>
      <PageHeader
        title="Toolbox talks"
        description="Add and edit talks in the library. Archived talks leave the list but stay on past records."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin" },
          { label: "Toolbox talks" },
        ]}
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted/60" />}>
        <Manager searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}

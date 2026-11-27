import { FileText, PenLine, Send, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { getCrewDocuments } from "@/lib/crew-documents";
import { getCrewIds } from "@/lib/people";
import { getMyDocumentRequests, getOutstandingSignatures } from "@/lib/signatures";
import { countRecentSubmissions } from "@/lib/submissions";
import { getCurrentUser } from "@/lib/user";
import { StatCard, StatCardSkeleton } from "./stat-card";

// The row of numbers at the top of the dashboard. Every query here is shared
// with the cards below (cached), so this row costs one extra query: the count.
export async function DashboardStats() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const crewIds = await getCrewIds(user.id);
  const [signatures, requests, crewDocuments, recent] = await Promise.all([
    getOutstandingSignatures(user.id),
    getMyDocumentRequests(user.id),
    getCrewDocuments(crewIds),
    countRecentSubmissions(24),
  ]);
  // Crew members with something still to do (a signature or a requested document)
  const crewWaiting = crewIds.filter((id) =>
    (crewDocuments[id] ?? []).some((d) => d.status !== "complete"),
  ).length;

  return (
    <>
      <StatCard
        label="Signatures needed"
        value={signatures.length}
        detail={signatures.length ? "Documents waiting for you" : "You're all caught up"}
        icon={PenLine}
        tone="amber"
        href="#signatures"
      />
      <StatCard
        label="Requested from you"
        value={requests.length}
        detail={requests.length ? "Documents to complete" : "Nothing requested"}
        icon={Send}
        href="#signatures"
      />
      <StatCard
        label="Crew"
        value={crewIds.length}
        detail={crewIds.length ? `${crewWaiting} with items waiting` : "No one on your crew yet"}
        icon={Users}
        tone="violet"
        href="#crew"
      />
      <StatCard
        label="Documents today"
        value={recent}
        detail="Submitted in the last 24 hours"
        icon={FileText}
        tone="emerald"
        href="/dashboard/documents"
      />
    </>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <StatCardSkeleton key={i} />
      ))}
    </>
  );
}

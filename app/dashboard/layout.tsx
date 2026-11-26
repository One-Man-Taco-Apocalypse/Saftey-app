import { Sidebar } from "@/components/sidebar";

// Wraps every screen under /dashboard with the sidebar and the background.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-svh">
      {/* Soft colored blobs behind everything. The glass cards blur these,
          which is what gives them the "liquid glass" look.
          Colours come from the theme (app/globals.css). */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[rgb(var(--page-bg))]">
        <div className="absolute -left-32 -top-32 h-[32rem] w-[32rem] rounded-full bg-[var(--blob-1)] blur-3xl" />
        <div className="absolute -right-24 top-1/4 h-[28rem] w-[28rem] rounded-full bg-[var(--blob-2)] blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-[30rem] w-[30rem] rounded-full bg-[var(--blob-3)] blur-3xl" />
      </div>

      <Sidebar />
      {/* pl-16 leaves room for the collapsed sidebar. When it expands it
          slides over the content instead of pushing it around. */}
      <main className="pl-16">{children}</main>
    </div>
  );
}

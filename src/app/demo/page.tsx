import Link from "next/link";
import { DemoDashboardContent } from "@/components/demo-dashboard-content";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

export default function DemoPage() {
  return (
    <PageShell>
      <PageHeader title="Radar" tag="Demo">
        <Button asChild variant="ghost">
          <Link href="/demo/chat">Ask Radar</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Connect Gmail</Link>
        </Button>
      </PageHeader>

      <DemoDashboardContent />
    </PageShell>
  );
}

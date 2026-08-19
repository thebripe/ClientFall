import Link from "next/link";
import { DemoChatPanel } from "@/components/demo-chat-panel";
import { PageHeader } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

export default function DemoChatPage() {
  return (
    <main className="flex min-h-screen w-full flex-col bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 overflow-hidden">
        <PageHeader title="Ask Radar" tag="Demo" backHref="/demo" backLabel="Demo">
          <Button asChild variant="outline">
            <Link href="/">Connect Gmail</Link>
          </Button>
        </PageHeader>
        <DemoChatPanel />
      </div>
    </main>
  );
}

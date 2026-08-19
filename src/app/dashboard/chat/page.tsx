import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatPanel } from "@/components/chat-panel";
import { PageHeader } from "@/components/page-shell";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  return (
    <main className="flex min-h-screen w-full flex-col bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 overflow-hidden">
        <PageHeader title="Ask Radar" backHref="/dashboard" backLabel="Dashboard" />
        <ChatPanel />
      </div>
    </main>
  );
}

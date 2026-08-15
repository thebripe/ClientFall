import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatPanel } from "@/components/chat-panel";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  return (
    <main className="min-h-screen bg-[#0a0e17] px-6 py-10 text-slate-100">
      <div className="mx-auto flex h-[calc(100vh-5rem)] max-w-2xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-300">
            ← Back to dashboard
          </Link>
          <h1 className="text-sm font-medium text-slate-300">Ask Radar</h1>
          <span className="w-24" />
        </div>
        <ChatPanel />
      </div>
    </main>
  );
}

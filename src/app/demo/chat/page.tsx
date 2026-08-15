import Link from "next/link";
import { DemoChatPanel } from "@/components/demo-chat-panel";

export default function DemoChatPage() {
  return (
    <main className="min-h-screen bg-[#0a0e17] px-6 py-10 text-slate-100">
      <div className="mx-auto flex h-[calc(100vh-5rem)] max-w-2xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link href="/demo" className="text-xs text-slate-500 hover:text-slate-300">
            ← Back to demo dashboard
          </Link>
          <h1 className="text-sm font-medium text-slate-300">
            Ask Radar <span className="text-xs font-normal text-amber-400">(Demo)</span>
          </h1>
          <Link
            href="/"
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            Connect Gmail
          </Link>
        </div>
        <DemoChatPanel />
      </div>
    </main>
  );
}

import Link from "next/link";
import { DemoDashboardContent } from "@/components/demo-dashboard-content";

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#0a0e17] px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            Radar <span className="text-xs font-normal text-amber-400">(Demo)</span>
          </h1>
          <div className="flex items-center gap-2">
            <Link
              href="/demo/chat"
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              Ask Radar
            </Link>
            <Link
              href="/"
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              Connect Gmail
            </Link>
          </div>
        </div>

        <DemoDashboardContent />
      </div>
    </main>
  );
}

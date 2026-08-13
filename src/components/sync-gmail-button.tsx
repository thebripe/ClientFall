"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncGmailButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ clients: number; threads: number } | null>(
    null
  );

  async function handleSync() {
    setLoading(true);
    setError(null);
    setResult(null);

    const res = await fetch("/api/gmail/sync", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Sync failed");
      setLoading(false);
      return;
    }

    setResult(data);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleSync}
        disabled={loading}
        className="w-fit rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white disabled:opacity-60"
      >
        {loading ? "Syncing last 60 days…" : "Sync Gmail"}
      </button>
      {result && (
        <p className="text-xs text-emerald-400">
          Found {result.clients} client{result.clients === 1 ? "" : "s"} across{" "}
          {result.threads} thread{result.threads === 1 ? "" : "s"}.
        </p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

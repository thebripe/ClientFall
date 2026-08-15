"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DisconnectGmailButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDisconnect() {
    setLoading(true);
    await fetch("/api/gmail/disconnect", { method: "POST" });
    setLoading(false);
    setConfirming(false);
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400">
          Revoke Gmail access? Radar stops reading your inbox immediately — previously
          synced client data stays until you delete it.
        </span>
        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="rounded-md border border-red-800 px-2 py-1 text-red-300 hover:bg-red-950 disabled:opacity-60"
        >
          {loading ? "Disconnecting…" : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-md border border-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
    >
      Disconnect Gmail
    </button>
  );
}

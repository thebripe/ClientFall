"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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
      <div className="flex flex-wrap items-center justify-end gap-2 rounded-lg border border-border bg-card px-3 py-2">
        <span className="max-w-[22rem] text-xs leading-relaxed text-muted-foreground">
          Revoke Gmail access? Radar stops reading your inbox immediately — previously synced
          client data stays until you delete it.
        </span>
        <div className="flex items-center gap-2">
          <Button onClick={handleDisconnect} disabled={loading} variant="destructive" size="sm">
            {loading ? "Disconnecting…" : "Confirm"}
          </Button>
          <Button onClick={() => setConfirming(false)} variant="ghost" size="sm">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button onClick={() => setConfirming(true)} variant="ghost">
      Disconnect Gmail
    </Button>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ContractValueInput({
  clientId,
  initialValue,
}: {
  clientId: string;
  initialValue: number | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmed = value.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) return;

    setSaving(true);
    await fetch(`/api/clients/${clientId}/contract-value`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contract_value: parsed }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <label className="flex items-center gap-1.5 text-xs text-subtle-foreground">
      <span aria-hidden>$</span>
      <input
        type="number"
        min="0"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        }}
        placeholder="contract value"
        aria-label="Contract value"
        disabled={saving}
        className="w-28 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground tabular-nums transition-colors placeholder:text-subtle-foreground/70 hover:border-border-strong focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
      />
    </label>
  );
}

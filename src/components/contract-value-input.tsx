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
    <label className="flex items-center gap-1 text-xs text-slate-500">
      <span>$</span>
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
        disabled={saving}
        className="w-24 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-slate-300 focus:border-slate-500 focus:outline-none disabled:opacity-60"
      />
    </label>
  );
}

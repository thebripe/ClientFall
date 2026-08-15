"use client";

import Link from "next/link";
import { useState } from "react";
import { DEMO_CHAT_FALLBACK, DEMO_CHAT_QA, DEMO_CLIENTS, type DemoChatAnswer } from "@/lib/demo-data";

type Message = { role: "user" | "assistant"; content: string; referencedClients?: { id: string; name: string }[] };

function resolve(prompt: string): DemoChatAnswer {
  const match = DEMO_CHAT_QA.find((qa) => qa.prompt.toLowerCase() === prompt.trim().toLowerCase());
  return match ? match.response : DEMO_CHAT_FALLBACK;
}

function toReferencedClients(ids: string[]) {
  return ids
    .map((id) => DEMO_CLIENTS.find((c) => c.row.clients!.id === id))
    .filter((c): c is (typeof DEMO_CLIENTS)[number] => Boolean(c))
    .map((c) => ({ id: c.row.clients!.id, name: c.row.clients!.name }));
}

export function DemoChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      const result = resolve(trimmed);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.answer, referencedClients: toReferencedClients(result.referencedClientIds) },
      ]);
      setLoading(false);
    }, 900);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-slate-500">
              Sample questions only in this demo — no live API call is made. Connect your own
              Gmail to ask anything about your real clients.
            </p>
            <div className="flex flex-col gap-2">
              {DEMO_CHAT_QA.map((qa) => (
                <button
                  key={qa.prompt}
                  onClick={() => send(qa.prompt)}
                  className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800"
                >
                  {qa.prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col gap-1.5 ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    m.role === "user" ? "bg-slate-100 text-slate-900" : "bg-slate-800 text-slate-200"
                  }`}
                >
                  {m.content}
                </div>
                {m.referencedClients && m.referencedClients.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.referencedClients.map((c) => (
                      <Link
                        key={c.id}
                        href={`/demo/clients/${c.id}`}
                        className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
                      >
                        {c.name} →
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-500" />
                Reading your client data…
              </div>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-slate-800 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          placeholder="Try one of the sample questions above…"
          className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-slate-500 focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-md bg-slate-100 px-3 py-2 text-xs font-medium text-slate-900 transition hover:bg-white disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}

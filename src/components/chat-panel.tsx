"use client";

import Link from "next/link";
import { useState } from "react";

type ReferencedClient = { id: string; name: string };
type Message = { role: "user" | "assistant"; content: string; referencedClients?: ReferencedClient[] };

const STARTER_PROMPTS = [
  "Which client should I prioritize today?",
  "Who mentioned pricing recently?",
  "Which clients haven't heard from me in a while?",
  "Summarize what's going on with my highest-risk client.",
];

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: trimmed,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    setMessages([
      ...nextMessages,
      { role: "assistant", content: data.answer, referencedClients: data.referencedClients },
    ]);
    setLoading(false);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-slate-500">
              Ask about your clients in plain English — answers come only from your real synced
              data and analysis, never guessed.
            </p>
            <div className="flex flex-col gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800"
                >
                  {prompt}
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
                        href={`/dashboard/clients/${c.id}`}
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
            {error && <p className="text-xs text-red-400">{error}</p>}
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
          placeholder="Ask about a client, a deal, or your pipeline…"
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

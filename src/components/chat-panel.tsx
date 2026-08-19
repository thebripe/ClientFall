"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type ReferencedClient = { id: string; name: string };
type Message = {
  role: "user" | "assistant";
  content: string;
  referencedClients?: ReferencedClient[];
};

export type CannedAnswer = { answer: string; referencedClients: ReferencedClient[] };

/**
 * Live mode calls /api/chat; demo mode answers from canned fixtures so the
 * public demo can show the flow without exposing an unauthenticated,
 * paid-API-backed endpoint. One component so the two can't drift.
 */
type Props =
  | { mode: "live"; clientHrefBase: string }
  | {
      mode: "demo";
      clientHrefBase: string;
      prompts: string[];
      resolve: (prompt: string) => CannedAnswer;
    };

const LIVE_PROMPTS = [
  "Which client should I prioritize today?",
  "Who mentioned pricing recently?",
  "Which clients haven't heard from me in a while?",
  "Summarize what's going on with my highest-risk client.",
];

function ThinkingIndicator() {
  return (
    <div
      className="flex items-center gap-2 text-xs text-subtle-foreground"
      role="status"
      aria-live="polite"
    >
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="animate-pulse-soft size-1.5 rounded-full bg-muted-foreground"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </span>
      Reading your client data…
    </div>
  );
}

export function ChatPanel(props: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const prompts = props.mode === "demo" ? props.prompts : LIVE_PROMPTS;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    if (props.mode === "demo") {
      setTimeout(() => {
        const result = props.resolve(trimmed);
        setMessages([
          ...nextMessages,
          {
            role: "assistant",
            content: result.answer,
            referencedClients: result.referencedClients,
          },
        ]);
        setLoading(false);
      }, 900);
      return;
    }

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
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 py-10 text-center">
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              {props.mode === "demo"
                ? "Sample questions only in this demo — no live API call is made. Connect your own Gmail to ask anything about your real clients."
                : "Ask about your clients in plain English — answers come only from your real synced data and analysis, never guessed."}
            </p>
            <div className="flex flex-col items-center gap-2">
              {prompts.map((prompt, i) => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="animate-fade-in-up rounded-full border border-border bg-secondary px-3.5 py-1.5 text-xs text-muted-foreground transition-all duration-200 hover:border-border-strong hover:bg-raised hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {messages.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={i}
                  className={`animate-fade-in-up flex flex-col gap-2 ${
                    isUser ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      isUser
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md border border-border bg-background text-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                  {m.referencedClients && m.referencedClients.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.referencedClients.map((c) => (
                        <Link
                          key={c.id}
                          href={`${props.clientHrefBase}/${c.id}`}
                          className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground transition-all duration-200 hover:border-border-strong hover:bg-raised hover:text-foreground"
                        >
                          {c.name} →
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {loading && <ThinkingIndicator />}
            {error && <p className="text-xs text-urgent">{error}</p>}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          aria-label="Ask a question about your clients"
          placeholder={
            props.mode === "demo"
              ? "Try one of the sample questions above…"
              : "Ask about a client, a deal, or your pipeline…"
          }
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors placeholder:text-subtle-foreground/80 hover:border-border-strong focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}

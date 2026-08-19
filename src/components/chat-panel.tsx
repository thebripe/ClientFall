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

const STARTER_PROMPTS = [
  "Which client should I prioritize today?",
  "Who mentioned pricing recently?",
  "Which clients haven't heard from me in a while?",
  "Summarize what's going on with my highest-risk client.",
];

export function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`animate-fade-in-up flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border border-border bg-card text-foreground"
        }`}
      >
        {message.content}
      </div>
      {message.referencedClients && message.referencedClients.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {message.referencedClients.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/clients/${c.id}`}
              className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground transition-all duration-200 hover:border-border-strong hover:bg-raised hover:text-foreground"
            >
              {c.name} →
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function ThinkingIndicator() {
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

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.4),0_24px_48px_-24px_rgba(0,0,0,0.9)]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 py-8 text-center">
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Ask about your clients in plain English — answers come only from your real synced
              data and analysis, never guessed.
            </p>
            <div className="flex flex-col items-center gap-2">
              {STARTER_PROMPTS.map((prompt, i) => (
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
            {messages.map((m, i) => (
              <ChatBubble key={i} message={m} />
            ))}
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
        className="flex items-center gap-2 border-t border-border bg-background/40 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          aria-label="Ask a question about your clients"
          placeholder="Ask about a client, a deal, or your pipeline…"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors placeholder:text-subtle-foreground/80 hover:border-border-strong focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThinkingIndicator } from "@/components/chat-panel";
import { DEMO_CHAT_FALLBACK, DEMO_CHAT_QA, DEMO_CLIENTS, type DemoChatAnswer } from "@/lib/demo-data";

type Message = {
  role: "user" | "assistant";
  content: string;
  referencedClients?: { id: string; name: string }[];
};

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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

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
        {
          role: "assistant",
          content: result.answer,
          referencedClients: toReferencedClients(result.referencedClientIds),
        },
      ]);
      setLoading(false);
    }, 900);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.4),0_24px_48px_-24px_rgba(0,0,0,0.9)]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 py-8 text-center">
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Sample questions only in this demo — no live API call is made. Connect your own Gmail
              to ask anything about your real clients.
            </p>
            <div className="flex flex-col items-center gap-2">
              {DEMO_CHAT_QA.map((qa, i) => (
                <button
                  key={qa.prompt}
                  onClick={() => send(qa.prompt)}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="animate-fade-in-up rounded-full border border-border bg-secondary px-3.5 py-1.5 text-xs text-muted-foreground transition-all duration-200 hover:border-border-strong hover:bg-raised hover:text-foreground"
                >
                  {qa.prompt}
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
                          href={`/demo/clients/${c.id}`}
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
          aria-label="Ask a sample question"
          placeholder="Try one of the sample questions above…"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors placeholder:text-subtle-foreground/80 hover:border-border-strong focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}

"use client";

import { ChatPanel, type CannedAnswer } from "@/components/chat-panel";
import { DEMO_CHAT_FALLBACK, DEMO_CHAT_QA, DEMO_CLIENTS } from "@/lib/demo-data";

/**
 * Thin wrapper that feeds the shared ChatPanel canned answers. Exists
 * because `resolve` is a function prop, which can't cross the server →
 * client boundary from the demo page directly.
 */
export function DemoChat() {
  function resolve(prompt: string): CannedAnswer {
    const match = DEMO_CHAT_QA.find(
      (qa) => qa.prompt.toLowerCase() === prompt.trim().toLowerCase()
    );
    const result = match ? match.response : DEMO_CHAT_FALLBACK;

    return {
      answer: result.answer,
      referencedClients: result.referencedClientIds
        .map((id) => DEMO_CLIENTS.find((c) => c.row.clients!.id === id))
        .filter((c): c is (typeof DEMO_CLIENTS)[number] => Boolean(c))
        .map((c) => ({ id: c.row.clients!.id, name: c.row.clients!.name })),
    };
  }

  return (
    <ChatPanel
      mode="demo"
      clientHrefBase="/demo/clients"
      prompts={DEMO_CHAT_QA.map((qa) => qa.prompt)}
      resolve={resolve}
    />
  );
}

// Deterministic, explainable "needs attention" scoring. No AI here —
// plain rules over message timing/direction. Reuses the scores_daily
// table from the original spec, but for this slice health_score means
// attention urgency (higher = needs attention sooner), not relationship
// health — revisit the naming if/when the AI-extraction health score
// (from AGENTS.md's fuller spec) gets built alongside this.

export type MessageDirection = "inbound" | "outbound";

export type ClientMessageSignal = {
  direction: MessageDirection;
  dateMs: number;
};

export type AttentionSignal = {
  daysSinceLastContact: number;
  awaitingReply: boolean; // last message was inbound (from the client) — they're waiting on us
  wentQuiet: boolean; // was active, then activity dropped off sharply
};

export type AttentionResult = {
  score: number; // 0-100, higher = more urgent
  reasons: string[];
  suggestedAction: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Looks at a client's messages across all their threads and derives the
// raw signals the scoring formula runs on.
export function deriveAttentionSignal(
  messages: ClientMessageSignal[],
  now = Date.now()
): AttentionSignal {
  const sorted = [...messages].sort((a, b) => a.dateMs - b.dateMs);
  const last = sorted[sorted.length - 1];

  const daysSinceLastContact = Math.max(
    0,
    Math.floor((now - last.dateMs) / MS_PER_DAY)
  );
  const awaitingReply = last.direction === "inbound";

  const recentCutoff = now - 30 * MS_PER_DAY;
  const priorCutoff = now - 60 * MS_PER_DAY;
  const recentCount = sorted.filter((m) => m.dateMs >= recentCutoff).length;
  const priorCount = sorted.filter(
    (m) => m.dateMs >= priorCutoff && m.dateMs < recentCutoff
  ).length;
  const wentQuiet = priorCount >= 3 && recentCount === 0;

  return { daysSinceLastContact, awaitingReply, wentQuiet };
}

export function computeAttentionScore(signal: AttentionSignal): AttentionResult {
  const { daysSinceLastContact, awaitingReply, wentQuiet } = signal;
  let score = 0;
  const reasons: string[] = [];

  let suggestedAction = "No action needed right now.";

  if (awaitingReply) {
    // Highest-priority case: the client sent the last message and is
    // waiting on us. Grows with days waiting, capped so it doesn't
    // dwarf everything else.
    score += 50 + Math.min(daysSinceLastContact, 20) * 2;
    reasons.push(
      daysSinceLastContact <= 0
        ? "Hasn't heard back yet"
        : `Hasn't heard back in ${daysSinceLastContact} day${
            daysSinceLastContact === 1 ? "" : "s"
          }`
    );
    suggestedAction =
      daysSinceLastContact >= 7
        ? "Reply now — it's been over a week and they're still waiting on you."
        : "Reply to close the loop — they're waiting on you.";
  } else {
    score += Math.min(daysSinceLastContact, 30) * 1.5;
    if (daysSinceLastContact >= 3) {
      reasons.push("You're waiting on their reply");
      suggestedAction = "Send a short follow-up nudge.";
    }
  }

  if (wentQuiet) {
    score += 20;
    reasons.push("Went quiet after an active exchange");
    suggestedAction = "Check in — this relationship went cold fast.";
  }

  if (reasons.length === 0) {
    reasons.push("Recently in touch — no action needed");
  }

  return {
    score: Math.min(100, Math.round(score)),
    reasons,
    suggestedAction,
  };
}

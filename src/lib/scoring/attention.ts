// Deterministic, explainable "needs attention" scoring. No AI here —
// plain rules over message timing/direction/frequency. Reuses the
// scores_daily table from the original spec, but for this slice
// health_score means attention urgency (higher = needs attention
// sooner), not relationship health — revisit the naming if/when the
// AI-extraction health score (from AGENTS.md's fuller spec) gets built
// alongside this.

export type MessageDirection = "inbound" | "outbound";

export type ClientMessageSignal = {
  direction: MessageDirection;
  dateMs: number;
};

export type AttentionSignal = {
  daysSinceLastContact: number;
  awaitingReply: boolean; // last message was inbound (from the client) — they're waiting on us
  wentQuiet: boolean; // was active, then activity dropped off sharply
  recentMessageCount: number; // last 30 days
  priorMessageCount: number; // 30-60 days ago
};

export type AttentionResult = {
  score: number; // 0-100, higher = more urgent
  reasons: string[];
  suggestedAction: string;
  actionLabel: string; // short, punchy form of suggestedAction (2-4 words)
};

// "warming" = replying faster than before, "cooling" = replying slower,
// "unknown" when there isn't enough reply history yet to compare.
export type EngagementTrend = "warming" | "steady" | "cooling" | "unknown";

export type CommunicationTrend = {
  avgReplyDays: number | null; // overall average time the user takes to reply
  recentAvgReplyDays: number | null; // last 30 days
  priorAvgReplyDays: number | null; // 30-60 days ago
  trend: EngagementTrend;
};

// More data behind a call = more confidence in it. Deliberately a label,
// not a fabricated percentage — we don't have a real probability model.
export type ConfidenceLevel = "low" | "medium" | "high";

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
  const recentMessageCount = sorted.filter((m) => m.dateMs >= recentCutoff).length;
  const priorMessageCount = sorted.filter(
    (m) => m.dateMs >= priorCutoff && m.dateMs < recentCutoff
  ).length;
  const wentQuiet = priorMessageCount >= 3 && recentMessageCount === 0;

  return {
    daysSinceLastContact,
    awaitingReply,
    wentQuiet,
    recentMessageCount,
    priorMessageCount,
  };
}

// How fast the user replies, and whether that's getting faster or
// slower. Reply latency = time from an inbound message to the next
// outbound one (an actual reply, not just "another message exists").
export function deriveCommunicationTrend(
  messages: ClientMessageSignal[],
  now = Date.now()
): CommunicationTrend {
  const sorted = [...messages].sort((a, b) => a.dateMs - b.dateMs);
  const replies: { dateMs: number; days: number }[] = [];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].direction === "inbound" && sorted[i].direction === "outbound") {
      replies.push({
        dateMs: sorted[i].dateMs,
        days: (sorted[i].dateMs - sorted[i - 1].dateMs) / MS_PER_DAY,
      });
    }
  }

  const avg = (nums: number[]) =>
    nums.length ? nums.reduce((sum, n) => sum + n, 0) / nums.length : null;

  const avgReplyDays = avg(replies.map((r) => r.days));

  const recentCutoff = now - 30 * MS_PER_DAY;
  const priorCutoff = now - 60 * MS_PER_DAY;
  const recentAvgReplyDays = avg(
    replies.filter((r) => r.dateMs >= recentCutoff).map((r) => r.days)
  );
  const priorAvgReplyDays = avg(
    replies.filter((r) => r.dateMs >= priorCutoff && r.dateMs < recentCutoff).map((r) => r.days)
  );

  let trend: EngagementTrend = "unknown";
  if (recentAvgReplyDays !== null && priorAvgReplyDays !== null && priorAvgReplyDays > 0.1) {
    const ratio = recentAvgReplyDays / priorAvgReplyDays;
    if (ratio <= 0.7) trend = "warming";
    else if (ratio >= 1.5) trend = "cooling";
    else trend = "steady";
  }

  return { avgReplyDays, recentAvgReplyDays, priorAvgReplyDays, trend };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function formatDays(n: number) {
  const r = round1(n);
  return r < 1 ? "under a day" : `${r} day${r === 1 ? "" : "s"}`;
}

// Natural-language observations grounded in the actual computed trends —
// no invented specifics. Ordered most-notable first, capped so the UI
// doesn't get noisy.
export function buildInsights(
  signal: AttentionSignal,
  trend: CommunicationTrend
): string[] {
  const insights: string[] = [];

  if (trend.trend === "cooling" && trend.recentAvgReplyDays !== null && trend.priorAvgReplyDays !== null) {
    insights.push(
      `Your replies have slowed — averaging ${formatDays(trend.recentAvgReplyDays)} lately, up from ${formatDays(trend.priorAvgReplyDays)}.`
    );
  } else if (trend.trend === "warming" && trend.recentAvgReplyDays !== null) {
    insights.push(`You're replying faster than usual — averaging ${formatDays(trend.recentAvgReplyDays)} lately.`);
  } else if (trend.avgReplyDays !== null) {
    insights.push(`You typically reply within ${formatDays(trend.avgReplyDays)}.`);
  }

  if (signal.wentQuiet) {
    insights.push("This was an active back-and-forth that suddenly stopped.");
  } else if (signal.priorMessageCount > 0 && signal.recentMessageCount > signal.priorMessageCount * 1.3) {
    insights.push("Message volume is picking up compared to last month.");
  } else if (signal.priorMessageCount > 0 && signal.recentMessageCount < signal.priorMessageCount * 0.5 && signal.recentMessageCount > 0) {
    insights.push("The conversation has noticeably slowed down.");
  }

  if (signal.awaitingReply && signal.daysSinceLastContact >= 2) {
    insights.push("Still recoverable — a reply now would likely move this forward.");
  }

  return insights.slice(0, 3);
}

export type VolumeTrend = "up" | "down" | "steady";

// Message-volume momentum: are they exchanging more or fewer messages
// than a month ago.
export function deriveVolumeTrend(signal: AttentionSignal): VolumeTrend {
  if (signal.priorMessageCount === 0) return "steady";
  if (signal.recentMessageCount > signal.priorMessageCount * 1.3) return "up";
  if (signal.recentMessageCount < signal.priorMessageCount * 0.5) return "down";
  return "steady";
}

// More real signal behind a call = higher confidence. Counts how many
// independent things (trend data, reply-latency history, message
// volume) actually back the recommendation.
export function assessConfidence(
  signal: AttentionSignal,
  trend: CommunicationTrend
): ConfidenceLevel {
  let backing = 0;
  if (trend.avgReplyDays !== null) backing++;
  if (trend.trend !== "unknown") backing++;
  if (signal.recentMessageCount + signal.priorMessageCount >= 4) backing++;
  if (signal.wentQuiet || signal.awaitingReply) backing++;

  if (backing >= 3) return "high";
  if (backing >= 2) return "medium";
  return "low";
}

export function computeAttentionScore(signal: AttentionSignal): AttentionResult {
  const { daysSinceLastContact, awaitingReply, wentQuiet } = signal;
  let score = 0;
  const reasons: string[] = [];

  let suggestedAction = "No action needed right now.";
  let actionLabel = "All good";

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
    if (daysSinceLastContact >= 7) {
      suggestedAction = "Reply now — it's been over a week and they're still waiting on you.";
      actionLabel = "Reply today";
    } else {
      suggestedAction = "Reply to close the loop — they're waiting on you.";
      actionLabel = "Reply soon";
    }
  } else {
    score += Math.min(daysSinceLastContact, 30) * 1.5;
    if (daysSinceLastContact >= 3) {
      reasons.push("You're waiting on their reply");
      suggestedAction = "Send a short follow-up nudge.";
      actionLabel = "Follow up";
    }
  }

  if (wentQuiet) {
    score += 20;
    reasons.push("Went quiet after an active exchange");
    suggestedAction = "Check in — this relationship went cold fast.";
    actionLabel = "Check in";
  }

  if (reasons.length === 0) {
    reasons.push("Recently in touch — no action needed");
  }

  return {
    score: Math.min(100, Math.round(score)),
    reasons,
    suggestedAction,
    actionLabel,
  };
}

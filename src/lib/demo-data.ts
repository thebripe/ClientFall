import type { ClientIntelligenceExtraction, ClientMemory, ScoreRow } from "@/lib/types";

// Hand-written sample data for the public /demo route. None of this is
// real — names, domains, and email addresses use *.example so nobody
// mistakes it for an actual client, and nothing here ever triggers a
// Gmail, Supabase, or Anthropic call. It exists so people without a
// connected Gmail account can see every feature working.

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export type DemoDraft = { canDraft: true; subject: string; draft: string; reason: string; recipientEmail: string }
  | { canDraft: false; reason: string };

type DemoFixture = {
  row: ScoreRow;
  contactEmail: string;
  draft: DemoDraft;
  analyzedYet: boolean;
  memory: ClientMemory | null;
  memoryUpdatedAt: string | null;
};

const harborMemory: ClientMemory = {
  decision_maker: "Priya (ops lead) — needs finance sign-off before contracts move",
  budget: "Targeting ~$9k for phase one, pushed back on the $12k quote",
  current_software: null,
  competitors_mentioned: [],
  pain_points: ["Internal review process is slow — 6 weeks feels aggressive to their team"],
  goals: ["Get phase one approved and moving before their fiscal quarter closes"],
  communication_style: "Replies same-day when engaged, prefers itemized breakdowns over prose",
  important_dates_or_commitments: ["You committed to sending an itemized breakdown by Friday"],
  personal_notes: [],
};

const bramMemory: ClientMemory = {
  decision_maker: null,
  budget: null,
  current_software: null,
  competitors_mentioned: [],
  pain_points: [],
  goals: ["Book a fall session, hasn't picked a date yet"],
  communication_style: "Casual, enthusiastic tone",
  important_dates_or_commitments: [],
  personal_notes: ["Mentioned they loved the outdoor light in the last shoot"],
};

const harborIntelligence: ClientIntelligenceExtraction = {
  relevant: true,
  summary:
    "Harbor & Vale is close to signing but stalled on the proposed timeline and hasn't confirmed budget sign-off from their finance lead.",
  objections: ["\"6 weeks feels aggressive given our internal review process.\""],
  pricing_mentions: ["\"We were expecting closer to $9k for phase one, not $12k.\""],
  buying_signals: ["\"If we can get the timeline right, we're ready to move forward.\""],
  hesitation_signals: ["Hasn't replied in 6 days after previously replying same-day."],
  competitor_mentions: [],
  open_questions: ["\"Can you break the $12k down by deliverable so I can take it to finance?\""],
  commitments: [
    { by: "user", text: "Send an itemized cost breakdown by Friday", fulfilled: false },
  ],
};

const nomiIntelligence: ClientIntelligenceExtraction = {
  relevant: true,
  summary:
    "Nomi Studio is comparing you against one other vendor and waiting on a specific answer about revision turnaround before deciding.",
  objections: [],
  pricing_mentions: [],
  buying_signals: ["\"Your last project is exactly the style we want.\""],
  hesitation_signals: [],
  competitor_mentions: ["\"We're also talking to a studio in Austin.\""],
  open_questions: ["\"What's your typical turnaround on revisions once a draft is out?\""],
  commitments: [],
};

export const DEMO_CLIENTS: DemoFixture[] = [
  {
    row: {
      health_score: 82,
      dollar_at_risk: 4200,
      date: daysAgo(0),
      top_reasons_json: {
        reasons: ["No reply in 6 days after they asked a direct pricing question.", "Reply speed has slowed from same-day to over a week."],
        suggestedAction: "Reply today — they're waiting on the cost breakdown you committed to.",
        actionLabel: "Reply today",
        confidence: "high",
        trend: "cooling",
        momentum: "down",
      },
      clients: {
        id: "demo-harbor-vale",
        name: "Harbor & Vale Consulting",
        email_domain: "harborvale.example",
        contract_value: 12000,
        threads: [{ last_message_at: daysAgo(6) }],
        client_intelligence: {
          analyzed_at: daysAgo(1),
          analyzed_through: daysAgo(6),
          summary: harborIntelligence.summary,
          extraction_json: harborIntelligence,
        },
      },
    },
    contactEmail: "priya@harborvale.example",
    analyzedYet: true,
    memory: harborMemory,
    memoryUpdatedAt: daysAgo(1),
    draft: {
      canDraft: true,
      subject: "Itemized breakdown for phase one",
      reason: "References their finance-review timeline concern and your open commitment to send a cost breakdown.",
      recipientEmail: "priya@harborvale.example",
      draft:
        "Hi Priya,\n\nFollowing up with the itemized breakdown for phase one so you can take it to finance — apologies for the delay on this.\n\nGiven the 6-week timeline felt tight on your end, I've also broken deliverables into two milestones so finance can approve in stages rather than all at once, which might help with the internal review process you mentioned.\n\nHappy to hop on a quick call this week if that's easier than email back-and-forth.\n\nBest,\n[Your name]",
    },
  },
  {
    row: {
      health_score: 71,
      dollar_at_risk: null,
      date: daysAgo(0),
      top_reasons_json: {
        reasons: ["Asked a direct question about revision turnaround 4 days ago — still unanswered.", "Mentioned evaluating a competitor."],
        suggestedAction: "Reply today — answer their turnaround question before they decide.",
        actionLabel: "Reply today",
        confidence: "medium",
        trend: "steady",
        momentum: "steady",
      },
      clients: {
        id: "demo-nomi-studio",
        name: "Nomi Studio",
        email_domain: "nomistudio.example",
        contract_value: null,
        threads: [{ last_message_at: daysAgo(4) }],
        client_intelligence: {
          analyzed_at: daysAgo(1),
          analyzed_through: daysAgo(4),
          summary: nomiIntelligence.summary,
          extraction_json: nomiIntelligence,
        },
      },
    },
    contactEmail: "hello@nomistudio.example",
    analyzedYet: true,
    memory: null,
    memoryUpdatedAt: null,
    draft: {
      canDraft: false,
      reason:
        "There's a real open question here (revision turnaround), but no prior thread content about your actual process to draw from — answer their question directly rather than have this generate something generic.",
    },
  },
  {
    row: {
      health_score: 45,
      dollar_at_risk: 900,
      date: daysAgo(0),
      top_reasons_json: {
        reasons: ["11 days since last contact — a routine check-in is overdue."],
        suggestedAction: "Send a quick check-in.",
        actionLabel: "Check in",
        confidence: "medium",
        trend: "steady",
        momentum: "steady",
      },
      clients: {
        id: "demo-bram-photography",
        name: "Bram Photography",
        email_domain: "bramphoto.example",
        contract_value: 2000,
        threads: [{ last_message_at: daysAgo(11) }],
        client_intelligence: {
          analyzed_at: daysAgo(2),
          analyzed_through: daysAgo(11),
          summary: "Bram Photography is happy with the last shoot and open to booking again, just hasn't picked a date.",
          extraction_json: {
            relevant: true,
            summary: "Bram Photography is happy with the last shoot and open to booking again, just hasn't picked a date.",
            objections: [],
            pricing_mentions: [],
            buying_signals: ["\"We'd love to do another session with you this fall.\""],
            hesitation_signals: [],
            competitor_mentions: [],
            open_questions: ["\"What does your availability look like in October?\""],
            commitments: [],
          },
        },
      },
    },
    contactEmail: "studio@bramphoto.example",
    analyzedYet: true,
    memory: bramMemory,
    memoryUpdatedAt: daysAgo(2),
    draft: {
      canDraft: true,
      subject: "October availability",
      reason: "References their open question about fall availability.",
      recipientEmail: "studio@bramphoto.example",
      draft:
        "Hi there,\n\nGreat to hear you're thinking about another session this fall! I've got a few openings in October — mid-month tends to have the best light for outdoor shoots if that works for your schedule.\n\nWant me to send over a couple of specific dates?\n\nBest,\n[Your name]",
    },
  },
  {
    row: {
      health_score: 33,
      dollar_at_risk: null,
      date: daysAgo(0),
      top_reasons_json: {
        reasons: ["9 days since last contact."],
        suggestedAction: "Send a quick check-in.",
        actionLabel: "Check in",
        confidence: "low",
        trend: "steady",
        momentum: "steady",
      },
      clients: {
        id: "demo-kessler-design",
        name: "Kessler Design Co",
        email_domain: "kesslerdesign.example",
        contract_value: null,
        threads: [{ last_message_at: daysAgo(9) }],
        client_intelligence: null,
      },
    },
    contactEmail: "hi@kesslerdesign.example",
    analyzedYet: false,
    memory: null,
    memoryUpdatedAt: null,
    draft: { canDraft: false, reason: "Not analyzed yet in this demo." },
  },
];

// One extra healthy relationship, purely to make the "N other
// relationships look healthy" collapsed line in the demo dashboard
// non-zero, same as a real account would show over time.
export const DEMO_HEALTHY_COUNT = 3;

export function getDemoFixture(id: string): DemoFixture | undefined {
  return DEMO_CLIENTS.find((c) => c.row.clients!.id === id);
}

export type DemoChatAnswer = {
  answer: string;
  referencedClientIds: string[];
};

// Canned Q&A for the public /demo chat — no live Claude call, since this
// route is unauthenticated and would otherwise be an open door to run up
// API costs. Free-text input that doesn't match falls back to a message
// explaining that, same idea as the rest of /demo.
export const DEMO_CHAT_QA: { prompt: string; response: DemoChatAnswer }[] = [
  {
    prompt: "Which client should I prioritize today?",
    response: {
      answer:
        "Harbor & Vale Consulting — highest attention score (82) and it's real money: a $12,000 proposal that's gone quiet for 6 days after they asked a direct pricing question. They're waiting on the itemized breakdown you committed to sending.",
      referencedClientIds: ["demo-harbor-vale"],
    },
  },
  {
    prompt: "Who mentioned pricing recently?",
    response: {
      answer:
        "Harbor & Vale Consulting pushed back on the $12k quote, targeting closer to $9k for phase one. No one else has raised pricing in their recent threads.",
      referencedClientIds: ["demo-harbor-vale"],
    },
  },
  {
    prompt: "Which clients haven't heard from me in a while?",
    response: {
      answer:
        "Two: Bram Photography (11 days since last contact, they're open to booking another session) and Kessler Design Co (9 days, and hasn't been analyzed yet so there's less context on what's going on).",
      referencedClientIds: ["demo-bram-photography", "demo-kessler-design"],
    },
  },
  {
    prompt: "Summarize what's going on with my highest-risk client.",
    response: {
      answer:
        "Harbor & Vale is close to signing but stalled on the proposed timeline and hasn't confirmed budget sign-off from their finance lead, Priya. She needs an itemized cost breakdown to take to finance — that's the one thing standing between here and a closed $12k deal.",
      referencedClientIds: ["demo-harbor-vale"],
    },
  },
];

export const DEMO_CHAT_FALLBACK: DemoChatAnswer = {
  answer:
    "This demo only answers the sample questions below with pre-written responses — no live API call is made here. Connect your own Gmail to ask real questions about your real clients.",
  referencedClientIds: [],
};

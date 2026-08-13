export type TopReasons = {
  reasons: string[];
  suggestedAction: string;
  actionLabel?: string;
  insights?: string[];
  confidence?: "low" | "medium" | "high";
  trend?: "warming" | "steady" | "cooling" | "unknown";
  momentum?: "up" | "down" | "steady";
};

export type ClientIntelligenceExtraction = {
  relevant: boolean;
  summary: string;
  objections: string[];
  pricing_mentions: string[];
  buying_signals: string[];
  hesitation_signals: string[];
  competitor_mentions: string[];
  open_questions: string[];
  commitments: { by: "user" | "client"; text: string; fulfilled: boolean | null }[];
};

export type ClientIntelligenceRow = {
  analyzed_at: string;
  analyzed_through: string;
  summary: string | null;
  extraction_json: ClientIntelligenceExtraction;
};

// Supabase/PostgREST embeds a to-one relation as an object when it detects
// the unique constraint, but as a single-item array in some client/version
// combinations — normalize defensively rather than assume one shape.
export function firstIntelligence(
  value: ClientIntelligenceRow[] | ClientIntelligenceRow | null | undefined
): ClientIntelligenceRow | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export type ScoreRow = {
  health_score: number;
  dollar_at_risk: number | null;
  top_reasons_json: TopReasons | null;
  date: string;
  clients: {
    id: string;
    name: string;
    email_domain: string;
    contract_value: number | null;
    threads: { last_message_at: string | null }[];
    client_intelligence: ClientIntelligenceRow[] | ClientIntelligenceRow | null;
  } | null;
};

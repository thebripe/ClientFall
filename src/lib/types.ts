export type TopReasons = {
  reasons: string[];
  suggestedAction: string;
  actionLabel?: string;
  insights?: string[];
  confidence?: "low" | "medium" | "high";
  trend?: "warming" | "steady" | "cooling" | "unknown";
  momentum?: "up" | "down" | "steady";
};

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
  } | null;
};

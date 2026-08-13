import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractPlainText, getThreadFull, refreshGoogleAccessToken } from "@/lib/google/gmail";
import { draftFollowUp } from "@/lib/ai/draft-followup";
import type { ClientIntelligenceExtraction, TopReasons } from "@/lib/types";

export async function POST(request: Request) {
  const { clientId } = (await request.json()) as { clientId?: string };
  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { data: score } = await supabase
    .from("scores_daily")
    .select("top_reasons_json")
    .eq("client_id", clientId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: intelligence } = await supabase
    .from("client_intelligence")
    .select("extraction_json")
    .eq("client_id", clientId)
    .maybeSingle();

  const { data: lastThread } = await supabase
    .from("threads")
    .select("gmail_thread_id, last_message_subject")
    .eq("client_id", clientId)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastThread) {
    return NextResponse.json({
      canDraft: false,
      reason: "No email history for this client yet — sync Gmail first.",
      subject: "",
      draft: "",
    });
  }

  const { data: tokenRow } = await supabase
    .from("google_tokens")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!tokenRow?.refresh_token) {
    return NextResponse.json({ error: "Gmail is not connected for this account" }, { status: 400 });
  }

  let accessToken: string;
  try {
    accessToken = await refreshGoogleAccessToken(tokenRow.refresh_token);
  } catch (err) {
    return NextResponse.json(
      { error: `Could not refresh Google access token: ${(err as Error).message}` },
      { status: 502 }
    );
  }

  const fullThread = await getThreadFull(accessToken, lastThread.gmail_thread_id);
  const lastMessage = fullThread.messages[fullThread.messages.length - 1];
  const lastThreadText = lastMessage ? extractPlainText(lastMessage) : "";

  const topReasons = score?.top_reasons_json as TopReasons | null;
  const extraction = (intelligence?.extraction_json as ClientIntelligenceExtraction | null) ?? null;

  const result = await draftFollowUp({
    clientName: client.name,
    urgencyReason: topReasons?.reasons?.[0] ?? "No specific urgency reason on file.",
    suggestedAction: topReasons?.suggestedAction ?? "Follow up.",
    extraction,
    lastThreadSubject: lastThread.last_message_subject ?? "(no subject)",
    lastThreadText,
  });

  if (!result) {
    return NextResponse.json(
      { error: "Claude declined to generate a draft for this conversation." },
      { status: 502 }
    );
  }

  return NextResponse.json(result);
}

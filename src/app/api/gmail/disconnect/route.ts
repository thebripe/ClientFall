import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revokeGoogleToken } from "@/lib/google/gmail";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: tokenRow } = await supabase
    .from("google_tokens")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (tokenRow?.refresh_token) {
    await revokeGoogleToken(tokenRow.refresh_token);
  }

  const { error } = await supabase.from("google_tokens").delete().eq("user_id", user.id);
  if (error) {
    console.error("Failed to delete google_tokens row:", error.message);
    return NextResponse.json({ error: "Could not disconnect Gmail" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

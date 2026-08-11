import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google redirects here after the user approves (or denies) Gmail
// read-only access. We exchange the auth code for a Supabase session,
// then persist the Google access/refresh tokens so a future backend job
// (the weekly digest cron) can read Gmail without the user present.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session || !data.user) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  const { session, user } = data;

  await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email,
    },
    { onConflict: "id" }
  );

  // provider_refresh_token is only ever returned on the first consent —
  // Supabase does not persist or refresh it for us, so we store it now.
  if (session.provider_token || session.provider_refresh_token) {
    await supabase.from("google_tokens").upsert(
      {
        user_id: user.id,
        access_token: session.provider_token ?? null,
        refresh_token: session.provider_refresh_token ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}

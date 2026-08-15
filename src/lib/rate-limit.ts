import type { SupabaseClient } from "@supabase/supabase-js";

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

// Counts this user's events for `route` in the trailing window and denies
// the call if it's already at the cap. Deliberately fails open (allows
// the call) if the count query itself errors — a rate limiter that can
// take the whole app down on a transient DB hiccup is worse than one
// that occasionally lets an extra call through.
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  route: string,
  { max, windowMinutes }: { max: number; windowMinutes: number }
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - windowMinutes * 60_000);

  const { count, error } = await supabase
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("route", route)
    .gte("created_at", windowStart.toISOString());

  if (error) {
    console.error(`Rate limit check failed for ${route}:`, error.message);
    return { allowed: true };
  }

  if ((count ?? 0) >= max) {
    return { allowed: false, retryAfterSeconds: windowMinutes * 60 };
  }

  await supabase.from("rate_limit_events").insert({ user_id: userId, route });
  return { allowed: true };
}

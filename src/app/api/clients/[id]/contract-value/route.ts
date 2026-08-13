import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/clients/[id]/contract-value">
) {
  const { id } = await ctx.params;
  const body = await request.json();
  const contractValue =
    typeof body.contract_value === "number" && body.contract_value >= 0
      ? body.contract_value
      : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // RLS already scopes this to the signed-in user's own clients; the
  // explicit user_id check just makes a mismatched id fail loudly.
  const { error } = await supabase
    .from("clients")
    .update({ contract_value: contractValue })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, contract_value: contractValue });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const IdSchema = z.string().uuid();
const BodySchema = z.object({ contract_value: z.number().min(0).nullable() });

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/clients/[id]/contract-value">
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const parsedId = IdSchema.safeParse(id);
  const parsedBody = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsedId.success || !parsedBody.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const contractValue = parsedBody.data.contract_value;

  // RLS already scopes this to the signed-in user's own clients; the
  // explicit user_id check just makes a mismatched id fail loudly.
  const { error } = await supabase
    .from("clients")
    .update({ contract_value: contractValue })
    .eq("id", parsedId.data)
    .eq("user_id", user.id);

  if (error) {
    console.error("contract_value update failed:", error.message);
    return NextResponse.json({ error: "Could not update contract value" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, contract_value: contractValue });
}

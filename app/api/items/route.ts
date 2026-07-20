import { createItemSchema } from "@/lib/contracts";
import { apiErrorResponse, requireUser } from "@/lib/api/auth";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const input = createItemSchema.parse(await request.json());
    const idempotencyKey = z.string().uuid().parse(request.headers.get("idempotency-key"));
    const itemName = input.itemName?.trim() || "";
    const brand = input.brand?.trim() || null;
    const searchHint = input.searchHint?.trim() || null;
    const notes = input.notes?.trim() || "";
    const { data: existing } = await supabase.from("items").select("id").eq("owner_id", user.id).eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing) return Response.json({ itemId: existing.id });
    const { data, error } = await supabase
      .from("items")
      .insert({
        owner_id: user.id,
        slug: `ritrovamento-${crypto.randomUUID().slice(0, 8)}`,
        title: itemName || "Nuovo ritrovamento",
        category: input.category,
        brand,
        asking_price_cents: Math.round(input.askingPrice * 100),
        extra_costs_cents: Math.round(input.extraCosts * 100),
        attributes: {
          notes,
          itemName,
          brand,
          searchHint,
        },
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();
    if (error) throw error;
    return Response.json({ itemId: data.id }, { status: 201 });
  } catch (cause) {
    return apiErrorResponse(cause);
  }
}

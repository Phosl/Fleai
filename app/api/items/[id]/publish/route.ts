import { z } from "zod";
import { after } from "next/server";
import { publishItemSchema } from "@/lib/contracts";
import { apiErrorResponse, requireUser } from "@/lib/api/auth";
import { requireOwnedItem } from "@/lib/api/ownership";
import { publishItem } from "@/lib/items/publication";
import { notifyIndexNow } from "@/lib/seo/indexnow";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await requireUser();
    z.string().uuid().parse(request.headers.get("idempotency-key"));
    const { id } = await context.params;
    const input = publishItemSchema.parse(await request.json());
    const item = await requireOwnedItem(supabase, user.id, id);
    const result = await publishItem({
      ownerId: user.id,
      itemId: item.id,
      title: input.title,
      description: input.description,
      condition: input.condition,
      defects: input.defects,
      price: input.price,
      approvedMediaIds: input.approvedMediaIds,
    });

    if (result.shopSlug) {
      after(() =>
        notifyIndexNow([
          `/s/${result.shopSlug}`,
          `/s/${result.shopSlug}/${result.slug}`,
        ]),
      );
    }

    return Response.json(result);
  } catch (cause) {
    return apiErrorResponse(cause);
  }
}

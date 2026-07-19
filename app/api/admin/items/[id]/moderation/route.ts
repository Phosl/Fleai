import { z } from "zod";
import { requireAdmin } from "@/lib/api/auth";
import { moderateAdminItem } from "@/lib/admin/actions";
import { adminApiErrorResponse, adminIdempotencyKey } from "@/lib/admin/http";
import { adminItemModerationSchema } from "@/lib/contracts";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAdmin();
    const itemId = z.string().uuid().parse((await context.params).id);
    const input = adminItemModerationSchema.parse(await request.json());
    const result = await moderateAdminItem({
      actorId: user.id,
      itemId,
      idempotencyKey: adminIdempotencyKey(request),
      decision: input.decision,
      reason: input.reason,
    });
    return Response.json(result);
  } catch (cause) {
    return adminApiErrorResponse(cause);
  }
}

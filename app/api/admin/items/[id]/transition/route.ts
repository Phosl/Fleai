import { z } from "zod";
import { requireAdmin } from "@/lib/api/auth";
import { transitionAdminItem } from "@/lib/admin/actions";
import { adminApiErrorResponse, adminIdempotencyKey } from "@/lib/admin/http";
import { adminItemTransitionSchema } from "@/lib/contracts";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAdmin();
    const itemId = z.string().uuid().parse((await context.params).id);
    const input = adminItemTransitionSchema.parse(await request.json());
    const result = await transitionAdminItem({
      actorId: user.id,
      itemId,
      idempotencyKey: adminIdempotencyKey(request),
      status: input.status,
      approvedMediaIds: input.approvedMediaIds,
      reason: input.reason,
    });
    return Response.json(result);
  } catch (cause) {
    return adminApiErrorResponse(cause);
  }
}

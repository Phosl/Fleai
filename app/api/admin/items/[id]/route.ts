import { z } from "zod";
import { requireAdmin } from "@/lib/api/auth";
import { updateAdminItem } from "@/lib/admin/actions";
import { adminApiErrorResponse, adminIdempotencyKey } from "@/lib/admin/http";
import { adminItemUpdateSchema } from "@/lib/contracts";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAdmin();
    const itemId = z.string().uuid().parse((await context.params).id);
    const values = adminItemUpdateSchema.parse(await request.json());
    const result = await updateAdminItem({
      actorId: user.id,
      itemId,
      idempotencyKey: adminIdempotencyKey(request),
      values,
    });
    return Response.json(result);
  } catch (cause) {
    return adminApiErrorResponse(cause);
  }
}

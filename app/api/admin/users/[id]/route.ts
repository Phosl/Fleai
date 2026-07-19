import { z } from "zod";
import { requireAdmin } from "@/lib/api/auth";
import { updateAdminUser } from "@/lib/admin/actions";
import { adminApiErrorResponse, adminIdempotencyKey } from "@/lib/admin/http";
import { adminUserUpdateSchema } from "@/lib/contracts";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAdmin();
    const targetId = z.string().uuid().parse((await context.params).id);
    const values = adminUserUpdateSchema.parse(await request.json());
    const result = await updateAdminUser({
      actorId: user.id,
      targetId,
      idempotencyKey: adminIdempotencyKey(request),
      values,
    });
    return Response.json(result);
  } catch (cause) {
    return adminApiErrorResponse(cause);
  }
}

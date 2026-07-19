import { z } from "zod";
import { requireAdmin } from "@/lib/api/auth";
import { setAdminUserSuspension } from "@/lib/admin/actions";
import { adminApiErrorResponse, adminIdempotencyKey } from "@/lib/admin/http";
import { adminUserSuspensionSchema } from "@/lib/contracts";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireAdmin();
    const targetId = z.string().uuid().parse((await context.params).id);
    const input = adminUserSuspensionSchema.parse(await request.json());
    const result = await setAdminUserSuspension({
      actorId: user.id,
      targetId,
      idempotencyKey: adminIdempotencyKey(request),
      suspended: input.suspended,
      reason: input.reason,
    });
    return Response.json(result);
  } catch (cause) {
    return adminApiErrorResponse(cause);
  }
}

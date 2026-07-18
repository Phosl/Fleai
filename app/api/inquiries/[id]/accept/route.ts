import { apiErrorResponse, requireUser } from "@/lib/api/auth";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await requireUser();
    const { id } = await context.params;
    const { data: current, error: currentError } = await supabase.from("inquiries").select("status").eq("id", id).eq("seller_id", user.id).maybeSingle();
    if (currentError) throw currentError;
    if (current?.status === "accepted") return Response.json({ status: "accepted" });
    const { error } = await supabase.rpc("accept_inquiry", { inquiry_id: id });
    if (error) throw error;
    return Response.json({ status: "accepted" });
  } catch (cause) {
    return apiErrorResponse(cause);
  }
}

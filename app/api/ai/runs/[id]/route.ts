import { apiErrorResponse, requireUser } from "@/lib/api/auth";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await requireUser();
    const { id } = await context.params;
    const { data, error } = await supabase
      .from("analysis_runs")
      .select("id,item_id,kind,status,progress,error_code,attempt_count,result,updated_at")
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: "RUN_NOT_FOUND" }, { status: 404 });
    let reportId: string | null = null;
    if (data.kind === "hunting_report" && data.status === "completed") {
      const { data: report } = await supabase.from("hunting_reports").select("id").eq("run_id", data.id).maybeSingle();
      reportId = report?.id ?? null;
    }
    return Response.json({ ...data, reportId });
  } catch (cause) {
    return apiErrorResponse(cause);
  }
}

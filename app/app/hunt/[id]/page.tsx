import { notFound } from "next/navigation";
import { HuntingReportView } from "@/components/hunting-report-view";
import { huntingReportSchema } from "@/lib/contracts";
import { createClient } from "@/lib/supabase/server";

export default async function HuntingReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data } = await supabase.from("hunting_reports").select("item_id,report").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!data) notFound();
  const report = huntingReportSchema.safeParse(data.report);
  if (!report.success) notFound();
  return <><div className="page-head"><div><span className="eyebrow">Flea Market Hunting</span><p>Report privato · dati di costo non pubblicati</p></div></div><HuntingReportView report={report.data} itemId={data.item_id} /></>;
}

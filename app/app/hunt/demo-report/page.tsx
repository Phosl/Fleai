import { HuntingReportView } from "@/components/hunting-report-view";
import { demoReport } from "@/lib/demo-data";

export default function DemoReportPage() {
  return <><div className="page-head"><div><span className="eyebrow">Flea Market Hunting</span><p>Analisi demo · fonti illustrate</p></div></div><HuntingReportView report={demoReport} /></>;
}

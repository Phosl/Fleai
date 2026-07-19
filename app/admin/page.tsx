import Link from "next/link";
import { AlertTriangle, Boxes, ShieldBan, Users } from "lucide-react";
import { Notice } from "@/components/notice";
import { getAdminOverview, loadAdminData } from "@/lib/admin/data";

export default async function AdminOverviewPage() {
  const loaded = await loadAdminData(getAdminOverview);
  if (!loaded.ok) return <><div className="page-head"><div><span className="eyebrow">Controllo globale</span><h1 className="title">SUPER ADMIN.</h1></div></div><Notice tone="warning">{loaded.message}</Notice></>;
  const stats = loaded.data;
  return <><div className="page-head"><div><span className="eyebrow">Controllo globale</span><h1 className="title">SUPER ADMIN.</h1><p>Utenti, moderazione e salute delle lavorazioni Fleai.</p></div></div><div className="stat-grid"><AdminStat icon={<Users size={19} />} value={stats.users} label="Utenti" /><AdminStat icon={<ShieldBan size={19} />} value={stats.suspended} label="Sospesi" tone="coral" /><AdminStat icon={<Boxes size={19} />} value={stats.items} label="Oggetti" tone="lime" /><AdminStat icon={<AlertTriangle size={19} />} value={stats.pending} label="Da moderare" tone="sky" /></div><div className="dashboard-grid"><section className="panel"><div className="panel-head"><h2>Azioni rapide</h2></div><div className="quick-actions"><Link className="quick-action" href="/admin/users"><span className="quick-action-icon"><Users size={20} /></span><span><strong>Gestisci utenti</strong><small className="muted">Quote, utilizzo e sospensioni</small></span></Link><Link className="quick-action" href="/admin/items?moderation=pending"><span className="quick-action-icon"><Boxes size={20} /></span><span><strong>Controlla oggetti</strong><small className="muted">{stats.pending} in attesa di revisione</small></span></Link></div></section><aside className="panel"><div className="panel-head"><h2>Run falliti</h2></div><strong className="admin-large-number">{stats.failedRuns}</strong><p className="muted">Nelle ultime 24 ore</p><Link className="button button-ghost button-sm" href="/admin/items">Apri inventario</Link></aside></div></>;
}

function AdminStat({ icon, value, label, tone = "violet" }: { icon: React.ReactNode; value: number; label: string; tone?: "violet" | "coral" | "lime" | "sky" }) {
  const backgrounds = { violet: "var(--violet)", coral: "var(--coral)", lime: "var(--lime)", sky: "var(--sky)" };
  return <div className="stat-card"><div className="stat-card-icon" style={{ background: backgrounds[tone] }}>{icon}</div><strong>{value}</strong><span>{label}</span></div>;
}

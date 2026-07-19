import Link from "next/link";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Notice } from "@/components/notice";
import { adminPage, listAdminAudit, loadAdminData } from "@/lib/admin/data";
import { formatDate } from "@/lib/format";

type Params = { target?: string; action?: string; page?: string };

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  const targetType = raw.target === "user" || raw.target === "item" ? raw.target : undefined;
  const action = raw.action?.trim().slice(0, 80) || undefined;
  const page = adminPage(raw.page);
  const loaded = await loadAdminData(() => listAdminAudit({ targetType, action, page }));
  if (!loaded.ok) return <><div className="page-head"><div><span className="eyebrow">Sicurezza</span><h1 className="title">AUDIT.</h1></div></div><Notice tone="warning">{loaded.message}</Notice></>;
  const result = loaded.data;
  return <><div className="page-head"><div><span className="eyebrow">Sicurezza</span><h1 className="title">AUDIT.</h1><p>{result.total} azioni amministrative, immutabili dal pannello.</p></div></div><form className="admin-filters" action="/admin/audit"><div className="field admin-search"><label htmlFor="admin-audit-action">Azione</label><input id="admin-audit-action" name="action" className="input" defaultValue={action ?? ""} placeholder="es. item.moderation" /></div><div className="field"><label htmlFor="admin-audit-target">Target</label><select id="admin-audit-target" name="target" className="select" defaultValue={targetType ?? "all"}><option value="all">Tutti</option><option value="user">Utenti</option><option value="item">Oggetti</option></select></div><button className="button button-coral">Filtra</button></form><section className="panel admin-table-panel">{result.rows.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Azione</th><th>Amministratore</th><th>Target</th><th>Motivazione</th><th>Data</th></tr></thead><tbody>{result.rows.map((row) => <tr key={row.id}><td data-label="Azione"><strong>{row.action}</strong></td><td data-label="Amministratore">{row.actorEmail}</td><td data-label="Target"><Link href={`/admin/${row.target_type === "user" ? "users" : "items"}/${row.target_id}`}>{row.target_type} · {row.target_id.slice(0, 8)}</Link></td><td data-label="Motivazione">{row.reason}</td><td data-label="Data">{formatDate(row.created_at)}</td></tr>)}</tbody></table></div> : <p className="muted">Nessuna azione corrisponde ai filtri.</p>}</section><AdminPagination page={page} total={result.total} pageSize={result.pageSize} basePath="/admin/audit" params={{ target: targetType, action }} /></>;
}

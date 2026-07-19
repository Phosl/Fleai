import Link from "next/link";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Notice } from "@/components/notice";
import { adminPage, listAdminUsers, loadAdminData } from "@/lib/admin/data";
import { formatDate } from "@/lib/format";

type Params = { q?: string; status?: string; sort?: string; page?: string };
const statuses = new Set(["all", "active", "suspended"]);
const sorts = new Set(["newest", "oldest", "last_sign_in"]);

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  const query = raw.q?.trim().slice(0, 120) ?? "";
  const status = statuses.has(raw.status ?? "") ? raw.status! : "all";
  const sort = sorts.has(raw.sort ?? "") ? raw.sort! : "newest";
  const page = adminPage(raw.page);
  const loaded = await loadAdminData(() => listAdminUsers({ query, status, sort, page }));
  if (!loaded.ok) return <><div className="page-head"><div><span className="eyebrow">Super Admin</span><h1 className="title">UTENTI.</h1></div></div><Notice tone="warning">{loaded.message}</Notice></>;
  const result = loaded.data;
  return <><div className="page-head"><div><span className="eyebrow">Super Admin</span><h1 className="title">UTENTI.</h1><p>{result.total} account trovati. Email e attività sono visibili solo qui.</p></div></div><form className="admin-filters" action="/admin/users"><div className="field admin-search"><label htmlFor="admin-user-search">Cerca</label><input id="admin-user-search" name="q" className="input" defaultValue={query} placeholder="Email, nome o UUID" /></div><div className="field"><label htmlFor="admin-user-status">Stato</label><select id="admin-user-status" name="status" className="select" defaultValue={status}><option value="all">Tutti</option><option value="active">Attivi</option><option value="suspended">Sospesi</option></select></div><div className="field"><label htmlFor="admin-user-sort">Ordina</label><select id="admin-user-sort" name="sort" className="select" defaultValue={sort}><option value="newest">Più recenti</option><option value="oldest">Meno recenti</option><option value="last_sign_in">Ultimo accesso</option></select></div><button className="button button-coral">Filtra</button></form><section className="panel admin-table-panel">{result.rows.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Utente</th><th>Stato</th><th>Utilizzo</th><th>Oggetti</th><th>Iscritto</th><th><span className="sr-only">Apri</span></th></tr></thead><tbody>{result.rows.map((row) => <tr key={row.user_id}><td data-label="Utente"><strong>{row.display_name || "Senza nome"}</strong><small>{row.email}</small></td><td data-label="Stato"><span className={`status-pill ${row.suspended_at ? "admin-status-blocked" : "status-live"}`}>{row.suspended_at ? "Sospeso" : "Attivo"}</span></td><td data-label="Utilizzo"><span>{row.hunting_used}/{row.hunting_limit_override ?? 5} Hunting</span><small>{row.shop_used}/{row.shop_limit_override ?? 3} Shop</small></td><td data-label="Oggetti">{row.item_count}</td><td data-label="Iscritto">{formatDate(row.created_at)}</td><td><Link className="button button-ghost button-sm" href={`/admin/users/${row.user_id}`}>Apri</Link></td></tr>)}</tbody></table></div> : <p className="muted">Nessun utente corrisponde ai filtri.</p>}</section><AdminPagination page={page} total={result.total} pageSize={result.pageSize} basePath="/admin/users" params={{ q: query, status, sort }} /></>;
}

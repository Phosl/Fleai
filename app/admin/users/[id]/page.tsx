import Link from "next/link";
import { notFound } from "next/navigation";
import { UserAdminControls } from "@/components/admin/user-admin-controls";
import { Notice } from "@/components/notice";
import { getAdminUserDetail, loadAdminData } from "@/lib/admin/data";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadAdminData(() => getAdminUserDetail(id));
  if (!loaded.ok) return <Notice tone="warning">{loaded.message}</Notice>;
  const detail = loaded.data;
  if (!detail) notFound();
    const { auth, profile, shop, items, audit } = detail;
    const providerNames = auth.app_metadata?.providers;
  return <><div className="page-head"><div><span className="eyebrow">Utente</span><h1 className="title">{profile.display_name || "SENZA NOME"}.</h1><p>{auth.email} · creato il {formatDate(auth.created_at)}</p></div><span className={`status-pill ${profile.suspended_at ? "admin-status-blocked" : "status-live"}`}>{profile.suspended_at ? "Sospeso" : "Attivo"}</span></div><div className="admin-detail-grid"><div className="admin-detail-main"><section className="panel"><div className="panel-head"><h2>Account</h2><Link className="button button-ghost button-sm" href={`/admin/items?owner=${id}`}>Tutti gli oggetti</Link></div><dl className="admin-definition-list"><div><dt>Email</dt><dd>{auth.email}</dd></div><div><dt>Provider</dt><dd>{Array.isArray(providerNames) ? providerNames.join(", ") : auth.app_metadata?.provider ?? "email"}</dd></div><div><dt>Ultimo accesso</dt><dd>{auth.last_sign_in_at ? formatDate(auth.last_sign_in_at) : "Mai"}</dd></div><div><dt>Shop</dt><dd>{shop ? `${shop.name} · ${shop.is_published ? "pubblico" : "privato"}` : "Non creato"}</dd></div><div><dt>Quota mensile</dt><dd>{detail.huntingUsed}/{profile.hunting_limit_override ?? 5} Hunting · {detail.shopUsed}/{profile.shop_limit_override ?? 3} Shop</dd></div></dl></section><section className="panel"><div className="panel-head"><h2>Oggetti recenti</h2><span>{items.length}</span></div>{items.length ? <div className="admin-compact-list">{items.map((item) => <Link key={item.id} href={`/admin/items/${item.id}`}><span><strong>{item.title || "Oggetto senza titolo"}</strong><small>{item.status} · {item.moderation_status}</small></span><span>{item.price_cents === null ? "—" : formatCurrency(item.price_cents / 100)}</span></Link>)}</div> : <p className="muted">Nessun oggetto.</p>}</section><section className="panel"><div className="panel-head"><h2>Audit recente</h2><Link className="button button-ghost button-sm" href="/admin/audit?target=user">Audit completo</Link></div>{audit.length ? <div className="admin-timeline">{audit.map((entry) => <article key={entry.id}><strong>{entry.action}</strong><p>{entry.reason}</p><small>{formatDate(entry.created_at)}</small></article>)}</div> : <p className="muted">Nessuna azione amministrativa.</p>}</section></div><aside><UserAdminControls userId={id} profile={profile} /></aside></div></>;
}

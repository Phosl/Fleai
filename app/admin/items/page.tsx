import Link from "next/link";
import { z } from "zod";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Notice } from "@/components/notice";
import { adminPage, listAdminItems, loadAdminData } from "@/lib/admin/data";
import { categoryLabel, itemCategoryOptions, itemStatusLabel, moderationLabel } from "@/lib/items/labels";
import { ITEM_CATEGORIES } from "@/lib/contracts";
import type { ItemStatus, ModerationStatus } from "@/lib/contracts";
import { formatCurrency, formatDate } from "@/lib/format";

type Params = { q?: string; owner?: string; status?: string; moderation?: string; category?: string; sort?: string; page?: string };
const statuses = new Set(["all", "draft", "published", "reserved", "sold", "archived"]);
const moderationStatuses = new Set(["all", "pending", "approved", "blocked"]);
const categories = new Set(["all", ...ITEM_CATEGORIES]);
const sorts = new Set(["newest", "oldest", "price_high", "price_low"]);

export default async function AdminItemsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  const query = raw.q?.trim().slice(0, 120) ?? "";
  const ownerId = z.string().uuid().safeParse(raw.owner).success ? raw.owner : undefined;
  const status = statuses.has(raw.status ?? "") ? raw.status! : "all";
  const moderation = moderationStatuses.has(raw.moderation ?? "") ? raw.moderation! : "all";
  const category = categories.has(raw.category ?? "") ? raw.category! : "all";
  const sort = sorts.has(raw.sort ?? "") ? raw.sort! : "newest";
  const page = adminPage(raw.page);
  const loaded = await loadAdminData(() => listAdminItems({ query, ownerId, status, moderation, category, sort, page }));
  if (!loaded.ok) return <><div className="page-head"><div><span className="eyebrow">Super Admin</span><h1 className="title">OGGETTI.</h1></div></div><Notice tone="warning">{loaded.message}</Notice></>;
  const result = loaded.data;
  return <><div className="page-head"><div><span className="eyebrow">Super Admin</span><h1 className="title">OGGETTI.</h1><p>{result.total} elementi fra Hunting, bozze e annunci.</p></div></div><form className="admin-filters admin-filters-wide" action="/admin/items"><div className="field admin-search"><label htmlFor="admin-item-search">Cerca</label><input id="admin-item-search" name="q" className="input" defaultValue={query} placeholder="Titolo, marca, email o UUID" /></div>{ownerId && <input type="hidden" name="owner" value={ownerId} />}<div className="field"><label htmlFor="admin-item-status">Stato</label><select id="admin-item-status" name="status" className="select" defaultValue={status}><option value="all">Tutti</option>{["draft", "published", "reserved", "sold", "archived"].map((value) => <option value={value} key={value}>{itemStatusLabel[value as ItemStatus]}</option>)}</select></div><div className="field"><label htmlFor="admin-item-moderation">Moderazione</label><select id="admin-item-moderation" name="moderation" className="select" defaultValue={moderation}><option value="all">Tutte</option>{["pending", "approved", "blocked"].map((value) => <option value={value} key={value}>{moderationLabel[value as ModerationStatus]}</option>)}</select></div><div className="field"><label htmlFor="admin-item-category">Categoria</label><select id="admin-item-category" name="category" className="select" defaultValue={category}><option value="all">Tutte</option>{itemCategoryOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></div><div className="field"><label htmlFor="admin-item-sort">Ordina</label><select id="admin-item-sort" name="sort" className="select" defaultValue={sort}><option value="newest">Più recenti</option><option value="oldest">Meno recenti</option><option value="price_high">Prezzo più alto</option><option value="price_low">Prezzo più basso</option></select></div><button className="button button-coral">Filtra</button></form>{ownerId && <Notice>Filtro proprietario attivo. <Link href="/admin/items">Mostra tutti gli oggetti</Link>.</Notice>}<section className="panel admin-table-panel"><div className="admin-table-wrap">{result.rows.length ? <table className="admin-table"><thead><tr><th>Oggetto</th><th>Proprietario</th><th>Stato</th><th>Moderazione</th><th>Media / run</th><th>Creato</th><th><span className="sr-only">Apri</span></th></tr></thead><tbody>{result.rows.map((row) => <tr key={row.item_id}><td data-label="Oggetto"><strong>{row.title || "Senza titolo"}</strong><small>{categoryLabel[row.category]} · {row.price_cents === null ? "—" : formatCurrency(row.price_cents / 100)}</small></td><td data-label="Proprietario"><strong>{row.owner_name}</strong><small>{row.owner_email}</small></td><td data-label="Stato"><span className="status-pill">{itemStatusLabel[row.status]}</span></td><td data-label="Moderazione"><span className={`status-pill admin-moderation-${row.moderation_status}`}>{moderationLabel[row.moderation_status]}</span></td><td data-label="Media / run">{row.media_count} / {row.run_count}</td><td data-label="Creato">{formatDate(row.created_at)}</td><td><Link className="button button-ghost button-sm" href={`/admin/items/${row.item_id}`}>Apri</Link></td></tr>)}</tbody></table> : <p className="muted">Nessun oggetto corrisponde ai filtri.</p>}</div></section><AdminPagination page={page} total={result.total} pageSize={result.pageSize} basePath="/admin/items" params={{ q: query, owner: ownerId, status, moderation, category, sort }} /></>;
}

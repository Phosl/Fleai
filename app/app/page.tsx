import Link from "next/link";
import { ArrowRight, Camera, CircleDollarSign, Inbox, Package, Plus, Sparkles, Store } from "lucide-react";
import { ItemCard } from "@/components/item-card";
import { StatusPill } from "@/components/status-pill";
import { demoInquiries, demoItems } from "@/lib/demo-data";
import { HUNTING_MONTHLY_LIMIT, SHOP_MONTHLY_LIMIT } from "@/lib/contracts";
import { isDemoMode } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";

type DashboardData = {
  total: number; live: number; value: number; open: number;
  huntingUsed: number; huntingLimit: number; shopUsed: number; shopLimit: number;
  items: Array<{ id: string; slug: string; title: string; price: number; image: string; category: string; ai: boolean; href: string }>;
  latestInquiry?: { item: string; message: string };
};

const demoData: DashboardData = {
  total: 12, live: 7, value: 624, open: 2, huntingUsed: 0, huntingLimit: 5, shopUsed: 0, shopLimit: 3,
  items: demoItems.map((item) => ({ ...item, ai: item.ai, href: item.id === demoItems[0].id ? "/app/hunt/demo-report" : "/app/items/new" })),
  latestInquiry: demoInquiries[0],
};

async function getDashboardData(): Promise<DashboardData> {
  if (isDemoMode) return demoData;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return demoData;
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const [{ data: allItems }, { data: usage }, { data: profile }, { data: inquiries }] = await Promise.all([
    supabase.from("items").select("id,slug,title,price_cents,category,status,selected_report_id").eq("owner_id", user.id).order("created_at", { ascending: false }),
    supabase.from("usage_events").select("operation,units").eq("owner_id", user.id).gte("occurred_at", monthStart),
    supabase.from("profiles").select("hunting_limit_override,shop_limit_override").eq("id", user.id).maybeSingle(),
    supabase.from("inquiries").select("listing_id,message,status").eq("seller_id", user.id).in("status", ["new", "contacted"]).order("created_at", { ascending: false }),
  ]);
  const recent = (allItems ?? []).slice(0, 3);
  const recentIds = recent.map((item) => item.id);
  const { data: assets } = recentIds.length ? await supabase.from("media_assets").select("item_id,bucket_id,storage_path,ai_generated").eq("owner_id", user.id).in("item_id", recentIds).order("sort_order") : { data: [] };
  const items = await Promise.all(recent.map(async (item) => {
    const asset = assets?.find((candidate) => candidate.item_id === item.id && !candidate.ai_generated) ?? assets?.find((candidate) => candidate.item_id === item.id);
    let image = "/demo-chair.svg";
    if (asset?.bucket_id === "listing-media-public") image = supabase.storage.from(asset.bucket_id).getPublicUrl(asset.storage_path).data.publicUrl;
    else if (asset) image = (await supabase.storage.from(asset.bucket_id).createSignedUrl(asset.storage_path, 3600)).data?.signedUrl ?? image;
    return { id: item.id, slug: item.slug, title: item.title || "Oggetto in analisi", price: (item.price_cents ?? 0) / 100, image, category: item.category, ai: asset?.ai_generated ?? false, href: item.selected_report_id ? `/app/hunt/${item.selected_report_id}` : `/app/items/new?item=${item.id}` };
  }));
  const latestInquiry = inquiries?.[0];
  const latestItem = latestInquiry ? allItems?.find((item) => item.id === latestInquiry.listing_id) : undefined;
  return {
    total: allItems?.length ?? 0,
    live: allItems?.filter((item) => item.status === "published" || item.status === "reserved").length ?? 0,
    value: (allItems ?? []).filter((item) => item.status === "published" || item.status === "reserved").reduce((sum, item) => sum + (item.price_cents ?? 0), 0) / 100,
    open: inquiries?.length ?? 0,
    huntingUsed: usage?.filter((event) => event.operation === "hunting_report").reduce((sum, event) => sum + event.units, 0) ?? 0,
    huntingLimit: profile?.hunting_limit_override ?? HUNTING_MONTHLY_LIMIT,
    shopUsed: usage?.filter((event) => event.operation === "shop_pack").reduce((sum, event) => sum + event.units, 0) ?? 0,
    shopLimit: profile?.shop_limit_override ?? SHOP_MONTHLY_LIMIT,
    items,
    latestInquiry: latestInquiry ? { item: latestItem?.title ?? "Oggetto", message: latestInquiry.message } : undefined,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  return <><div className="page-head"><div><span className="eyebrow">Panoramica</span><h1 className="title">BUON RITROVAMENTO.</h1><p>Il tuo inventario, dalla prima foto alla prenotazione.</p></div><Link className="button button-coral" href="/app/hunt/new"><Camera size={18} /> Nuova ricerca</Link></div><div className="stat-grid"><div className="stat-card"><div className="stat-card-icon"><Package size={19} /></div><strong>{data.total}</strong><span>Oggetti totali</span></div><div className="stat-card"><div className="stat-card-icon" style={{ background: "var(--lime)" }}><Store size={19} /></div><strong>{data.live}</strong><span>In vetrina</span></div><div className="stat-card"><div className="stat-card-icon" style={{ background: "var(--sky)" }}><CircleDollarSign size={19} /></div><strong>€{Math.round(data.value)}</strong><span>Valore pubblicato</span></div><div className="stat-card"><div className="stat-card-icon" style={{ background: "#fff0bd" }}><Inbox size={19} /></div><strong>{data.open}</strong><span>Richieste aperte</span></div></div><div className="dashboard-grid"><section className="panel"><div className="panel-head"><h2>Oggetti recenti</h2><Link href="/app/shop" className="button button-ghost button-sm">Vedi tutti <ArrowRight size={14} /></Link></div>{data.items.length ? <div className="item-grid">{data.items.map((item) => <ItemCard key={item.id} item={item} href={item.href} />)}</div> : <p className="muted">Nessun oggetto: il prossimo mercatino è un buon inizio.</p>}</section><div style={{ display: "grid", gap: 16, alignContent: "start" }}><section className="panel"><div className="panel-head"><h2>Azioni rapide</h2></div><div className="quick-actions"><Link className="quick-action" href="/app/hunt/new"><span className="quick-action-icon"><Camera size={20} /></span><span><strong>Analizza un oggetto</strong><small className="muted" style={{ display: "block" }}>{Math.max(0, data.huntingLimit - data.huntingUsed)} report rimasti</small></span></Link><Link className="quick-action" href="/app/items/new"><span className="quick-action-icon" style={{ background: "var(--coral)", color: "var(--ink)" }}><Plus size={20} /></span><span><strong>Crea una scheda</strong><small className="muted" style={{ display: "block" }}>{Math.max(0, data.shopLimit - data.shopUsed)} pack rimasti</small></span></Link></div></section><section className="panel"><div className="panel-head"><h2>Quota beta</h2><Sparkles size={18} /></div><div style={{ display: "grid", gap: 14 }}><Quota label="Hunting" used={data.huntingUsed} limit={data.huntingLimit} /><Quota label="Shop pack" used={data.shopUsed} limit={data.shopLimit} violet /></div></section>{data.latestInquiry && <section className="panel"><div className="panel-head"><h2>Ultima richiesta</h2><StatusPill tone="new">Nuova</StatusPill></div><strong style={{ fontSize: 14 }}>{data.latestInquiry.item}</strong><p style={{ fontSize: 13, lineHeight: 1.45, color: "var(--muted)" }}>{data.latestInquiry.message}</p></section>}</div></div></>;
}

function Quota({ label, used, limit, violet }: { label: string; used: number; limit: number; violet?: boolean }) {
  const percentage = limit > 0 ? Math.min(100, (used / limit) * 100) : 100;
  return <div><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}><span>{label}</span><strong>{used} / {limit}</strong></div><div className="progress-bar"><span style={{ width: `${percentage}%`, background: violet ? "var(--violet)" : undefined }} /></div></div>;
}

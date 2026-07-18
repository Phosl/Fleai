import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ItemCard } from "@/components/item-card";
import { Notice } from "@/components/notice";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublicShop } from "@/lib/data/public-shop";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const { shop } = await getPublicShop(slug);
  return shop ? { title: shop.name, description: shop.description } : { title: "Shop non trovato" };
}

export default async function PublicShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const { shop, error } = await getPublicShop(slug);
  if (!shop && !error) notFound();
  return <><SiteHeader /><main id="main"><section className="shop-header"><div className="container">{error ? <Notice tone="warning">{error}</Notice> : shop && <div className="shop-profile"><div className="shop-id"><div className="shop-avatar">OR</div><div><span className="eyebrow">Shop Fleai</span><h1>{shop.name}</h1><p>{shop.description}</p></div></div><div className="shop-facts"><div className="shop-fact"><strong>{shop.items.length}</strong><span>Oggetti</span></div><div className="shop-fact"><strong>4.9</strong><span>Feedback</span></div></div></div>}</div></section>{shop && <section className="section" style={{ paddingTop: 20 }}><div className="container"><div className="section-head"><div><span className="eyebrow">Disponibili ora</span><h2 className="title">LA SELEZIONE.</h2></div><p>Ogni annuncio separa le foto reali dalle visualizzazioni AI.</p></div>{shop.items.length ? <div className="item-grid">{shop.items.map((item) => <ItemCard item={item} key={item.id} href={`/s/${shop.slug}/${item.slug}`} />)}</div> : <Notice>Nessun oggetto disponibile in questo momento.</Notice>}</div></section>}</main><SiteFooter /></>;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ItemCard } from "@/components/item-card";
import { JsonLd } from "@/components/json-ld";
import { Notice } from "@/components/notice";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublicShop } from "@/lib/data/public-shop";
import { absoluteUrl, shopInitials, truncateDescription } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { shop } = await getPublicShop(slug);
  if (!shop) return { title: "Shop non trovato", robots: { index: false, follow: false } };

  const description = truncateDescription(shop.description, `Scopri gli oggetti second hand disponibili nello shop ${shop.name} su Fleai.`);
  const image = shop.items[0]?.image;
  const metadataTitle = shop.isDemo
    ? `${shop.name} — esempio di shop Fleai`
    : `${shop.name} — shop second hand`;
  return {
    title: { absolute: metadataTitle },
    description,
    alternates: { canonical: `/s/${shop.slug}` },
    robots: shop.isDemo ? { index: false, follow: true, noarchive: true } : {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    openGraph: {
      title: metadataTitle,
      description,
      type: "website",
      locale: "it_IT",
      url: absoluteUrl(`/s/${shop.slug}`),
      images: image ? [{ url: absoluteUrl(image), alt: `Vetrina di ${shop.name}` }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: metadataTitle,
      description,
      images: image ? [absoluteUrl(image)] : undefined,
    },
  };
}

export default async function PublicShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { shop, error } = await getPublicShop(slug);
  if (!shop && !error) notFound();

  const shopUrl = shop ? absoluteUrl(`/s/${shop.slug}`) : "";
  const shopSchema = shop ? {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: shop.isDemo
      ? `${shop.name} — esempio di shop Fleai`
      : `${shop.name} — shop second hand`,
    description: truncateDescription(shop.description),
    url: shopUrl,
    isPartOf: { "@type": "WebSite", name: "Fleai", url: absoluteUrl("/") },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Fleai", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: shop.name, item: shopUrl },
      ],
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: shop.items.length,
      itemListElement: shop.items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.title,
        url: absoluteUrl(`/s/${shop.slug}/${item.slug}`),
      })),
    },
  } : null;

  return (
    <>
      <SiteHeader />
      {shopSchema && <JsonLd data={shopSchema} />}
      <main id="main">
        <section className="shop-header">
          <div className="container">
            {error ? <Notice tone="warning">{error}</Notice> : shop && (
              <div className="shop-profile">
                <div className="shop-id">
                  <div className="shop-avatar" aria-hidden="true">{shopInitials(shop.name)}</div>
                  <div>
                    <span className="eyebrow">{shop.isDemo ? "Shop demo Fleai" : "Shop Fleai"}</span>
                    <h1>{shop.name}</h1>
                    <p>{shop.description}</p>
                    {shop.isDemo && (
                      <p className="shop-demo-note">
                        Vetrina di esempio: oggetti, disponibilità e prezzi sono
                        dimostrativi.
                      </p>
                    )}
                  </div>
                </div>
                <div className="shop-facts" aria-label="Informazioni dello shop">
                  <div className="shop-fact"><strong>{shop.items.length}</strong><span>Disponibili</span></div>
                  <div className="shop-fact"><strong>AI</strong><span>Sempre segnalata</span></div>
                </div>
              </div>
            )}
          </div>
        </section>
        {shop && (
          <section className="section" style={{ paddingTop: 20 }}>
            <div className="container">
              <div className="section-head">
                <div><span className="eyebrow">Disponibili ora</span><h2 className="title">LA SELEZIONE.</h2></div>
                <p>Ogni annuncio separa le foto reali dalle visualizzazioni AI. Condizioni e difetti sono confermati dal venditore prima della pubblicazione.</p>
              </div>
              {shop.items.length ? (
                <div className="item-grid">
                  {shop.items.map((item, index) => <ItemCard item={item} key={item.id} href={`/s/${shop.slug}/${item.slug}`} priority={index === 0} />)}
                </div>
              ) : <Notice>Nessun oggetto disponibile in questo momento.</Notice>}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

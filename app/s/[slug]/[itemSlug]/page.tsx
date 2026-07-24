import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { InquiryForm } from "@/components/inquiry-form";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublicListing } from "@/lib/data/public-shop";
import { formatCurrency } from "@/lib/format";
import { categoryDisplayLabel } from "@/lib/items/labels";
import {
  absoluteUrl,
  schemaItemCondition,
  truncateDescription,
} from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; itemSlug: string }> }): Promise<Metadata> {
  const { slug, itemSlug } = await params;
  const result = await getPublicListing(slug, itemSlug);
  if (!result) return { title: "Oggetto non trovato", robots: { index: false, follow: false } };

  const description = truncateDescription(result.listing.description);
  const canonicalPath = `/s/${result.shop.slug}/${result.item.slug}`;
  const socialImage = result.images.find((image) => !image.ai) ?? result.images[0];
  const socialImageUrl = socialImage ? absoluteUrl(socialImage.src) : undefined;
  return {
    title: `${result.item.title} — ${formatCurrency(result.listing.price)}`,
    description,
    alternates: { canonical: canonicalPath },
    robots: result.isDemo ? { index: false, follow: true, noarchive: true } : {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    openGraph: {
      title: `${result.item.title} — ${formatCurrency(result.listing.price)}`,
      description,
      type: "website",
      locale: "it_IT",
      url: absoluteUrl(canonicalPath),
      images: socialImageUrl ? [{ url: socialImageUrl, alt: socialImage?.label || result.item.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${result.item.title} — ${formatCurrency(result.listing.price)}`,
      description,
      images: socialImageUrl ? [socialImageUrl] : undefined,
    },
  };
}

export default async function ListingPage({ params }: { params: Promise<{ slug: string; itemSlug: string }> }) {
  const { slug, itemSlug } = await params;
  const result = await getPublicListing(slug, itemSlug);
  if (!result) notFound();
  const { shop, item, listing, images } = result;
  const isReserved = "status" in item && item.status === "reserved";
  const itemUrl = absoluteUrl(`/s/${shop.slug}/${item.slug}`);
  const realImages = images.filter((image) => !image.ai);
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.title,
    description: listing.description,
    category: categoryDisplayLabel(item.category),
    image: realImages.map((image) => absoluteUrl(image.src)),
    url: itemUrl,
    sku: item.slug,
    brand: listing.brand ? { "@type": "Brand", name: listing.brand } : undefined,
    additionalProperty: Object.entries(listing.attributes).map(([name, value]) => ({
      "@type": "PropertyValue",
      name,
      value,
    })),
    offers: {
      "@type": "Offer",
      url: itemUrl,
      priceCurrency: listing.currency ?? "EUR",
      price: listing.price.toFixed(2),
      availability: isReserved ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      itemCondition: schemaItemCondition(listing.condition),
      seller: {
        "@type": "Organization",
        name: shop.name,
        url: absoluteUrl(`/s/${shop.slug}`),
      },
    },
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Fleai", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: shop.name, item: absoluteUrl(`/s/${shop.slug}`) },
      { "@type": "ListItem", position: 3, name: item.title, item: itemUrl },
    ],
  };

  return <>
    <SiteHeader />
    {!result.isDemo && <JsonLd data={productSchema} />}
    <JsonLd data={breadcrumbSchema} />
    <main id="main" className="container">
      <div style={{ paddingTop: 24 }}><Link href={`/s/${shop.slug}`} className="eyebrow"><ChevronLeft size={15} /> Torna a {shop.name}</Link></div>
      <div className="listing-page">
        <section className="listing-gallery">
          {images.map((image, index) => <figure key={image.src}>
            <Image src={image.src} alt={image.label || item.title} width={1000} height={1200} priority={index === 0} loading={index === 0 ? "eager" : "lazy"} />
            {image.ai ? <span className="ai-badge">Visualizzazione AI</span> : <span className="real-label">Foto reale</span>}
          </figure>)}
        </section>
        <aside className="listing-detail">
          <span className="eyebrow">{shop.name}</span>
          <h1>{item.title}</h1>
          <p className="listing-category">{categoryDisplayLabel(item.category)} · Second hand</p>
          <div className="listing-price">{formatCurrency(listing.price)}</div>
          {isReserved && <span className="status-pill status-reserved">Riservato</span>}
          <p className="listing-description">{listing.description}</p>
          {listing.defects.length > 0 && (
            <div className="listing-defects">
              <strong>Difetti dichiarati</strong>
              <ul>{listing.defects.map((defect) => <li key={defect}>{defect}</li>)}</ul>
            </div>
          )}
          <div className="attribute-list">
            <div className="attribute"><span>Condizioni</span><strong>{listing.condition}</strong></div>
            {Object.entries(listing.attributes).map(([key, value]) => <div className="attribute" key={key}><span>{key}</span><strong>{value}</strong></div>)}
          </div>
          <div className="notice" style={{ fontSize: 12 }}><ShieldCheck size={17} /><span>Foto reali visibili. Nessun pagamento in app: concorda consegna e dettagli direttamente con il venditore.</span></div>
          {result.isDemo ? (
            <div className="inquiry-form">
              <h2>Questo è un annuncio demo</h2>
              <p>
                Oggetto, prezzo e disponibilità sono dimostrativi. Crea il tuo
                primo annuncio per vedere il flusso completo.
              </p>
              <Link href="/app/items/new" className="button button-wide">
                Crea un annuncio
              </Link>
            </div>
          ) : isReserved ? <div className="inquiry-form"><h2>Oggetto riservato</h2><p>Il venditore ha già accettato una richiesta.</p></div> : <InquiryForm listingId={result.id} />}
        </aside>
      </div>
    </main>
    <SiteFooter />
  </>;
}

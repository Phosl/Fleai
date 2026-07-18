import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { InquiryForm } from "@/components/inquiry-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublicListing } from "@/lib/data/public-shop";
import { formatCurrency } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; itemSlug: string }> }): Promise<Metadata> {
  const { slug, itemSlug } = await params;
  const result = await getPublicListing(slug, itemSlug);
  return result ? { title: result.item.title, description: result.listing.description.slice(0, 150) } : { title: "Oggetto non trovato" };
}

export default async function ListingPage({ params }: { params: Promise<{ slug: string; itemSlug: string }> }) {
  const { slug, itemSlug } = await params;
  const result = await getPublicListing(slug, itemSlug);
  if (!result) notFound();
  const { shop, item, listing, images } = result;
  const isReserved = "status" in item && item.status === "reserved";

  return <>
    <SiteHeader />
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
          <div className="listing-price">{formatCurrency(listing.price)}</div>
          {isReserved && <span className="status-pill status-reserved">Riservato</span>}
          <p className="listing-description">{listing.description}</p>
          <div className="attribute-list">
            <div className="attribute"><span>Condizioni</span><strong>{listing.condition}</strong></div>
            {Object.entries(listing.attributes).map(([key, value]) => <div className="attribute" key={key}><span>{key}</span><strong>{value}</strong></div>)}
          </div>
          <div className="notice" style={{ fontSize: 12 }}><ShieldCheck size={17} /><span>Foto reali visibili. Nessun pagamento in app: concorda consegna e dettagli direttamente con il venditore.</span></div>
          {isReserved ? <div className="inquiry-form"><h2>Oggetto riservato</h2><p>Il venditore ha già accettato una richiesta.</p></div> : <InquiryForm listingId={result.id} />}
        </aside>
      </div>
    </main>
    <SiteFooter />
  </>;
}

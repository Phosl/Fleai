import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { categoryDisplayLabel } from "@/lib/items/labels";

type ItemCardProps = {
  item: { slug: string; title: string; price: number; image: string; category: string; ai?: boolean };
  href?: string;
};

export function ItemCard({ item, href = `/s/officina-ritrovata/${item.slug}` }: ItemCardProps) {
  return (
    <Link className="item-card" href={href}>
      <div className="item-card-image">
        <Image src={item.image} alt={item.title} fill sizes="(max-width: 720px) 100vw, 33vw" />
        {item.ai && <span className="ai-badge">Visualizzazione AI</span>}
      </div>
      <div className="item-card-body">
        <div className="item-card-meta"><span>{categoryDisplayLabel(item.category)}</span><span>Second hand</span></div>
        <h3>{item.title}</h3>
        <span className="item-card-price">{formatCurrency(item.price)}</span>
      </div>
    </Link>
  );
}

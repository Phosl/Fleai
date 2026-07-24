import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/logo";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Logo />
        <nav className="site-nav" aria-label="Navigazione principale">
          <Link href="/#come-funziona">Prodotto</Link>
          <Link href="/come-funziona">Metodo</Link>
          <Link href="/s/officina-ritrovata">Esplora shop</Link>
          <Link href="/login" className="button button-sm">
            Entra <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </header>
  );
}

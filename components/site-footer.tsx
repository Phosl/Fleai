import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div><h2>TROVA.<br />CAPIRE.<br />RIVENDI.</h2></div>
          <div>
            <h3>Fleai</h3>
            <div className="footer-links">
              <Link href="/#come-funziona">Come funziona</Link>
              <Link href="/app/hunt/new">Flea Market Hunting</Link>
              <Link href="/app/items/new">Flea Market Shop</Link>
            </div>
          </div>
          <div>
            <h3>Informazioni</h3>
            <div className="footer-links">
              <Link href="/privacy">Privacy</Link>
              <Link href="/termini">Termini</Link>
              <a href="mailto:ciao@fleai.it">ciao@fleai.it</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Fleai</span>
          <span>Le stime sono orientative, non perizie o verifiche di autenticità.</span>
        </div>
      </div>
    </footer>
  );
}

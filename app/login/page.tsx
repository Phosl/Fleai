import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import { safeAuthNextPath } from "@/lib/auth/redirect";

export const metadata: Metadata = {
  title: "Accedi o registrati",
  description: "Accedi a Fleai o crea un account per analizzare oggetti second hand e gestire il tuo shop.",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const nextPath = safeAuthNextPath(params.next);
  const initialError = params.error === "suspended"
    ? "Il tuo account è sospeso. Contatta l'assistenza Fleai."
    : params.error === "expired"
      ? "Il link di conferma è scaduto. Richiedi un nuovo link dalla scheda Registrati."
      : params.error === "auth"
        ? "Non siamo riusciti a confermare l’accesso. Richiedi un nuovo link e riprova."
        : undefined;
  return (
    <main id="main" className="auth-page">
      <section className="auth-art">
        <Logo />
        <div className="auth-message"><span className="eyebrow" style={{ color: "var(--lime)", marginBottom: 20 }}>Il tuo occhio, con più dati</span><h1>OGNI<br />OGGETTO<br />HA UNA<br /><span style={{ color: "var(--lime)" }}>STORIA.</span></h1></div>
        <div className="auth-orb" aria-hidden="true" />
      </section>
      <section className="auth-form-wrap"><AuthForm nextPath={nextPath} initialError={initialError} /></section>
    </main>
  );
}

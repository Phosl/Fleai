import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import { safeAuthNextPath } from "@/lib/auth/redirect";

export const metadata: Metadata = { title: "Accedi o registrati" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const nextPath = safeAuthNextPath(params.next);
  const initialError = params.error === "suspended" ? "Il tuo account è sospeso. Contatta l'assistenza Fleai." : undefined;
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

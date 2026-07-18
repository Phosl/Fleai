import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Accedi" };

export default function LoginPage() {
  return (
    <main id="main" className="auth-page">
      <section className="auth-art">
        <Logo />
        <div className="auth-message"><span className="eyebrow" style={{ color: "var(--lime)", marginBottom: 20 }}>Il tuo occhio, con più dati</span><h1>OGNI<br />OGGETTO<br />HA UNA<br /><span style={{ color: "var(--lime)" }}>STORIA.</span></h1></div>
        <div className="auth-orb" aria-hidden="true" />
      </section>
      <section className="auth-form-wrap"><AuthForm /></section>
    </main>
  );
}

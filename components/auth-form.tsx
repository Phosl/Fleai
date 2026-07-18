"use client";

import { useState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, publicEnv } from "@/lib/env/public";
import { createClient } from "@/lib/supabase/client";

export function AuthForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function signInWithOtp(event: React.FormEvent) {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      router.push("/app");
      return;
    }
    setState("loading");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${publicEnv.appUrl}/auth/callback?next=/app` },
    });
    if (error) {
      setState("error"); setMessage("Non siamo riusciti a inviare il link. Riprova.");
    } else {
      setState("sent"); setMessage("Controlla la tua email: il link di accesso è in arrivo.");
    }
  }

  async function signInWithGoogle() {
    if (!isSupabaseConfigured) { router.push("/app"); return; }
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${publicEnv.appUrl}/auth/callback?next=/app` },
    });
  }

  return (
    <div className="auth-form">
      <span className="eyebrow">Bentornato</span>
      <h2>Entra in Fleai.</h2>
      <p>Salva i report, crea la tua vetrina e gestisci le richieste. Nessuna password da ricordare.</p>
      <button type="button" className="button button-wide button-white" style={{ border: "1px solid var(--line)" }} onClick={signInWithGoogle}>G&nbsp; Continua con Google</button>
      <div className="auth-divider">oppure</div>
      <form onSubmit={signInWithOtp} style={{ display: "grid", gap: 12 }}>
        <div className="field"><label htmlFor="email">Email</label><div style={{ position: "relative" }}><Mail size={18} style={{ position: "absolute", left: 14, top: 15, color: "var(--muted)" }} /><input id="email" className="input" style={{ paddingLeft: 44 }} type="email" autoComplete="email" placeholder="nome@email.it" value={email} onChange={(e) => setEmail(e.target.value)} required /></div></div>
        <button className="button button-wide button-lime" disabled={state === "loading"}>{state === "loading" ? <><span className="spinner" /> Invio in corso</> : <>Ricevi il link di accesso <ArrowRight size={17} /></>}</button>
      </form>
      {message && <p role={state === "error" ? "alert" : "status"} style={{ marginTop: 16, color: state === "error" ? "var(--danger)" : "var(--success)", fontSize: 13 }}>{message}</p>}
      {!isSupabaseConfigured && <p className="notice" style={{ marginTop: 18, fontSize: 12 }}>Modalità demo attiva: qualsiasi pulsante apre direttamente il workspace.</p>}
      <p style={{ marginTop: 24, fontSize: 11 }}>Continuando accetti i <a href="/termini" style={{ textDecoration: "underline" }}>Termini</a> e l’<a href="/privacy" style={{ textDecoration: "underline" }}>Informativa privacy</a>.</p>
    </div>
  );
}

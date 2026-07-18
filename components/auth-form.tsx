"use client";

import { useRef, useState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, publicEnv } from "@/lib/env/public";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up";

const authContent = {
  "sign-in": {
    eyebrow: "Bentornato",
    title: "Entra in Fleai.",
    description: "Riprendi i tuoi report, la vetrina e le richieste. Nessuna password da ricordare.",
    googleLabel: "Continua con Google",
    submitLabel: "Ricevi il link di accesso",
    sentMessage: "Controlla la tua email: il link di accesso è in arrivo.",
  },
  "sign-up": {
    eyebrow: "Inizia da qui",
    title: "Crea il tuo spazio.",
    description: "Apri gratuitamente il tuo workspace Fleai e trasforma i ritrovamenti in annunci pronti.",
    googleLabel: "Registrati con Google",
    submitLabel: "Crea account con email",
    sentMessage: "Controlla la tua email: apri il link per completare la registrazione.",
  },
} as const;

export function AuthForm() {
  const router = useRouter();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [pending, setPending] = useState<"email" | "google" | null>(null);
  const [message, setMessage] = useState("");
  const content = authContent[mode];

  function selectMode(nextMode: AuthMode) {
    setMode(nextMode);
    setState("idle");
    setMessage("");
  }

  function moveTab(currentIndex: number, direction: -1 | 1) {
    const nextIndex = (currentIndex + direction + tabRefs.current.length) % tabRefs.current.length;
    const nextMode: AuthMode = nextIndex === 0 ? "sign-in" : "sign-up";
    selectMode(nextMode);
    tabRefs.current[nextIndex]?.focus();
  }

  async function submitEmail(event: React.FormEvent) {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      router.push("/app");
      return;
    }
    setPending("email");
    setMessage("");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${publicEnv.appUrl}/auth/callback?next=/app`,
        shouldCreateUser: mode === "sign-up",
      },
    });
    setPending(null);
    if (error) {
      setState("error");
      setMessage("Non siamo riusciti a inviare il link. Controlla l’email e riprova.");
    } else {
      setState("sent");
      setMessage(content.sentMessage);
    }
  }

  async function signInWithGoogle() {
    if (!isSupabaseConfigured) {
      router.push("/app");
      return;
    }
    setPending("google");
    setMessage("");
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${publicEnv.appUrl}/auth/callback?next=/app` },
    });
    if (error) {
      setPending(null);
      setState("error");
      setMessage("Non siamo riusciti ad aprire Google. Riprova tra poco.");
    }
  }

  return (
    <div className="auth-form">
      <div className="auth-tabs" role="tablist" aria-label="Scegli come entrare in Fleai">
        {(["sign-in", "sign-up"] as const).map((tabMode, index) => (
          <button
            key={tabMode}
            ref={(element) => { tabRefs.current[index] = element; }}
            type="button"
            role="tab"
            id={`auth-tab-${tabMode}`}
            aria-controls="auth-panel"
            aria-selected={mode === tabMode}
            tabIndex={mode === tabMode ? 0 : -1}
            className={`auth-tab${mode === tabMode ? " auth-tab-active" : ""}`}
            disabled={pending !== null}
            onClick={() => selectMode(tabMode)}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                moveTab(index, -1);
              }
              if (event.key === "ArrowRight") {
                event.preventDefault();
                moveTab(index, 1);
              }
            }}
          >
            {tabMode === "sign-in" ? "Accedi" : "Registrati"}
          </button>
        ))}
      </div>

      <div id="auth-panel" role="tabpanel" aria-labelledby={`auth-tab-${mode}`}>
        <span className="eyebrow">{content.eyebrow}</span>
        <h2>{content.title}</h2>
        <p className="auth-description">{content.description}</p>
      </div>

      <button type="button" className="button button-wide button-white auth-google" disabled={pending !== null} onClick={signInWithGoogle}>
        {pending === "google" ? <><span className="spinner" /> Apertura Google</> : <>G&nbsp; {content.googleLabel}</>}
      </button>
      <div className="auth-divider">oppure</div>
      <form onSubmit={submitEmail} className="auth-email-form">
        <div className="field">
          <label htmlFor="email">Email</label>
          <div className="auth-email-input">
            <Mail size={18} className="auth-email-icon" />
            <input id="email" className="input" type="email" autoComplete="email" placeholder="nome@email.it" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
        </div>
        <button className="button button-wide button-lime" disabled={pending !== null}>
          {pending === "email" ? <><span className="spinner" /> Invio in corso</> : <>{content.submitLabel} <ArrowRight size={17} /></>}
        </button>
      </form>
      {message && <p role={state === "error" ? "alert" : "status"} className={`auth-feedback auth-feedback-${state}`}>{message}</p>}
      {!isSupabaseConfigured && <p className="notice auth-demo-notice">Modalità demo attiva: qualsiasi pulsante apre direttamente il workspace.</p>}
      <p className="auth-legal">Continuando accetti i <a href="/termini">Termini</a> e l’<a href="/privacy">Informativa privacy</a>.</p>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, publicEnv } from "@/lib/env/public";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up";
type PendingAction = "password" | "email-link" | "google";

const authContent = {
  "sign-in": {
    eyebrow: "Bentornato",
    title: "Entra in Fleai.",
    description: "Riprendi i tuoi report, la vetrina e le richieste.",
    googleLabel: "Continua con Google",
    submitLabel: "Accedi",
    emailLinkLabel: "Accedi senza password",
    sentMessage: "Controlla la tua email: il link di accesso è in arrivo.",
  },
  "sign-up": {
    eyebrow: "Inizia da qui",
    title: "Crea il tuo spazio.",
    description: "Apri gratuitamente il tuo workspace Fleai e trasforma i ritrovamenti in annunci pronti.",
    googleLabel: "Registrati con Google",
    submitLabel: "Crea il tuo account",
    emailLinkLabel: "Registrati senza password",
    sentMessage: "Controlla la tua email: apri il link per completare la registrazione.",
  },
} as const;

function PasswordField({
  id,
  label,
  value,
  visible,
  autoComplete,
  minLength,
  hint,
  onChange,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  hint?: string;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-password-input">
        <LockKeyhole size={18} className="auth-field-icon" />
        <input
          id={id}
          className="input"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          minLength={minLength}
          aria-describedby={hintId}
          onChange={(event) => onChange(event.target.value)}
          required
        />
        <button
          type="button"
          className="auth-password-toggle"
          aria-label={visible ? `Nascondi ${label.toLowerCase()}` : `Mostra ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={onToggle}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {hint && <span id={hintId} className="field-hint">{hint}</span>}
    </div>
  );
}

function passwordErrorMessage(mode: AuthMode, code?: string) {
  if (code === "weak_password") return "La password non rispetta i requisiti di sicurezza. Scegline una più robusta.";
  if (code === "over_request_rate_limit") return "Troppi tentativi. Attendi qualche minuto e riprova.";
  return mode === "sign-in"
    ? "Email o password non corretti. Controlla i dati e riprova."
    : "Non siamo riusciti a creare l’account. Controlla i dati e riprova.";
}

export function AuthForm() {
  const router = useRouter();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [message, setMessage] = useState("");
  const content = authContent[mode];

  function selectMode(nextMode: AuthMode) {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setPasswordVisible(false);
    setConfirmPasswordVisible(false);
    setState("idle");
    setMessage("");
  }

  function moveTab(currentIndex: number, direction: -1 | 1) {
    const nextIndex = (currentIndex + direction + tabRefs.current.length) % tabRefs.current.length;
    const nextMode: AuthMode = nextIndex === 0 ? "sign-in" : "sign-up";
    selectMode(nextMode);
    tabRefs.current[nextIndex]?.focus();
  }

  function openWorkspace() {
    router.replace("/app");
    router.refresh();
  }

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      openWorkspace();
      return;
    }
    if (mode === "sign-up" && password !== confirmPassword) {
      setState("error");
      setMessage("Le password non coincidono.");
      return;
    }

    setPending("password");
    setMessage("");
    const supabase = createClient();
    if (mode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setPending(null);
      if (error) {
        setState("error");
        setMessage(passwordErrorMessage(mode, error.code));
        return;
      }
      openWorkspace();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${publicEnv.appUrl}/auth/callback?next=/app` },
    });
    setPending(null);
    if (error) {
      setState("error");
      setMessage(passwordErrorMessage(mode, error.code));
      return;
    }
    if (data.session) {
      openWorkspace();
      return;
    }
    setState("sent");
    setMessage("Account creato. Controlla la tua email per confermarlo.");
  }

  async function sendEmailLink() {
    if (!emailInputRef.current?.reportValidity()) {
      emailInputRef.current?.focus();
      return;
    }
    if (!isSupabaseConfigured) {
      openWorkspace();
      return;
    }

    setPending("email-link");
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
      return;
    }
    setState("sent");
    setMessage(content.sentMessage);
  }

  async function signInWithGoogle() {
    if (!isSupabaseConfigured) {
      openWorkspace();
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

      <form onSubmit={submitPassword} className="auth-credentials-form">
        <div className="field">
          <label htmlFor="email">Email</label>
          <div className="auth-email-input">
            <Mail size={18} className="auth-field-icon" />
            <input ref={emailInputRef} id="email" className="input" type="email" autoComplete="email" placeholder="nome@email.it" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
        </div>
        <PasswordField
          id="password"
          label="Password"
          value={password}
          visible={passwordVisible}
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          minLength={mode === "sign-up" ? 8 : undefined}
          hint={mode === "sign-up" ? "Usa almeno 8 caratteri." : undefined}
          onChange={setPassword}
          onToggle={() => setPasswordVisible((current) => !current)}
        />
        {mode === "sign-up" && (
          <PasswordField
            id="confirm-password"
            label="Conferma password"
            value={confirmPassword}
            visible={confirmPasswordVisible}
            autoComplete="new-password"
            minLength={8}
            onChange={setConfirmPassword}
            onToggle={() => setConfirmPasswordVisible((current) => !current)}
          />
        )}
        <button className="button button-wide button-lime" disabled={pending !== null}>
          {pending === "password" ? <><span className="spinner" /> Attendi</> : <>{content.submitLabel} <ArrowRight size={17} /></>}
        </button>
      </form>

      <button type="button" className="auth-email-link" disabled={pending !== null} onClick={sendEmailLink}>
        {pending === "email-link" ? <><span className="spinner" /> Invio del link</> : content.emailLinkLabel}
      </button>
      {message && <p role={state === "error" ? "alert" : "status"} className={`auth-feedback auth-feedback-${state}`}>{message}</p>}
      {!isSupabaseConfigured && <p className="notice auth-demo-notice">Modalità demo attiva: qualsiasi pulsante apre direttamente il workspace.</p>}
      <p className="auth-legal">Continuando accetti i <a href="/termini">Termini</a> e l’<a href="/privacy">Informativa privacy</a>.</p>
    </div>
  );
}

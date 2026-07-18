"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { Check, Send } from "lucide-react";
import { publicEnv } from "@/lib/env/public";

declare global { interface Window { fleaiTurnstileCallback?: (token: string) => void } }

export function InquiryForm({ listingId }: { listingId: string }) {
  const [token, setToken] = useState(publicEnv.turnstileSiteKey ? "" : "demo");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => { window.fleaiTurnstileCallback = setToken; return () => { delete window.fleaiTurnstileCallback; }; }, []);

  async function send(form: HTMLFormElement) {
    if (status === "sending") return;
    setStatus("sending"); setError("");
    const formData = new FormData(form);
    const payload = { listingId, name: formData.get("name"), email: formData.get("email"), message: formData.get("message"), consent: formData.get("consent") === "on", turnstileToken: token };
    try {
      if (!publicEnv.supabaseUrl) { await new Promise((resolve) => setTimeout(resolve, 700)); setStatus("sent"); return; }
      const response = await fetch(`/api/listings/${listingId}/inquiries`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() }, body: JSON.stringify(payload) });
      if (!response.ok) { const body = await response.json(); throw new Error(body.error ?? "Invio non riuscito"); }
      setStatus("sent");
    } catch (cause) { setStatus("error"); setError(cause instanceof Error ? cause.message : "Invio non riuscito"); }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(event.currentTarget);
  }

  if (status === "sent") return <div className="inquiry-form" role="status"><span className="result-icon"><Check /></span><h2>Richiesta inviata</h2><p style={{ margin: 0, fontSize: 13 }}>Il venditore ha ricevuto il tuo messaggio. La prenotazione sarà valida dopo la sua conferma.</p></div>;

  return (
    <form className="inquiry-form" onSubmit={submit}>
      {publicEnv.turnstileSiteKey && <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" /><div className="cf-turnstile" data-sitekey={publicEnv.turnstileSiteKey} data-callback="fleaiTurnstileCallback" /></>}
      <h2>Chiedi di prenotarlo</h2>
      <div className="field"><label htmlFor="buyer-name">Nome</label><input className="input" id="buyer-name" name="name" autoComplete="name" required minLength={2} /></div>
      <div className="field"><label htmlFor="buyer-email">Email</label><input className="input" id="buyer-email" name="email" type="email" autoComplete="email" required /></div>
      <div className="field"><label htmlFor="buyer-message">Messaggio</label><textarea className="textarea" id="buyer-message" name="message" defaultValue="Ciao! L’oggetto è ancora disponibile?" required minLength={10} /></div>
      <label className="confirm-row" style={{ margin: 0 }}><input type="checkbox" name="consent" required /><span>Acconsento all’invio dei miei dati al venditore per questa richiesta.</span></label>
      {error && <p role="alert" style={{ color: "var(--danger)", fontSize: 12 }}>{error}</p>}
      <button type="submit" className="button button-wide" disabled={status === "sending" || !token}>{status === "sending" ? <><span className="spinner" /> Invio…</> : <>Invia richiesta <Send size={16} /></>}</button>
    </form>
  );
}

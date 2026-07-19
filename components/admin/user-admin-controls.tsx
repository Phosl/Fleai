"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminMutation } from "@/lib/api/admin-mutation-client";

type UserProfile = {
  display_name: string;
  bio: string | null;
  hunting_limit_override: number | null;
  shop_limit_override: number | null;
  suspended_at: string | null;
  suspension_reason: string | null;
};

function optionalNumber(data: FormData, key: string) {
  const value = String(data.get(key) ?? "").trim();
  return value === "" ? null : Number(value);
}

export function UserAdminControls({ userId, profile }: { userId: string; profile: UserProfile }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function updateProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending("profile");
    setFeedback(null);
    try {
      await adminMutation(`/api/admin/users/${userId}`, "PATCH", {
        displayName: String(data.get("displayName") ?? ""),
        bio: String(data.get("bio") ?? "").trim() || null,
        huntingLimitOverride: optionalNumber(data, "huntingLimitOverride"),
        shopLimitOverride: optionalNumber(data, "shopLimitOverride"),
        reason: String(data.get("reason") ?? ""),
      });
      setFeedback({ tone: "success", text: "Profilo e quote aggiornati." });
      router.refresh();
    } catch (cause) {
      setFeedback({ tone: "error", text: cause instanceof Error ? cause.message : "Operazione non completata." });
    } finally { setPending(null); }
  }

  async function toggleSuspension(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const willSuspend = !profile.suspended_at;
    if (willSuspend && !window.confirm("Sospendere questo utente? Le sue operazioni private verranno bloccate.")) return;
    setPending("suspension");
    setFeedback(null);
    try {
      const result = await adminMutation(`/api/admin/users/${userId}/suspension`, "POST", {
        suspended: willSuspend,
        reason: String(data.get("suspensionReason") ?? ""),
      });
      setFeedback({ tone: result.warning ? "error" : "success", text: result.warning ?? (willSuspend ? "Utente sospeso." : "Utente riattivato.") });
      form.reset();
      router.refresh();
    } catch (cause) {
      setFeedback({ tone: "error", text: cause instanceof Error ? cause.message : "Operazione non completata." });
    } finally { setPending(null); }
  }

  return (
    <div className="admin-control-stack">
      {feedback && <p className={`admin-feedback admin-feedback-${feedback.tone}`} role="status" aria-live="polite">{feedback.text}</p>}
      <form className="form-card" onSubmit={updateProfile}>
        <h2>Profilo e quote</h2>
        <p>Gli override vuoti usano i limiti beta predefiniti.</p>
        <div className="field-grid">
          <div className="field field-full"><label htmlFor="admin-display-name">Nome</label><input id="admin-display-name" name="displayName" className="input" defaultValue={profile.display_name} required /></div>
          <div className="field field-full"><label htmlFor="admin-bio">Bio</label><textarea id="admin-bio" name="bio" className="textarea" defaultValue={profile.bio ?? ""} /></div>
          <div className="field"><label htmlFor="admin-hunt-limit">Quota Hunting</label><input id="admin-hunt-limit" name="huntingLimitOverride" className="input" type="number" min="0" defaultValue={profile.hunting_limit_override ?? ""} /></div>
          <div className="field"><label htmlFor="admin-shop-limit">Quota Shop</label><input id="admin-shop-limit" name="shopLimitOverride" className="input" type="number" min="0" defaultValue={profile.shop_limit_override ?? ""} /></div>
          <div className="field field-full"><label htmlFor="admin-user-reason">Motivazione</label><input id="admin-user-reason" name="reason" className="input" minLength={3} maxLength={500} required /></div>
        </div>
        <button className="button button-coral" disabled={pending !== null}>{pending === "profile" ? "Salvataggio…" : "Salva modifiche"}</button>
      </form>
      <form className="form-card admin-danger-card" onSubmit={toggleSuspension}>
        <h2>{profile.suspended_at ? "Riattiva account" : "Sospendi account"}</h2>
        <p>{profile.suspended_at ? `Sospeso: ${profile.suspension_reason ?? "nessuna motivazione"}` : "Gli annunci pubblici restano online; accesso e operazioni private vengono bloccati."}</p>
        <div className="field"><label htmlFor="admin-suspension-reason">Motivazione</label><textarea id="admin-suspension-reason" name="suspensionReason" className="textarea" minLength={3} maxLength={500} required /></div>
        <button className={`button ${profile.suspended_at ? "button-lime" : "button-coral"}`} disabled={pending !== null}>{pending === "suspension" ? "Aggiornamento…" : profile.suspended_at ? "Riattiva utente" : "Sospendi utente"}</button>
      </form>
    </div>
  );
}

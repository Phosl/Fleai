"use client";

import { useState } from "react";
import { Check, Mail } from "lucide-react";
import { StatusPill } from "@/components/status-pill";

export type InquiryListItem = {
  id: string;
  item: string;
  name: string;
  email?: string;
  message: string;
  time: string;
  status: string;
};

export function InquiriesList({ inquiries }: { inquiries: InquiryListItem[] }) {
  const [rows, setRows] = useState(inquiries);
  const [error, setError] = useState("");

  async function accept(id: string) {
    setError("");
    const response = await fetch(`/api/inquiries/${id}/accept`, { method: "POST", headers: { "idempotency-key": crypto.randomUUID() } });
    if (!response.ok) { setError("Non è stato possibile riservare l’oggetto."); return; }
    setRows((current) => current.map((row) => row.id === id ? { ...row, status: "accepted" } : row));
  }

  return <section className="panel"><div className="panel-head"><h2>Messaggi ricevuti</h2><StatusPill tone="new">{rows.filter((row) => row.status === "new").length} nuove</StatusPill></div>{error && <p role="alert" style={{ color: "var(--danger)", fontSize: 12 }}>{error}</p>}<div className="inquiry-list">{rows.length === 0 ? <p className="muted">Nessuna richiesta per ora.</p> : rows.map((inquiry) => { const isAccepted = inquiry.status === "accepted"; return <article className="inquiry-row" key={inquiry.id}><div><div className="inquiry-meta">{inquiry.time} · {inquiry.item}</div><h3>{inquiry.name}</h3><p>{inquiry.message}</p></div><div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>{isAccepted ? <StatusPill tone="reserved">Accettata</StatusPill> : <><button type="button" className="button button-sm button-lime" onClick={() => void accept(inquiry.id)}><Check size={15} /> Accetta</button>{inquiry.email && <a className="button button-sm button-ghost" aria-label="Scrivi email" href={`mailto:${encodeURIComponent(inquiry.email)}`}><Mail size={15} /></a>}</>}</div></article>; })}</div></section>;
}

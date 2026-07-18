import "server-only";

import { Resend } from "resend";
import { serverEnv } from "@/lib/env/server";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);
}

export async function sendInquiryEmail(input: {
  sellerEmail: string;
  buyerName: string;
  buyerEmail: string;
  message: string;
  itemTitle: string;
}) {
  if (!serverEnv.resendApiKey) throw new Error("RESEND_NOT_CONFIGURED");
  const resend = new Resend(serverEnv.resendApiKey);
  const { error } = await resend.emails.send({
    from: serverEnv.emailFrom,
    to: input.sellerEmail,
    replyTo: input.buyerEmail,
    subject: `Nuova richiesta per ${input.itemTitle}`,
    html: `<h1>Nuova richiesta Fleai</h1><p><strong>${escapeHtml(input.buyerName)}</strong> (${escapeHtml(input.buyerEmail)}) è interessato a <strong>${escapeHtml(input.itemTitle)}</strong>.</p><p>${escapeHtml(input.message).replace(/\n/g, "<br>")}</p><p>Apri il dashboard Fleai per accettare o chiudere la richiesta.</p>`,
  });
  if (error) throw new Error("RESEND_SEND_FAILED");
}

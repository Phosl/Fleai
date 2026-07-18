import { z } from "zod";
import { inquirySchema } from "@/lib/contracts";
import { ApiError, apiErrorResponse } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/inquiries/turnstile";
import { sendInquiryEmail } from "@/lib/inquiries/email";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const input = inquirySchema.parse(await request.json());
    if (input.listingId !== id) throw new ApiError(400, "LISTING_MISMATCH", "Richiesta non valida.");
    const idempotencyKey = z.string().uuid().parse(request.headers.get("idempotency-key"));
    const remoteIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (!await verifyTurnstile(input.turnstileToken, remoteIp)) {
      throw new ApiError(400, "TURNSTILE_FAILED", "Verifica anti-spam non riuscita.");
    }

    const admin = createAdminClient();
    const { data: existing } = await admin.from("inquiries").select("id").eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing) return Response.json({ inquiryId: existing.id });
    const { data: listing, error: listingError } = await admin
      .from("items")
      .select("id,title,owner_id,status,moderation_status")
      .eq("id", id)
      .in("status", ["published", "reserved"])
      .eq("moderation_status", "approved")
      .maybeSingle();
    if (listingError) throw listingError;
    if (!listing || listing.status !== "published") throw new ApiError(409, "NOT_AVAILABLE", "L’oggetto non è più disponibile.");

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await admin.from("inquiries").select("id", { head: true, count: "exact" }).eq("buyer_email", input.email.toLowerCase()).gte("created_at", oneHourAgo);
    if (countError) throw countError;
    if ((count ?? 0) >= 3) throw new ApiError(429, "RATE_LIMITED", "Troppe richieste: riprova più tardi.");

    const { data: inquiry, error: inquiryError } = await admin.from("inquiries").insert({
      listing_id: listing.id,
      seller_id: listing.owner_id,
      buyer_name: input.name,
      buyer_email: input.email.toLowerCase(),
      message: input.message,
      idempotency_key: idempotencyKey,
    }).select("id").single();
    if (inquiryError) throw inquiryError;

    let notificationStatus = "sent";
    try {
      const { data: seller, error: sellerError } = await admin.auth.admin.getUserById(listing.owner_id);
      if (sellerError || !seller.user.email) throw sellerError ?? new Error("SELLER_EMAIL_MISSING");
      await sendInquiryEmail({ sellerEmail: seller.user.email, buyerName: input.name, buyerEmail: input.email, message: input.message, itemTitle: listing.title });
    } catch {
      notificationStatus = "failed";
    }
    await admin.from("inquiries").update({ notification_status: notificationStatus }).eq("id", inquiry.id);
    return Response.json({ inquiryId: inquiry.id, notificationStatus }, { status: 201 });
  } catch (cause) {
    return apiErrorResponse(cause);
  }
}

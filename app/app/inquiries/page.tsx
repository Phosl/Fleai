import { InquiriesList, type InquiryListItem } from "@/components/inquiries-list";
import { demoInquiries } from "@/lib/demo-data";
import { isDemoMode } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export default async function InquiriesPage() {
  let inquiries: InquiryListItem[] = demoInquiries.map((inquiry) => ({ ...inquiry, status: inquiry.status === "Accettata" ? "accepted" : "new" }));
  if (!isDemoMode) {
    const supabase = await createClient();
    const { data: rows } = await supabase.from("inquiries").select("id,listing_id,buyer_name,buyer_email,message,status,created_at").order("created_at", { ascending: false });
    const itemIds = [...new Set((rows ?? []).map((row) => row.listing_id))];
    const { data: items } = itemIds.length ? await supabase.from("items").select("id,title").in("id", itemIds) : { data: [] };
    inquiries = (rows ?? []).map((row) => ({ id: row.id, item: items?.find((item) => item.id === row.listing_id)?.title ?? "Oggetto", name: row.buyer_name, email: row.buyer_email, message: row.message, status: row.status, time: formatDate(row.created_at) }));
  }
  return <><div className="page-head"><div><span className="eyebrow">Prenotazioni</span><h1 className="title">RICHIESTE.</h1><p>Accettando una richiesta, l’oggetto viene riservato e le altre vengono chiuse.</p></div></div><InquiriesList inquiries={inquiries} /></>;
}

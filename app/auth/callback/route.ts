import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAuthNextPath } from "@/lib/auth/redirect";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeAuthNextPath(url.searchParams.get("next"));
  const callbackError = url.searchParams.get("error_code") ?? url.searchParams.get("error");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  const login = new URL("/login", url.origin);
  login.searchParams.set("error", callbackError === "otp_expired" ? "expired" : "auth");
  login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}

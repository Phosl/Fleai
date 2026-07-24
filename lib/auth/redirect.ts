export function safeAuthNextPath(value: string | null | undefined) {
  if (!value) return "/app";
  try {
    const parsed = new URL(value, "https://fleai.local");
    if (parsed.origin !== "https://fleai.local") return "/app";
    const allowed = parsed.pathname === "/app" || parsed.pathname.startsWith("/app/") ||
      parsed.pathname === "/admin" || parsed.pathname.startsWith("/admin/");
    return allowed ? `${parsed.pathname}${parsed.search}${parsed.hash}` : "/app";
  } catch {
    return "/app";
  }
}

export function authCallbackUrl(origin: string, nextPath: string) {
  const parsedOrigin = new URL(origin);
  if (parsedOrigin.protocol !== "http:" && parsedOrigin.protocol !== "https:") {
    throw new Error("AUTH_ORIGIN_INVALID");
  }
  const callback = new URL("/auth/callback", parsedOrigin.origin);
  callback.searchParams.set("next", safeAuthNextPath(nextPath));
  return callback.toString();
}

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

import "server-only";

import { serverEnv } from "@/lib/env/server";

export async function verifyTurnstile(token: string, remoteIp?: string) {
  if (!serverEnv.turnstileSecretKey) return false;
  const body = new URLSearchParams({ secret: serverEnv.turnstileSecretKey, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
    cache: "no-store",
  });
  if (!response.ok) return false;
  const result = await response.json() as { success?: boolean };
  return result.success === true;
}

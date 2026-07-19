export async function adminMutation(url: string, method: "PATCH" | "POST", body: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as { message?: string; warning?: string };
  if (!response.ok) throw new Error(payload.message ?? "Operazione non completata.");
  return payload;
}

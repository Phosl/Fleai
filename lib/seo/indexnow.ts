import "server-only";

import { absoluteUrl } from "@/lib/seo";

const INDEXNOW_KEY = "3cff17201c39d01672cecd46477ba2b0";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

export async function notifyIndexNow(paths: string[]) {
  const origin = new URL(absoluteUrl("/")).origin;
  const urlList = Array.from(
    new Set(
      paths
        .map((path) => absoluteUrl(path))
        .filter((url) => new URL(url).origin === origin),
    ),
  );

  if (!urlList.length) return;

  try {
    await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: new URL(origin).hostname,
        key: INDEXNOW_KEY,
        keyLocation: absoluteUrl(`/${INDEXNOW_KEY}.txt`),
        urlList,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    // La sitemap resta il fallback: un errore IndexNow non blocca la vendita.
  }
}

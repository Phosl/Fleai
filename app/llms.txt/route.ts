import { absoluteUrl, SITE_DESCRIPTION, SITE_EMAIL, SITE_NAME } from "@/lib/seo";

export function GET() {
  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

## Canonical public pages

- Home: ${absoluteUrl("/")}
- Methodology and confidence rules: ${absoluteUrl("/come-funziona")}
- Public shops use the path /s/{shop-slug}.
- Public second-hand listings use the path /s/{shop-slug}/{item-slug}.

## Product facts

- Flea Market Hunting analyses 1–3 object photos, user context and optional purchase costs.
- Reports distinguish observed details from information that cannot be verified.
- Comparable sources include a URL, observation date, currency and price type when available.
- Confidence is based on photo coverage, identification precision, comparable similarity and price recency and coherence.
- With fewer than two valid comparables, confidence is limited to low.
- Below 50/100, Fleai asks for more information instead of recommending a purchase.
- Flea Market Shop creates a draft listing and clearly separates real condition photos from AI visualizations.
- Fleai does not provide checkout, authentication certificates, appraisals or guarantees of resale value.

## Safety

Weapons, medicines, controlled substances, illegal material and declared counterfeit goods are not supported. Important or signed objects should be checked by a qualified professional.

## Contact

${SITE_EMAIL}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  absoluteUrl,
  HOME_FAQS,
  pageMetadata,
  schemaItemCondition,
  shopInitials,
  SITE_URL,
  truncateDescription,
} from "@/lib/seo";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("SEO e GEO", () => {
  it("non genera canonical localhost in produzione", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_URL", "");

    expect(absoluteUrl("/come-funziona")).toBe(`${SITE_URL}/come-funziona`);
  });

  it("usa il dominio di produzione Vercel quando disponibile", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "fleai.example");

    expect(absoluteUrl("/s/test")).toBe("https://fleai.example/s/test");
  });

  it("crea metadata canonici e social coerenti", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", SITE_URL);
    const metadata = pageMetadata({
      title: "Metodo Fleai",
      description: "Come funziona Fleai.",
      path: "/come-funziona",
    });

    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/come-funziona`);
    expect(metadata.openGraph?.url).toBe(`${SITE_URL}/come-funziona`);
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("mantiene FAQ utili, descrizioni brevi e iniziali leggibili", () => {
    expect(HOME_FAQS.length).toBeGreaterThanOrEqual(5);
    expect(new Set(HOME_FAQS.map((faq) => faq.question)).size).toBe(HOME_FAQS.length);
    expect(truncateDescription("x".repeat(200))).toHaveLength(158);
    expect(shopInitials("Officina Ritrovata")).toBe("OR");
    expect(shopInitials("  ")).toBe("FL");
  });

  it("mappa le condizioni reali sui valori Schema.org", () => {
    expect(schemaItemCondition("Nuovo con etichette")).toBe(
      "https://schema.org/NewCondition",
    );
    expect(schemaItemCondition("Ricondizionato")).toBe(
      "https://schema.org/RefurbishedCondition",
    );
    expect(schemaItemCondition("Buone condizioni vintage")).toBe(
      "https://schema.org/UsedCondition",
    );
  });
});

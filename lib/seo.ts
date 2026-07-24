import type { Metadata } from "next";

export const SITE_NAME = "Fleai";
export const SITE_URL = "https://fleai.vercel.app";
export const SITE_EMAIL = "info@voxels.it";
export const SITE_TITLE = "Fleai — Valuta e rivendi oggetti dei mercatini";
export const SITE_DESCRIPTION =
  "Fleai analizza oggetti second hand da 1–3 foto, confronta fonti e prezzi citati e aiuta a creare annunci trasparenti pronti per la vendita.";

export const HOME_FAQS = [
  {
    question: "Che cos’è Fleai?",
    answer:
      "Fleai è un’app per chi cerca e rivende oggetti usati. Analizza foto e informazioni fornite dall’utente, cerca comparabili e prepara una stima prudente o una scheda di vendita.",
  },
  {
    question: "Come viene stimato il valore di un oggetto?",
    answer:
      "La stima considera identificazione visiva, condizioni dichiarate, prezzi comparabili, somiglianza e recenza delle fonti. Fleai mostra una fascia di prezzo e un livello di affidabilità, non un valore certo.",
  },
  {
    question: "Fleai certifica autenticità o rarità?",
    answer:
      "No. Per oggetti firmati o potenzialmente importanti servono foto di etichette, firme, seriali e difetti; Fleai consiglia sempre una verifica professionale quando è necessaria.",
  },
  {
    question: "Quali categorie supporta Fleai?",
    answer:
      "L’MVP supporta moda e accessori, casa e design, tecnologia, arte e decorazione, libri e media, giochi, sport, strumenti musicali e collezionabili non regolamentati.",
  },
  {
    question: "Fleai pubblica direttamente su Vinted o sui social?",
    answer:
      "No. Fleai crea testi e immagini copiabili o scaricabili e può ospitare una pagina shop pubblica, ma la pubblicazione su marketplace e social resta sotto il controllo dell’utente.",
  },
  {
    question: "Le immagini create dall’AI sostituiscono le foto reali?",
    answer:
      "No. Le foto reali delle condizioni restano separate. Le immagini contestualizzate o di prova virtuale sono indicate come visualizzazioni AI e hanno funzione illustrativa.",
  },
] as const;

function configuredSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (configured) {
    try {
      const configuredUrl = new URL(configured);
      const isLocal =
        configuredUrl.hostname === "localhost" ||
        configuredUrl.hostname === "127.0.0.1";

      if (
        (configuredUrl.protocol === "http:" ||
          configuredUrl.protocol === "https:") &&
        (!isProduction || !isLocal)
      ) {
        return configuredUrl.origin;
      }
    } catch {
      // Prova l'URL Vercel o il dominio canonico.
    }
  }

  const vercelProduction =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (vercelProduction) {
    const candidate = /^https?:\/\//i.test(vercelProduction)
      ? vercelProduction
      : `https://${vercelProduction}`;

    try {
      return new URL(candidate).origin;
    } catch {
      // Usa il dominio canonico.
    }
  }

  return isProduction ? SITE_URL : "http://localhost:3000";
}

export function absoluteUrl(path = "/") {
  return new URL(path, `${configuredSiteOrigin()}/`).toString();
}

export function truncateDescription(
  value: string | null | undefined,
  fallback = SITE_DESCRIPTION,
) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  return normalized.length <= 160
    ? normalized
    : `${normalized.slice(0, 157).trimEnd()}…`;
}

export function pageMetadata({
  title,
  description,
  path,
  image,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const canonical = absoluteUrl(path);
  const socialImage = image ?? absoluteUrl("/opengraph-image");

  return {
    title,
    description,
    alternates: { canonical },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          noarchive: true,
          googleBot: { index: false, follow: false, noarchive: true },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: "it_IT",
      type: "website",
      images: [{ url: socialImage, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export function shopInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "FL"
  );
}

export function schemaItemCondition(condition: string | null | undefined) {
  const normalized = condition?.toLocaleLowerCase("it-IT") ?? "";

  if (normalized.includes("nuov")) {
    return "https://schema.org/NewCondition";
  }
  if (normalized.includes("ricondiz")) {
    return "https://schema.org/RefurbishedCondition";
  }
  if (
    normalized.includes("dannegg") ||
    normalized.includes("non funzionante")
  ) {
    return "https://schema.org/DamagedCondition";
  }

  return "https://schema.org/UsedCondition";
}

import "server-only";

import { createHash } from "node:crypto";
import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import { AI_GENERATED_LABEL } from "@/lib/contracts";
import { serverEnv } from "@/lib/env/server";

type GeneratedKind = "clean_ai" | "context_ai" | "try_on_ai" | "social_still";
export type GeneratedImage = {
  kind: GeneratedKind;
  label: string;
  buffer: Buffer;
  mimeType: "image/jpeg";
  width: number;
  height: number;
};

function openai() {
  if (!serverEnv.openAiApiKey) throw new Error("OPENAI_API_KEY_MISSING");
  return new OpenAI({ apiKey: serverEnv.openAiApiKey });
}

function safeUser(userId: string) {
  return createHash("sha256").update(`fleai-image:${userId}`).digest("hex");
}

function watermarkSvg(width: number, height: number) {
  const text = AI_GENERATED_LABEL;
  const boxWidth = Math.max(250, Math.round(width * 0.31));
  const boxHeight = Math.max(48, Math.round(height * 0.05));
  const x = width - boxWidth - Math.round(width * 0.025);
  const y = height - boxHeight - Math.round(height * 0.025);
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" rx="${Math.round(boxHeight / 2)}" fill="#17352f" fill-opacity="0.92"/><text x="${x + boxWidth / 2}" y="${y + boxHeight * 0.64}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="${Math.round(boxHeight * 0.34)}" fill="#f4f0e7">${text}</text></svg>`);
}

async function normalizeAndWatermark(buffer: Buffer, width: number, height: number) {
  return sharp(buffer)
    .rotate()
    .resize(width, height, { fit: "cover", position: "centre" })
    .composite([{ input: watermarkSvg(width, height), top: 0, left: 0 }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}

async function edit(input: {
  userId: string;
  sourceImages: Buffer[];
  prompt: string;
  width: number;
  height: number;
}) {
  const files = await Promise.all(input.sourceImages.slice(0, 3).map((buffer, index) =>
    sharp(buffer).rotate().jpeg({ quality: 94 }).toBuffer().then((normalized) =>
      toFile(normalized, `foto-reale-${index + 1}.jpg`, { type: "image/jpeg" }),
    ),
  ));
  const response = await openai().images.edit({
    model: serverEnv.openAiImageModel,
    image: files,
    prompt: input.prompt,
    input_fidelity: "high",
    size: `${input.width}x${input.height}`,
    quality: "medium",
    output_format: "jpeg",
    output_compression: 92,
    background: "opaque",
    user: safeUser(input.userId),
  });
  const encoded = response.data?.[0]?.b64_json;
  if (!encoded) throw new Error("OPENAI_IMAGE_EMPTY");
  return { buffer: await normalizeAndWatermark(Buffer.from(encoded, "base64"), input.width, input.height), requestId: response._request_id ?? null };
}

export async function generateMarketingImages(input: {
  userId: string;
  sourceImages: Buffer[];
  objectDescription: string;
  category: string;
  tryOn?: { presentation: string; ageRange: string; heightCm: number; weightKg: number };
}) {
  const preservation = "Mantieni identici oggetto, materiali, colori, proporzioni, marchi visibili, usura e difetti delle foto. Non riparare, ridisegnare, aggiungere parti o occultare imperfezioni. Non aggiungere testo, loghi o watermark: saranno applicati dall'applicazione.";
  const [clean, context] = await Promise.all([
    edit({
      userId: input.userId,
      sourceImages: input.sourceImages,
      width: 1024,
      height: 1280,
      prompt: `${preservation} Crea una fotografia e-commerce realistica di ${input.objectDescription}, isolata su fondo caldo neutro, luce morbida da studio e ombra naturale. L'oggetto deve restare il soggetto unico e completo.`,
    }),
    edit({
      userId: input.userId,
      sourceImages: input.sourceImages,
      width: 1024,
      height: 1280,
      prompt: `${preservation} Contestualizza ${input.objectDescription} in un ambiente italiano sobrio, credibile e coerente con la scala dell'oggetto. La scena è una visualizzazione commerciale, ma l'oggetto deve restare perfettamente riconoscibile.`,
    }),
  ]);

  const images: GeneratedImage[] = [
    { kind: "clean_ai", label: "Hero ripulita · Visualizzazione AI", buffer: clean.buffer, mimeType: "image/jpeg", width: 1024, height: 1280 },
    { kind: "context_ai", label: "Oggetto contestualizzato · Visualizzazione AI", buffer: context.buffer, mimeType: "image/jpeg", width: 1024, height: 1280 },
  ];

  if (input.category === "fashion" && input.tryOn) {
    const tryOn = await edit({
      userId: input.userId,
      sourceImages: input.sourceImages,
      width: 1024,
      height: 1536,
      prompt: `${preservation} Mostra il capo indossato da un modello adulto interamente sintetico con presentazione ${input.tryOn.presentation}, fascia d'età ${input.tryOn.ageRange}, altezza indicativa ${input.tryOn.heightCm} cm e peso indicativo ${input.tryOn.weightKg} kg. Posa naturale, sfondo neutro, nessuna persona reale. Vestibilità e proporzioni sono solo indicative.`,
    });
    images.push({ kind: "try_on_ai", label: "Virtual try-on indicativo · Visualizzazione AI", buffer: tryOn.buffer, mimeType: "image/jpeg", width: 1024, height: 1536 });
  }

  const social45 = await normalizeAndWatermark(context.buffer, 1080, 1350);
  const social916 = await normalizeAndWatermark(context.buffer, 1080, 1920);
  images.push(
    { kind: "social_still", label: "Social 4:5 · Visualizzazione AI", buffer: social45, mimeType: "image/jpeg", width: 1080, height: 1350 },
    { kind: "social_still", label: "Social 9:16 · Visualizzazione AI", buffer: social916, mimeType: "image/jpeg", width: 1080, height: 1920 },
  );
  return { images, requestIds: [clean.requestId, context.requestId].filter(Boolean) };
}

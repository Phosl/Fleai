"use client";

const SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function normalizeImage(file: File) {
  if (!SUPPORTED_TYPES.has(file.type)) {
    throw new Error("Formato non supportato. Usa JPEG, PNG o WebP.");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("La foto supera 12 MB.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Impossibile elaborare la foto.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
  if (!blob) throw new Error("Impossibile comprimere la foto.");
  const safeName = `${file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "-") || "foto"}.jpg`;
  return new File([blob], safeName, { type: "image/jpeg", lastModified: Date.now() });
}

const DB_NAME = "fleai-drafts";
const STORE_NAME = "photos";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDraftPhotos(key: string, files: File[]) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(files, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

export async function loadDraftPhotos(key: string) {
  const db = await openDb();
  const result = await new Promise<File[]>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve((request.result as File[] | undefined) ?? []);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result;
}

export async function clearDraftPhotos(key: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

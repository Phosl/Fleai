"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { loadDraftPhotos, normalizeImage, saveDraftPhotos } from "@/lib/media/normalize-image";

export function PhotoCapture({ draftKey, onChange }: { draftKey: string; onChange: (files: File[]) => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => {
    loadDraftPhotos(draftKey).then((saved) => { setFiles(saved); onChange(saved); }).catch(() => undefined);
  }, [draftKey, onChange]);

  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview)), [previews]);

  async function addPhoto(file: File | undefined) {
    if (!file || files.length >= 3) return;
    setError("");
    try {
      const normalized = await normalizeImage(file);
      const nextFiles = [...files, normalized].slice(0, 3);
      setFiles(nextFiles); onChange(nextFiles);
      await saveDraftPhotos(draftKey, nextFiles);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Foto non valida.");
    }
  }

  async function removePhoto(index: number) {
    const nextFiles = files.filter((_, fileIndex) => fileIndex !== index);
    setFiles(nextFiles); onChange(nextFiles);
    await saveDraftPhotos(draftKey, nextFiles);
  }

  return (
    <div className="field field-full">
      <span className="field-label">Foto reali dell’oggetto <span className="muted">({files.length}/3)</span></span>
      <div className="photo-grid">
        {[0, 1, 2].map((index) => files[index] ? (
          <div key={index} className="photo-slot photo-slot-filled">
            <Image src={previews[index]} alt={`Foto reale ${index + 1}`} fill unoptimized />
            <button type="button" className="photo-remove" onClick={() => removePhoto(index)} aria-label={`Rimuovi foto ${index + 1}`}><X size={15} /></button>
          </div>
        ) : (
          <label key={index} className="photo-slot">
            <span className="photo-slot-copy">{index === files.length ? <Camera size={24} /> : <ImagePlus size={21} />}<span>{index === 0 ? "Foto principale" : index === 1 ? "Retro o lato" : "Marchio o difetto"}</span></span>
            {index === files.length && <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => { void addPhoto(event.target.files?.[0]); event.target.value = ""; }} aria-label={`Aggiungi foto ${index + 1}`} />}
          </label>
        ))}
      </div>
      <span className="field-hint">JPEG, PNG o WebP. Ridimensioniamo a 2048 px e rimuoviamo i metadati EXIF prima dell’upload.</span>
      {error && <span role="alert" style={{ color: "var(--danger)", fontSize: 12 }}>{error}</span>}
    </div>
  );
}

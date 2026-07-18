"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ value, label = "Copia" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  }
  return <button type="button" className="copy-button" onClick={copy} aria-label={copied ? "Copiato" : label}>{copied ? <Check size={15} /> : <Copy size={15} />}</button>;
}

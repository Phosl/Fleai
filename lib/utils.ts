import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function requestId(headers: Headers) {
  return headers.get("x-request-id") ?? crypto.randomUUID();
}

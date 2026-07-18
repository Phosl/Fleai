import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("logo", className)} aria-label="Fleai, home">
      <span className="logo-mark" aria-hidden="true">F</span>
      <span>fleai<span className="logo-dot">.</span></span>
    </Link>
  );
}

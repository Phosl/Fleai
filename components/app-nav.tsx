"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Camera, Inbox, Package, Settings, Store } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Panoramica", icon: BarChart3, exact: true },
  { href: "/app/hunt/new", label: "Hunting", icon: Camera },
  { href: "/app/items/new", label: "Nuovo oggetto", icon: Package },
  { href: "/app/shop", label: "Il mio shop", icon: Store },
  { href: "/app/inquiries", label: "Richieste", icon: Inbox },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname.startsWith(href.replace(/\/new$/, ""));
}

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="app-nav" aria-label="Dashboard">
      {navItems.map(({ href, label, icon: Icon, exact }) => (
        <Link key={href} href={href} className={cn("app-nav-link", isActive(pathname, href, exact) && "app-nav-link-active")}>
          <Icon size={19} aria-hidden="true" /><span>{label}</span>
        </Link>
      ))}
      <Link href="/app/settings" className={cn("app-nav-link", pathname.startsWith("/app/settings") && "app-nav-link-active")}>
        <Settings size={19} aria-hidden="true" /><span>Impostazioni</span>
      </Link>
    </nav>
  );
}

export function MobileAppNav() {
  const pathname = usePathname();
  return (
    <nav className="mobile-bottom-nav" aria-label="Dashboard mobile">
      {navItems.slice(0, 5).map(({ href, label, icon: Icon, exact }) => (
        <Link key={href} href={href} className={cn("mobile-nav-link", isActive(pathname, href, exact) && "mobile-nav-link-active")}>
          <Icon size={20} aria-hidden="true" /><span>{label === "Nuovo oggetto" ? "Shop" : label}</span>
        </Link>
      ))}
    </nav>
  );
}

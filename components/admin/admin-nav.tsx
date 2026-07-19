"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, LayoutDashboard, ScrollText, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Panoramica", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Utenti", icon: Users },
  { href: "/admin/items", label: "Oggetti", icon: Boxes },
  { href: "/admin/audit", label: "Audit", icon: ScrollText },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="app-nav" aria-label="Super Admin">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return <Link key={href} href={href} className={cn("app-nav-link", active && "app-nav-link-active")}><Icon size={19} /><span>{label}</span></Link>;
      })}
    </nav>
  );
}

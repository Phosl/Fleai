import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/logo";
import { Notice } from "@/components/notice";
import { SignOutButton } from "@/components/sign-out-button";
import { readUserAccessProfile } from "@/lib/api/auth";
import { isDemoMode } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Super Admin",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (isDemoMode) {
    return <main className="admin-config-page"><Logo /><Notice tone="warning">Il pannello Super Admin richiede Supabase e la service role configurati.</Notice></main>;
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  const { profile, adminSchemaMissing, isSuspended } = await readUserAccessProfile(supabase, user.id);
  if (isSuspended) redirect("/login?error=suspended");
  if (adminSchemaMissing) {
    return <main className="admin-config-page"><Logo /><Notice tone="warning">Applica la migrazione <code>20260719160000_profile_super_admin.sql</code> e ricarica la pagina.</Notice></main>;
  }
  if (!profile?.is_super_admin) notFound();
  const displayName = profile?.display_name || user.email?.split("@")[0] || "Admin";
  return (
    <div className="dashboard-shell admin-shell">
      <aside className="app-sidebar admin-sidebar">
        <Logo href="/admin" />
        <div className="admin-role"><ShieldCheck size={17} /><span>Super Admin</span></div>
        <AdminNav />
        <div className="app-user"><div className="avatar">{displayName.slice(0, 1).toUpperCase()}</div><div><strong>{displayName}</strong><span>Controllo globale</span></div></div>
      </aside>
      <div className="app-main">
        <header className="app-topbar"><Logo href="/admin" className="mobile-menu" /><Link className="button button-ghost button-sm" href="/app">Workspace personale</Link><SignOutButton /></header>
        <div className="admin-mobile-nav"><AdminNav /></div>
        <main id="main" className="app-content admin-content">{children}</main>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/logo";
import { Notice } from "@/components/notice";
import { SignOutButton } from "@/components/sign-out-button";
import { isAdmin } from "@/lib/api/auth";
import { isMissingSchemaError } from "@/lib/database-errors";
import { isDemoMode } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (isDemoMode) {
    return <main className="admin-config-page"><Logo /><Notice tone="warning">Il pannello Super Admin richiede Supabase e la service role configurati.</Notice></main>;
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  if (!isAdmin(user)) notFound();
  const { data: profile, error } = await supabase.from("profiles").select("display_name,suspended_at").eq("id", user.id).maybeSingle();
  if (error && !isMissingSchemaError(error)) throw error;
  if (profile?.suspended_at) redirect("/login?error=suspended");
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

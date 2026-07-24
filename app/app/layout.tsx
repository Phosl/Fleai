import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppNav, MobileAppNav } from "@/components/app-nav";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { isDemoMode } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";
import { readUserAccessProfile } from "@/lib/api/auth";

export const metadata: Metadata = {
  title: "Workspace",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let displayName = "Filippo";
  let showAdmin = false;
  if (!isDemoMode) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login?next=/app");
    const { profile, isSuspended } = await readUserAccessProfile(supabase, user.id);
    if (isSuspended) redirect("/login?error=suspended");
    displayName = profile?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "Venditore";
    showAdmin = profile?.is_super_admin ?? false;
  }

  return (
    <div className="dashboard-shell">
      <aside className="app-sidebar">
        <Logo href="/app" />
        <AppNav showAdmin={showAdmin} />
        <div className="app-user">
          <div className="avatar">{displayName.slice(0, 1).toUpperCase()}</div>
          <div style={{ minWidth: 0 }}><strong style={{ display: "block", fontSize: 13 }}>{displayName}</strong><span style={{ color: "#aec1bb", fontSize: 11 }}>Piano beta</span></div>
        </div>
      </aside>
      <div className="app-main">
        {isDemoMode && <div className="demo-notice">Modalità demo · Collega Supabase e le API in <code>.env.local</code> per usare dati reali.</div>}
        <header className="app-topbar">
          <Logo href="/app" className="mobile-menu" />
          <span className="eyebrow">Flea market workspace</span>
          {showAdmin && <Link className="button button-ghost button-sm admin-top-link" href="/admin">Super Admin</Link>}
          <SignOutButton />
        </header>
        <main id="main" className="app-content">{children}</main>
        <MobileAppNav />
      </div>
    </div>
  );
}

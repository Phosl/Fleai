"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env/public";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    if (isSupabaseConfigured) await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }
  return <button type="button" className="button button-ghost button-sm" onClick={signOut} aria-label="Esci"><LogOut size={16} /></button>;
}

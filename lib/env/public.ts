export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
};

export const isSupabaseConfigured = Boolean(
  publicEnv.supabaseUrl && publicEnv.supabasePublishableKey,
);

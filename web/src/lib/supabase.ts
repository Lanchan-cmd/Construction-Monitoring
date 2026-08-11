import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Supabase client (native auth mode).
 * Reads credentials from Vite env vars (EXPO_PUBLIC_ prefix is shared
 * with the Android app via Rork's env system).
 */
const supabaseUrl = import.meta.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error("Missing Supabase env vars. Check .env file.");
}

export const supabase = createClient<Database>(
  supabaseUrl ?? "",
  supabaseAnonKey ?? "",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

/** Supabase Storage bucket name for site photos and bills. */
export const PHOTOS_BUCKET = "site-photos";

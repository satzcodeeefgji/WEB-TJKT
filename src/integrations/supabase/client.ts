import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const FALLBACK_SUPABASE_URL = "https://vvvnwkdosyartgoyqqgx.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_79wo6pd9EUEddeHF8tRHRA_vHb2FReh";
const usingFallback = !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY;

if (usingFallback) {
  console.warn(
    "Supabase env vars are missing. Using fallback project. If pengeluaran/libur gagal, set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your project values."
  );
}

export const supabase = createClient<Database>(
  SUPABASE_URL || FALLBACK_SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

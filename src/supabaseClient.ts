import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types/database";
import { getRedirectUrl } from "./utils/redirectUrl";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars: string[] = [];
  if (!supabaseUrl) missingVars.push("VITE_SUPABASE_URL");
  if (!supabaseAnonKey) missingVars.push("VITE_SUPABASE_ANON_KEY");
  const msg = `Missing Supabase environment variable(s): ${missingVars.join(", ")}.\nPlease set them in your environment before running the app.`;
  if (typeof window !== "undefined") {
    throw new Error(msg);
  } else {
    console.error(msg);
    throw new Error(msg);
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

export { getRedirectUrl };

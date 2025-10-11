import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = [];
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

export const getRedirectUrl = () => {
  const envRedirect = import.meta.env.VITE_REDIRECT_URL?.trim();

  // In dev we always bounce back to the current origin to avoid forcing prod URLs.
  if (import.meta.env.DEV && typeof window !== "undefined") {
    return `${window.location.origin}/split`;
  }

  if (envRedirect) return envRedirect;

  if (typeof window !== "undefined") {
    return `${window.location.origin}/split`;
  }

  return undefined;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    redirectTo: getRedirectUrl(),
  },
});

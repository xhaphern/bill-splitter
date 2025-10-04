import { createClient } from "@supabase/supabase-js";


const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');
  const msg = `Missing Supabase environment variable(s): ${missingVars.join(', ')}.\nPlease set them in your environment before running the app.`;
  if (typeof window !== 'undefined') {
    // Browser: throw error
    throw new Error(msg);
  } else {
    // Node: log and throw
    console.error(msg);
    throw new Error(msg);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    // Default to the SPA route so Netlify/Vercel redirects land on a valid page
    redirectTo: import.meta.env.VITE_REDIRECT_URL || `${window.location.origin}/split`
  },
});

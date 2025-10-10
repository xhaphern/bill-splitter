import React, { useEffect, useState } from "react";
import { supabase, getRedirectUrl } from "../supabaseClient";
import { useLocation, useNavigate } from "react-router-dom";
import { Receipt, LogOut, Github } from "../icons";

export default function LoginPage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  // If a route sent us here, go back there after login; otherwise default to /split
  const from = (location.state && location.state.from) || "/split";

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
      if (data.session) {
        navigate(from, { replace: true });
      }
    });

    // Listen for login/logout changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
      if (s) {
        navigate(from, { replace: true });
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [navigate, from]);

  // OAuth redirect URL is resolved by getRedirectUrl()
  const redirectTo = getRedirectUrl();

  const signInWithGitHub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo },
    });
    if (error) {
      console.error(error);
      alert("GitHub sign-in failed. Please try again.");
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      console.error(error);
      alert("Google sign-in failed. Please try again.");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b111a]">
      <div className="w-full max-w-md rounded-3xl border border-slate-700/70 bg-slate-900/70 p-6 text-center shadow-xl backdrop-blur">
        {!session ? (
          <>
            <div className="mb-3 flex items-center justify-center gap-2">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-900/30">
                <Receipt className="text-emerald-300" size={18} />
              </div>
              <h1 className="text-white text-2xl font-semibold">Sign in</h1>
            </div>
            <p className="text-slate-300 mb-6">
              Sign in to save your bills and view your history.
            </p>
            <div className="my-6 flex items-center justify-center gap-6">
              <button
                onClick={signInWithGitHub}
                aria-label="Continue with GitHub"
                className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-slate-600/60 bg-slate-800/70 text-slate-100 shadow ring-1 ring-emerald-500/20 transition-all duration-200 ease-out hover:-translate-y-1 hover:bg-slate-700/70 hover:ring-emerald-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
              >
                <Github size={28} />
              </button>
              <button
                onClick={signInWithGoogle}
                aria-label="Continue with Google"
                className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-slate-600/60 bg-slate-800/70 text-white shadow ring-1 ring-emerald-500/20 transition-all duration-200 ease-out hover:-translate-y-1 hover:bg-slate-700/70 hover:ring-emerald-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
              >
                <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6 1.54 7.38 2.84l5.02-4.91C33.64 4.1 29.3 2 24 2 14.82 2 7.39 7.64 4.7 15.17l6.45 5.02C12.62 13.8 17.83 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.5 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h12.65c-.55 2.98-2.15 5.51-4.58 7.21l7.01 5.44C43.8 37.23 46.5 31.4 46.5 24.5z"/>
                  <path fill="#FBBC05" d="M11.15 20.19l-6.45-5.02C3.64 18.6 3 21.46 3 24.5c0 3  .64 5.86 1.7 8.33l6.48-5.06c-.38-1.18-.58-2.44-.58-3.77 0-1.3.21-2.55.55-3.81z"/>
                  <path fill="#34A853" d="M24 46c5.85 0 10.77-1.93 14.36-5.23l-7.01-5.44c-1.95 1.31-4.46 2.1-7.35 2.1-6.17 0-11.38-4.3-13.2-10.13l-6.48 5.06C7.39 40.36 14.82 46 24 46z"/>
                  <path fill="none" d="M3 3h42v42H3z"/>
                </svg>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-center gap-2">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-900/30">
                <Receipt className="text-emerald-300" size={18} />
              </div>
              <h1 className="text-white text-2xl font-semibold">Welcome back</h1>
            </div>
            <p className="text-slate-300 mb-6">
              Signed in as <b>{session.user?.email}</b>
            </p>
            <button
              onClick={signOut}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/60 bg-red-900/40 px-4 py-2 text-sm font-semibold text-red-100 shadow transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-red-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

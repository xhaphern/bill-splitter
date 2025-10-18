import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase, getRedirectUrl } from "../supabaseClient";
import { Receipt, LogOut, Github, Google } from "../icons";

interface LocationState {
  from?: string;
}

export default function LoginPage(): JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  // If a route sent us here, go back there after login; otherwise default to /split
  const from = state?.from ?? "/split";

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

  const signInWithGitHub = async (): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo },
    });
    if (error) {
      console.error(error);
      alert("GitHub sign-in failed. Please try again.");
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      console.error(error);
      alert("Google sign-in failed. Please try again.");
    }
  };

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#06111f] via-[#081c2f] to-[#040915] text-white">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#06111f] via-[#081c2f] to-[#040915] px-6">
      <div className="glass-panel w-full max-w-md p-7 text-center">
        {!session ? (
          <>
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-900/30">
                <Receipt size={18} className="text-emerald-300" />
              </div>
              <h1 className="text-2xl font-semibold text-white">Sign in</h1>
            </div>
            <p className="mb-6 text-slate-300">
              Sign in to save your bills and view your history.
            </p>
            <div className="flex items-center justify-center gap-6 my-6">
              <button
                type="button"
                onClick={signInWithGitHub}
                aria-label="Continue with GitHub"
                className="inline-flex h-16 w-16 items-center justify-center rounded-full border ring-1 border-slate-600/60 bg-slate-800/70 text-slate-100 shadow ring-emerald-500/20 transition-all duration-200 ease-out hover:-translate-y-1 hover:bg-slate-700/70 hover:ring-emerald-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
              >
                <Github size={28} />
              </button>
              <button
                type="button"
                onClick={signInWithGoogle}
                aria-label="Continue with Google"
                className="inline-flex h-16 w-16 items-center justify-center rounded-full border ring-1 border-slate-600/60 bg-slate-800/70 text-white shadow ring-emerald-500/20 transition-all duration-200 ease-out hover:-translate-y-1 hover:bg-slate-700/70 hover:ring-emerald-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
              >
                <Google className="h-7 w-7" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-900/30">
                <Receipt size={18} className="text-emerald-300" />
              </div>
              <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
            </div>
            <p className="mb-6 text-slate-300">
              Signed in as <b>{session.user?.email}</b>
            </p>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold text-red-100 border-red-500/60 bg-red-900/40 shadow transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-red-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
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

import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase, getRedirectUrl } from "../supabaseClient";
import { Github, LogOut, UserCircle, Google, Receipt } from "../icons";

interface LocationState {
  from?: string;
}

interface ProfilePageProps {
  session: Session | null;
}

export default function ProfilePage({ session }: ProfilePageProps): JSX.Element {
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [displayName, setDisplayName] = useState<string>(() => {
    try {
      return localStorage.getItem("user_display_name") || "";
    } catch {
      return "";
    }
  });
  const [accountNumber, setAccountNumber] = useState<string>(() => {
    try {
      return localStorage.getItem("user_account") || "";
    } catch {
      return "";
    }
  });
  const resolvedLocale =
    typeof navigator !== "undefined" && navigator.language ? navigator.language : "en-US";

  const redirectTo = getRedirectUrl();
  const pendingRoute = state?.from;
  const pendingRouteLabel =
    typeof pendingRoute === "string" && pendingRoute.length
      ? pendingRoute === "/split"
        ? "Split"
        : pendingRoute.replace(/^\/+/, "") || "Split"
      : null;

  const memberSince = useMemo(() => {
    if (!session?.user?.created_at) return "";
    try {
      return new Date(session.user.created_at).toLocaleDateString(resolvedLocale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return new Date(session.user.created_at).toISOString().slice(0, 10);
    }
  }, [session?.user?.created_at, resolvedLocale]);

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
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error(error);
      alert("Sign out failed. Please try again.");
    }
  };

  const handleSaveProfile = async (): Promise<void> => {
    try {
      localStorage.setItem("user_display_name", displayName.trim());
      localStorage.setItem("user_account", accountNumber.trim().slice(0, 13));

      if (session?.user) {
        const { error } = await supabase.auth.updateUser({
          data: {
            display_name: displayName.trim() || null,
            account_number: accountNumber.trim().slice(0, 13) || null,
          },
        });
        if (error) throw error;
      }
      alert("Profile updated.");
    } catch (err) {
      console.error("Failed to update profile", err);
      alert("Could not update profile. Please try again.");
    }
  };

  if (!session) {
    return (
      <div className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center gap-6">
        {pendingRouteLabel && (
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-500/12 px-4 py-3 text-sm text-emerald-100 shadow-[0_18px_40px_rgba(4,16,28,0.45)] backdrop-blur">
            <span className="font-semibold">Sign in required.</span>{" "}
            Continue to{" "}
            <span className="font-semibold text-emerald-200">
              {pendingRouteLabel}
            </span>{" "}
            after authentication.
          </div>
        )}
        <div className="glass-panel w-full max-w-md p-7 text-center">
          <h2 className="mb-4 flex flex-wrap items-center justify-center gap-3 text-2xl font-semibold text-white">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-900/30">
              <Receipt size={18} className="text-emerald-300" />
            </span>
            Sign in
            <span className="text-sm font-normal text-slate-300">
              Sign in to save your bills, sync defaults, and view your history.
            </span>
          </h2>
          <div className="flex items-center justify-center gap-6 my-6">
            <button
              type="button"
              onClick={signInWithGitHub}
              aria-label="Continue with GitHub"
              className="inline-flex h-16 w-16 items-center justify-center rounded-full border ring-1 border-slate-600/60 bg-slate-800/70 text-slate-100 shadow ring-emerald-500/20 transition-all duration-200 ease-out hover:-translate-y-1 hover:bg-slate-700/70 hover:ring-emerald-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 active:scale-105"
            >
              <Github size={28} />
            </button>
            <button
              type="button"
              onClick={signInWithGoogle}
              aria-label="Continue with Google"
              className="inline-flex h-16 w-16 items-center justify-center rounded-full border ring-1 border-slate-600/60 bg-slate-800/70 text-white shadow ring-emerald-500/20 transition-all duration-200 ease-out hover:-translate-y-1 hover:bg-slate-700/70 hover:ring-emerald-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 active:scale-105"
            >
              <Google className="h-7 w-7" />
            </button>
          </div>
          <p className="text-xs text-slate-500">
            We only request basic profile details for authentication—no bill data is shared.
          </p>
        </div>
      </div>
    );
  }

  const { user } = session;

  return (
    <div className="space-y-6">
      <header className="mb-4">
        <h2 className="flex flex-wrap items-center gap-3 text-xl font-semibold text-white">
          <UserCircle size={20} className="text-emerald-300" />
          Profile
          <span className="text-sm font-normal text-slate-400">
            Manage your account and sign out when you’re done splitting bills.
          </span>
        </h2>
      </header>
      <div className="glass-panel space-y-5 p-6">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-slate-200">Signed in as</div>
          <div className="text-lg text-white">{user.email}</div>
          <div className="text-xs text-slate-500">
            Member since {memberSince}
          </div>
        </div>
        <div className="space-y-3 border-t border-white/10 pt-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Your name
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How should we address you?"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Default account number
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, "").slice(0, 13))}
              placeholder="e.g. 1234567890123"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            />
          </label>
          <button
            type="button"
            onClick={handleSaveProfile}
            className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 bg-emerald-500/90 shadow transition hover:bg-emerald-400"
          >
            Save profile
          </button>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="w-full inline-flex items-center justify-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold text-red-200 border-red-500/50 bg-red-900/20 transition hover:bg-red-900/40"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </div>
  );
}

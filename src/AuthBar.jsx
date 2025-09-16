// src/AuthBar.jsx
import { Link, useLocation } from "react-router-dom";
import { LogIn, LogOut, UserCircle } from "lucide-react";
import { supabase } from "./supabaseClient";

export default function AuthBar({ session, variant = "header" }) {
  const location = useLocation();

  const displayName =
    session?.user?.user_metadata?.display_name?.trim() ||
    session?.user?.email?.split("@")[0] ||
    "You";

  const actionClass =
    variant === "menu"
      ? "inline-flex items-center justify-center gap-2 w-full rounded-lg bg-emerald-500/80 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400"
      : "inline-flex items-center gap-2 rounded-lg bg-emerald-500/80 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400";

  const signOutClass =
    variant === "menu"
      ? "inline-flex items-center justify-center gap-2 w-full rounded-lg border border-emerald-500/70 bg-emerald-950/70 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-sm transition hover:bg-emerald-900/70"
      : "inline-flex items-center gap-2 rounded-lg border border-emerald-500/70 bg-emerald-950/70 px-3 py-2 text-sm font-semibold text-emerald-100 shadow-sm transition hover:bg-emerald-900/70";

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (session) {
    if (variant === "menu") {
      return (
        <div className="space-y-3 text-sm">
          <div className="rounded-lg border border-emerald-700/50 bg-emerald-900/40 px-3 py-2 text-left">
            <div className="text-[10px] uppercase tracking-wide text-emerald-300/70">
              Signed in as
            </div>
            <div className="text-sm font-semibold text-white">{displayName}</div>
          </div>
          <button onClick={signOut} className={signOutClass}>
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("bs:open-profile"))}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-600/60 bg-emerald-950/70 px-3 py-1.5 text-emerald-100 shadow-sm transition hover:bg-emerald-900/70"
          aria-label="Edit profile"
        >
          <UserCircle size={20} className="text-emerald-300" />
          <span className="hidden sm:inline text-sm font-semibold text-white">{displayName}</span>
        </button>
        <button onClick={signOut} className={signOutClass} aria-label="Sign out">
          <LogOut size={16} className="sm:hidden" />
          <span className="sr-only sm:hidden">Sign out</span>
          <span className="hidden sm:inline text-sm font-semibold text-emerald-100">Sign out</span>
        </button>
      </div>
    );
  }

  return (
    <Link
      to="/login"
      state={{ from: location.pathname }}
      className={actionClass}
    >
      <LogIn size={16} />
      <span>Sign in</span>
    </Link>
  );
}

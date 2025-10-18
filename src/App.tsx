import { useEffect, useState, lazy, Suspense } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  NavLink,
} from "react-router-dom";
import { supabase } from "./supabaseClient";
import { Menu, X, Home, Clock3, Users as UsersIcon, UserCircle, ScanText } from "./icons";

import BillSplitter from "./BillSplitter";
import AuthBar from "./AuthBar";
import TabBar, { TabBarItem } from "./components/TabBar";

const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const FriendsPage = lazy(() => import("./pages/FriendsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const BillDetailPage = lazy(() => import("./pages/BillDetailPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

interface PrivateRouteProps {
  session: Session | null;
  children: JSX.Element;
  from?: string;
}

function PrivateRoute({ session, children, from = "/split" }: PrivateRouteProps) {
  if (!session) return <Navigate to="/login" replace state={{ from }} />;
  return children;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    const failSafe = setTimeout(() => {
      if (mounted) setInitializing(false);
    }, 4000);

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error("supabase.auth.getSession error:", error);
        if (mounted) setSession(data?.session ?? null);
      } catch (e) {
        console.error("getSession threw:", e);
      } finally {
        if (mounted) setInitializing(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) setSession(newSession ?? null);
    });

    return () => {
      mounted = false;
      clearTimeout(failSafe);
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const activeClass =
    "text-emerald-400 border-b-2 border-emerald-500 pb-1 transition-colors";
  const linkClass = "text-slate-300 hover:text-white pb-1 transition-colors";
  const overlayLinkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-emerald-600/20 text-emerald-200"
        : "text-slate-200 hover:bg-slate-800/70"
    }`;

  const navItems = [
    { to: "/split", label: "Split" },
    { to: "/history", label: "History" },
    { to: "/friends", label: "Friends" },
  ];
  const bottomNavItems: TabBarItem[] = [
    { type: "route", to: "/split", label: "Split", icon: Home },
    { type: "route", to: "/history", label: "History", icon: Clock3 },
    { type: "route", to: "/friends", label: "Friends", icon: UsersIcon },
    { type: "route", to: "/profile", label: "Profile", icon: UserCircle },
    {
      type: "action",
      label: "Scan",
      icon: ScanText,
      navigateTo: "/split",
      ariaLabel: "Scan receipt",
      onSelect: () => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("bs:open-ocr"));
        }
      },
    },
  ];

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-[#05070b] via-[#0b111a] to-[#05070b] text-slate-100">
        <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg border border-emerald-700/60 bg-emerald-900/40 p-2 text-emerald-200 transition hover:bg-emerald-800/60 sm:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <div className="text-lg font-semibold tracking-wide text-white">
              Bill Splitter
            </div>
            <nav className="hidden items-center gap-5 sm:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ? activeClass : linkClass
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <AuthBar session={session} />
          </div>
        </header>

        {mobileNavOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur sm:hidden"
            onClick={() => setMobileNavOpen(false)}
          >
            <div
              className="absolute inset-y-0 left-0 w-72 max-w-full border-r border-white/10 bg-[#0a1118]/95 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="font-semibold tracking-wide text-white">Menu</div>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-lg border border-white/10 bg-slate-800/70 p-2 text-slate-200 transition hover:bg-slate-700/70"
                  aria-label="Close navigation"
                >
                  <X size={18} />
                </button>
              </div>
              <nav className="flex flex-col gap-2 px-4 py-4">
                {navItems.map((item) => (
                  <NavLink
                    key={`mobile-${item.to}`}
                    to={item.to}
                    className={overlayLinkClass}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <div className="mt-auto border-t border-white/10 px-4 py-4">
                <AuthBar session={session} variant="menu" />
              </div>
            </div>
          </div>
        )}

        {initializing ? (
          <main className="mx-auto max-w-7xl px-4 pb-10">
            <div className="min-h-[40vh] grid place-items-center text-slate-300">
              Loading…
            </div>
          </main>
        ) : (
          <main className="mx-auto max-w-7xl px-4 pb-10">
            <Suspense
              fallback={
                <div className="min-h-[40vh] grid place-items-center text-slate-300">
                  Loading…
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Navigate to="/split" replace />} />
                <Route path="/split" element={<BillSplitter session={session} />} />
                <Route
                  path="/login"
                  element={session ? <Navigate to="/split" replace /> : <LoginPage />}
                />
                <Route
                  path="/history"
                  element={
                    <PrivateRoute session={session} from="/history">
                      <HistoryPage session={session} />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/history/:id"
                  element={
                    <PrivateRoute session={session} from="/history">
                      <BillDetailPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/friends"
                  element={
                    <PrivateRoute session={session} from="/friends">
                      <FriendsPage session={session} />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <PrivateRoute session={session} from="/profile">
                      <ProfilePage session={session} />
                    </PrivateRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/split" replace />} />
              </Routes>
            </Suspense>
          </main>
        )}
      </div>
      <TabBar items={bottomNavItems} />
    </Router>
  );
}

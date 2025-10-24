import { useEffect, useState, lazy, Suspense, startTransition } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { supabase } from "./supabaseClient";
import { Home, Clock3, Users as UsersIcon, UserCircle, ScanText } from "./icons";

import BillSplitter from "./BillSplitter";
import TabBar, { TabBarItem } from "./components/TabBar";

// Lazy load pages with preloading capability
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const FriendsPage = lazy(() => import("./pages/FriendsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const BillDetailPage = lazy(() => import("./pages/BillDetailPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const IconComparisonPage = lazy(() => import("./pages/IconComparisonPage"));

// Preload functions for eager loading
const preloadHistoryPage = () => import("./pages/HistoryPage");
const preloadFriendsPage = () => import("./pages/FriendsPage");
const preloadProfilePage = () => import("./pages/ProfilePage");

interface PrivateRouteProps {
  session: Session | null;
  children: JSX.Element;
  from?: string;
  loginMessage?: string;
}

function PrivateRoute({ session, children, from = "/split", loginMessage }: PrivateRouteProps) {
  if (!session) return <Navigate to="/login" replace state={{ from, message: loginMessage }} />;
  return children;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);

  // Preload routes after initial render for faster navigation
  useEffect(() => {
    // Use requestIdleCallback if available, otherwise setTimeout
    const schedulePreload = (callback: () => void) => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(callback, { timeout: 2000 });
      } else {
        setTimeout(callback, 1000);
      }
    };

    // Preload all routes in sequence with small delays using startTransition for non-blocking
    schedulePreload(() => {
      startTransition(() => {
        preloadHistoryPage();
        setTimeout(() => {
          startTransition(() => {
            preloadFriendsPage();
            setTimeout(() => {
              startTransition(() => {
                preloadProfilePage();
              });
            }, 100);
          });
        }, 100);
      });
    });
  }, []);

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
        <header className="mx-auto flex max-w-5xl items-center justify-between page-container" style={{paddingTop: '12px', paddingBottom: '12px'}}>
          <div className="text-lg font-semibold tracking-wide text-white">
            Bill Splitter
          </div>
        </header>

        {initializing ? (
          <main className="mx-auto max-w-5xl page-container">
            <div className="min-h-[40vh] grid place-items-center text-slate-300">
              Loading…
            </div>
          </main>
        ) : (
          <main className="mx-auto max-w-5xl page-container">
            <Suspense
              fallback={
                <div className="min-h-[30vh] grid place-items-center">
                  <div className="flex flex-col items-center gap-3 opacity-0 animate-[fadeIn_0.15s_ease-in_forwards]">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
                    <span className="text-sm text-slate-400">Loading…</span>
                  </div>
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
                    <PrivateRoute
                      session={session}
                      from="/history"
                      loginMessage="Sign in to view your bill history and saved bills."
                    >
                      <HistoryPage session={session} />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/history/:id"
                  element={
                    <PrivateRoute
                      session={session}
                      from="/history"
                      loginMessage="Sign in to view your bill history and saved bills."
                    >
                      <BillDetailPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/friends"
                  element={
                    <PrivateRoute
                      session={session}
                      from="/friends"
                      loginMessage="Sign in to save your friends and organize them into circles for quick access when splitting bills."
                    >
                      <FriendsPage session={session} />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <PrivateRoute
                      session={session}
                      from="/profile"
                      loginMessage="Sign in to view and manage your profile settings."
                    >
                      <ProfilePage session={session} />
                    </PrivateRoute>
                  }
                />
                <Route path="/icon-comparison" element={<IconComparisonPage />} />
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

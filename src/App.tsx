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
const SnackbarShowcase = lazy(() => import("./pages/SnackbarShowcase"));
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

  // Preload routes shortly after mount for faster navigation
  useEffect(() => {
    // Parallel preloading for all authenticated routes
    const preloadAll = () => {
      Promise.all([
        preloadHistoryPage(),
        preloadFriendsPage(),
        preloadProfilePage()
      ]).catch((error) => {
        // Routes will load on demand if preload fails
        if (import.meta.env.DEV) {
          console.warn('Route preloading failed, will load on demand:', error);
        }
      });
    };

    // Preload during idle time or after brief delay
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(preloadAll, { timeout: 500 });
    } else {
      setTimeout(preloadAll, 100);
    }
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
      <div className="app-bg">
        <header className="app-container flex items-center justify-between page-container" style={{paddingTop: '12px', paddingBottom: '12px'}}>
          <div className="text-lg font-semibold tracking-wide app-header-text">
            Bill Splitter
          </div>
        </header>

        {initializing ? (
          <main className="app-container page-container">
            <div className="min-h-[40vh] grid place-items-center text-slate-300">
              Loading…
            </div>
          </main>
        ) : (
          <main className="app-container page-container">
            <Suspense fallback={
              <div className="min-h-[40vh] grid place-items-center text-slate-300">
                Loading…
              </div>
            }>
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
                      <HistoryPage />
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
                      <FriendsPage />
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
                {/* Dev-only routes - only available in development */}
                {import.meta.env.DEV && (
                  <>
                    <Route path="/snackbar-showcase" element={<SnackbarShowcase />} />
                    <Route path="/icon-comparison" element={<IconComparisonPage />} />
                  </>
                )}
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

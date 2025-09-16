import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useLocation, useNavigate } from "react-router-dom";

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

  // GitHub Pages redirect target (works locally and on prod)
  const redirectTo = `${window.location.origin}/bill-splitter/`;

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
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md text-center">
        {!session ? (
          <>
            <h1 className="text-white text-2xl font-semibold mb-2">Sign in</h1>
            <p className="text-gray-400 mb-6">
              Sign in to save your bills and view your history.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={signInWithGitHub}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white w-full"
              >
                Continue with GitHub
              </button>
              <button
                onClick={signInWithGoogle}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white w-full"
              >
                Continue with Google
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-white text-2xl font-semibold mb-4">Welcome back</h1>
            <p className="text-gray-300 mb-6">
              Signed in as <b>{session.user?.email}</b>
            </p>
            <button
              onClick={signOut}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white w-full"
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </div>
  );
}
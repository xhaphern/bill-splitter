import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./supabaseClient", () => {
  const makeAsync = <T,>(value: T) => Promise.resolve(value);

  return {
    supabase: {
      auth: {
        getSession: () => makeAsync({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        }),
        signOut: vi.fn(),
        signInWithOAuth: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnThis(),
      })),
    },
  };
});

describe("App", () => {
  it("shows navigation once app is ready", async () => {
    render(<App />);

    const billTitleInput = await screen.findByPlaceholderText(/Untitled bill/i);
    expect(billTitleInput).toBeInTheDocument();

    const splitLinks = await screen.findAllByRole("link", { name: /split/i });
    expect(splitLinks.some((link) => link.getAttribute("href") === "/split")).toBe(true);
  });
});

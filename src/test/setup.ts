import "@testing-library/jest-dom/vitest";

// Silence console noise from intentional Supabase error logs during tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("supabase")) return;
    originalError(...(args as unknown[]));
  };
});

afterAll(() => {
  console.error = originalError;
});

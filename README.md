# Bill Splitter

Bill Splitter is a Vite + React single-page app for tracking shared expenses, saving frequent contacts, and syncing bills to Supabase. It ships with Tailwind styling, deterministic friend colours, circle management, and OAuth sign-in via Supabase Auth.

## Features

- Create and edit bills with line items, taxes, service charges, discounts, and per-participant splits.
- Save friends with optional account numbers, organise them into circles, and reuse them while splitting.
- Persist data to Supabase tables for signed-in users; fall back to local state for anonymous usage.
- Export bill summaries, download snapshots, and revisit history saved in Supabase.
- OAuth sign-in (GitHub/Google) with redirect support for Netlify and other SPA hosts.

## Tech Stack

- React 18 + Vite 7
- Tailwind CSS 3
- Supabase JS client (Auth, PostgREST)
- Bun 1 (dependency manager, scripts, tests)

## Prerequisites

- [Bun](https://bun.sh/) >= 1.1
- Supabase project with tables (`friends`, `friend_circles`, `friend_circle_members`, `bills`, etc.) and RLS policies that scope data to `auth.uid()`.
- Optional: Supabase CLI for local emulation.

## Environment Variables

Create `.env.local` in the repo root (never commit secrets):

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
# Optional explicit redirect for Supabase OAuth; defaults to window.location.origin + '/split'
VITE_REDIRECT_URL=https://splitter-mv.netlify.app/split
```

Ensure the redirect URL is also added to Supabase Auth settings.

## Local Development

```bash
bun install
bun run dev
```

The app runs at http://localhost:5173. Sign in using Supabase Auth to exercise persistence, or continue anonymously to test local-only flows.

### Linting & Tests

Vitest covers Supabase API helpers and core flows:

```bash
bun run test
```

Add new tests beside implementation files using the `.test.jsx` suffix. For integration work, document manual QA scenarios (bill creation, friend management, circle add/remove, OAuth redirect) in PRs.

## Build & Preview

```bash
bun run build
bun run preview
```

`build` outputs to `dist/` and is suitable for static hosting. `preview` serves the production bundle locally.

## Deployment

### Netlify (recommended)

- `netlify.toml` already sets the build command (`bun run build`), publish directory (`dist/`), and SPA fallback.
- Configure the environment variables above in **Site settings → Build & deploy → Environment**.
- Add `https://<your-domain>/split` to Supabase's allowed redirect URLs.

### GitHub Pages (optional)

A workflow in `.github/workflows/deploy.yml` builds with Bun and publishes to the `github-pages` environment. Enable GitHub Pages (source: GitHub Actions) if you want to keep this path.

## Project Structure

```
src/
  App.jsx            // Routing + layout
  BillSplitter.jsx   // Core bill management UI
  pages/             // History, Friends, Login, detail pages
  api/               // Supabase data access helpers
  utils/colors.js    // Deterministic colour helpers
  supabaseClient.js  // Supabase client initialisation
```

## Contributing

- Follow Conventional Commit prefixes (e.g., `feat:`, `fix:`, `chore:`).
- Keep changes atomic; rebase on `main` before opening PRs.
- Document any schema or RLS adjustments that accompany code changes.

Refer to [AGENTS.md](AGENTS.md) and [CONTRIBUTING.md](CONTRIBUTING.md) for detailed repository guidelines.

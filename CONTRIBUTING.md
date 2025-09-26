# Contributing

Thanks for helping improve Bill Splitter. This doc keeps collaboration clear and fast without being heavy. If anything here gets in your way, open an issue or PR to adjust.

## Local Dev
- Using npm (default)
  - Install: `npm install`
  - Dev server: `npm run dev` (http://localhost:5173)
  - Build: `npm run build`
  - Preview prod build: `npm run preview`

- Using Bun (optional)
  - One-time switch: `rm -rf node_modules && bun install`
  - Dev server: `bun run dev`
  - Build: `bun run build`
  - Preview prod build: `bun run preview`
  - Tests: `bun run test` (Vitest). Avoid `bun test`.
  - Do not mix managers; prefer one lockfile. If switching, remove `package-lock.json` and commit `bun.lockb`.

## Project Conventions
- Stack: Vite + React + TailwindCSS, React Router, Supabase JS.
- Components live under `src/`, pages in `src/pages/`, API wrappers in `src/api/`.
- Styling: Tailwind utility-first. Prefer semantic groupings, but no hard rules—opt for clarity.
- Routing: BrowserRouter (no hash). Keep routes simple and predictable.
- Environment: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` (not committed).

## Coding Style
- React function components + hooks.
- Name things clearly (prefer descriptive names over abbreviations).
- Keep logic focused per file/component; extract helpers when it improves readability/reuse.
- Add short comments when intent isn’t obvious; avoid noisy commentary.

## Commits & PRs
- Conventional Commits encouraged (e.g., `feat:`, `fix:`, `chore:`).
- Keep PRs small and scoped. Include:
  - What changed and why (one paragraph is enough).
  - Screenshots for UI changes (or a short Loom/GIF).
  - Any Supabase schema/policy changes if applicable.
- Run `npm run build` locally before opening a PR if you touched build/runtime config.

## Tests
- Vitest + React Testing Library (where helpful).
- Prioritize tests for:
  - Bill calculations (per‑person splits, discounts/SC/GST ordering)
  - Routing guards
  - API wrappers (basic happy/edge paths with mocks)

## File References in Discussions
When referencing files in issues/PRs, prefer this style so links are clickable and unambiguous:
- `src/BillSplitter.jsx:42`
- `src/pages/HistoryPage.jsx#L10`

## Supabase Notes
- Keep RLS in mind when adding/removing rows. Most write operations should be scoped by `user_id`.
- Never commit secrets. Use `.env.local` for local keys.

## Release / Deploy
- Vercel rewrites are configured via `vercel.json` to route SPA paths to `index.html`.
- For environment config, ensure Vercel has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set.

## Questions / Changes
Open an issue or start a draft PR early. Short feedback loops beat big rewrites.

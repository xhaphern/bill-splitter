# Repository Guidelines

## Project Structure & Module Organization
The Vite app lives in `src/`, with entry `main.jsx` mounting `App.jsx`. Domain screens reside in `src/pages/`, shared UI such as `AuthBar.jsx` or `BillSplitter.jsx` sits at `src/` root, API wrappers in `src/api/` handle Supabase calls, and Tailwind styles are centralized in `src/index.css`. Public assets are served from `public/` (e.g., `screenshot-main.png`). Build artifacts land in `dist/`; do not edit them manually. Supabase CLI metadata sits under `supabase/.temp/` and should stay untouched for local CLI parity.

## Build, Test, and Development Commands
Run `npm install` once to pull client dependencies. Use `npm run dev` for the local dev server at `http://localhost:5173`. Generate production-ready output with `npm run build`, and smoke-test it locally via `npm run preview`. When working with Supabase locally, the CLI expects `supabase start` from the project root after configuring credentials.

## Coding Style & Naming Conventions
Follow the default Vite + React + Tailwind conventions: ES modules, functional components, and hooks. Indent with two spaces, prefer double quotes for JSX props, and keep Tailwind utility strings grouped by layout → spacing → color. Components and pages are `PascalCase` (`BillDetailPage.jsx`), hooks are `useCamelCase`, and helper functions or variables stay `camelCase`. Co-locate component-specific logic and styles with the component unless they warrant shared Tailwind utilities or API helpers.

## Testing Guidelines
Automated tests are not configured yet; introduce Vitest with React Testing Library when adding critical logic. Place specs beside their subject or under `src/__tests__/` using the `.test.jsx` suffix. Focus assertions on bill calculations, Supabase interaction guards, and routing protections. Until tests exist, document manual QA steps (scenarios, data used) in the pull request.

## Commit & Pull Request Guidelines
Adopt Conventional Commit prefixes (`docs:`, `chore:`, `feat:`) as seen in `git log`. Each commit should cover a single concern and reference issue IDs when available. Pull requests need a clear summary, screenshots or screen recordings for UI changes, Supabase schema diffs when applicable, and verification notes (commands run, manual scenarios). Request review before merging and ensure the branch is rebased on `main`.

## Environment Configuration
Create `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; never commit secrets. For local Supabase, run `supabase login` followed by `supabase start` to provision services. Update `src/supabaseClient.js` only when environment keys change, and keep configuration in sync across environments by documenting any required bucket, RLS, or function setup in your PR.

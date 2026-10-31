# Odyssea: rules for every agent and collaborator

This file is self-contained: contributors may not have the parent workspace's `AGENTS.md`. If this repo sits in Paris's `repos/` workspace, `../AGENTS.md` also applies, and this file wins where they conflict.

Odyssea is co-developed with George. **Before anything else, read [`HANDOFF.md`](HANDOFF.md)**, then follow the planning and handoff process in [`CONTRIBUTING.md`](CONTRIBUTING.md) (flow, plans, roadmap, handoff sections, privacy rule). Questions to people are in Greek; code, comments, docs, commits and PRs are in English.

## Start and end of every session

1. **Start:** read `HANDOFF.md`, then the plan it links to in `docs/plans/`. Continue from "Next".
2. **New feature:** create `docs/plans/NNN-name.md` from `docs/templates/plan.md` and add a line to `docs/ROADMAP.md` before writing code.
3. **End:** update *your own* branch section in `HANDOFF.md` (last done / next / blockers), tick the plan's checkboxes, and commit both on the branch.
4. **After merge:** move the plan to `docs/done/` with an Outcome note, delete the branch's `HANDOFF.md` section, and update `ROADMAP.md`.

## Project overview

A reusable trip-planning site for two travellers: a trip list with a switcher, plus a day-by-day itinerary, a shared budget and practical info for each trip.
- Stack: React 19 + TypeScript + Vite 8 + Tailwind v4 + react-router + i18next + zod.
- Deployed to GitHub Pages at `https://paristat.github.io/odyssea/`.
- Data is JSON in `src/data/trips/<slug>/` for now. Firebase may come later (see `docs/ROADMAP.md`).

## Critical rules

### 1. Code organization
- Many small files: 200–400 lines typical, 800 max. One component per file.
- Pages read data **only through `TripRepository`** (`src/domain/tripRepository.ts`), never by importing JSON directly. Swapping JSON for Firebase must change one line.
- Business logic (budget maths, active-trip choice, FX) lives in `src/domain/` as pure, tested functions.

### 2. Code style
- Immutability always. No `console.log` (`vite build` strips `console.*` anyway).
- **Every user-facing UI string goes through `t()`** (`src/locales/en.json`). Trip content uses `LocalizedText` (`{ "en": "..." }`).
- Money is **integer minor units** (cents). Totals are always EUR. A non-EUR expense must store `rateToEur`.
- Format dates and money with `Intl`, using the current i18n language.
- Tailwind v4 is built at compile time via `@tailwindcss/vite`. Custom CSS goes inside `@layer base`/`@layer components`, because unlayered CSS overrides utilities.
- ESLint includes jsx-a11y. An inline disable needs a `-- reason`.

### 3. Testing
- Vitest + Testing Library (jsdom), with coverage thresholds 80/80/80/75 (`vitest.config.ts`). Domain code is written test-first.
- Playwright smoke tests in `e2e/` build and serve the site, then check routes, CSP and console errors.
- `npm run lint && npm run typecheck && npm test && npm run build` must pass before any commit. CI runs these plus coverage and e2e on every PR.

### 4. Security & privacy (public repo, public site)
- **Never commit an exact address, booking/confirmation code, phone number or document number.** Use the area or arrondissement only. Use first names or nicknames for travellers.
- There are no secrets in the repo. `.env*` is gitignored and must not be read or printed. Only `VITE_*` vars reach the bundle, and everything in the bundle is public.
- GitHub Pages can't set headers, so the CSP `<meta>` is injected at build time (`buildContentSecurityPolicy` in `vite.config.ts`). A new external origin must be added there and to `vite.config.test.ts`.
- No `'unsafe-inline'`, no `dangerouslySetInnerHTML`. External links get `rel="noopener noreferrer"`, and URLs from data are validated as `http(s)` by the zod schema.
- External API responses (Frankfurter) are validated with zod before use.
- Workflows pin actions by SHA. Secrets, if ever needed, are scoped to the single step that uses them.

## File structure

```
HANDOFF.md                 # where each branch left off (read first)
docs/ROADMAP.md            # Now / Next / Later
docs/plans/  docs/done/    # active and finished feature plans; docs/templates/ for new ones
src/main.tsx, App.tsx      # BrowserRouter (basename /odyssea/) + routes
src/i18n.ts, locales/      # i18next setup + UI strings
src/pages/                 # route components
src/components/            # Layout, TripLayout, and the UI pieces
src/domain/                # schemas, repository, pure logic (budget, activeTrip, fx)
src/data/trips/<slug>/     # trip.json, itinerary.json, expenses.json, info.json
e2e/                       # Playwright smoke tests
.github/workflows/         # ci.yml (PRs), deploy.yml (push to main → Pages)
```

## Commands

- `npm run dev` / `npm run build` / `npm run preview`
- `npm run lint` / `npm run typecheck` / `npm test` / `npm run coverage`
- `npm run test:e2e` (the first time, run `npx playwright install chromium`)
- `npm run fx -- USD` prints today's EUR rate to store in a new expense
- `npm run graph` regenerates `docs/code-graph.json`. `npm run graph:check` (run in CI) fails if it's stale, so run `graph` before committing code changes in `src/`.

## Code graph (`docs/code-graph.json`)

`scripts/code-graph.ts` generates this file with the TypeScript compiler API. It covers every module and top-level declaration in `src/`, excluding tests and fixtures.
- **Nodes:** `{ id, kind, name, file, line, exported }`.
  - Ids look like `src/domain/budget.ts#summarizeBudget`, or the file path for a module.
  - `kind` is one of module / data / function / component / hook / class / interface / type / const / enum.
- **Edges:** `{ from, to, kind }`, where `kind` is one of:
  - `imports`: module → module
  - `calls`: functions and methods, including through interfaces
  - `renders`: JSX
  - `uses-type`
  - `references`: a value use, such as a constant or a schema
- The format is flat and sorted with stable string ids, so it maps one-to-one onto a `nodes` and an `edges` table or collection when the project moves to a DB.
- Use it to check impact before changing something: find every edge whose `to` is the id you're about to change.
- Not covered: `import.meta.glob` data loading (`jsonTripRepository` → `src/data/trips/*`) and property reads (`expense.paidBy`).

## Git workflow

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`. No `Co-Authored-By` trailers.
- One feature per branch (`feat/...`, `fix/...`). **Never commit to `main`.** Pushing to `main` deploys to production.
- Open a PR, CI must pass, and the other person reviews. Then merge.

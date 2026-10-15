# Handoff: where we left off

**Read this first, update it last.** There is one section per active branch. Edit only your own section, so merges stay conflict-free.
When a branch merges, delete its section. Its plan moves to `docs/done/` (see `CONTRIBUTING.md` → "Planning & handoff").
New section template: `docs/templates/handoff-entry.md`.

---

## feat/design · Paris (with Claude) · updated 2026-10-16
**Plan:** [docs/plans/001-mvp.md](docs/plans/001-mvp.md) (steps 1–3 of 9 done)
**Last done:**
- Steps 1–2 merged to `main` as PR #1 (squash, `f4bb763`); `feat/scaffold` is deleted.
- Step 3, design:
  - Paris picked **B · Carte postale** out of three mocks on a private Artifact design canvas (Paris owns it; share it from its Share menu so George can open it). The **"B · Live"** board there is the reference for step 4: panel layout, countdown, edit form and motion.
  - Decisions: three themes (White, Wood, Dark); **panels** rather than tabs for the trip sections; a clear live countdown; a slow, even 650ms fade between themes.
- Tokens in `src/index.css` (Tailwind v4): colours `ground surface ink muted line accent tint inverse*` switch per theme through `<html data-theme>`; `shadow-card`; `ease-soft` / `ease-theme`; fonts `font-serif` (Instrument Serif) and `font-sans` (Instrument Sans).
- Fonts are self-hosted with `@fontsource`; the CSP is tightened to `style-src 'self'` and `font-src 'self'` (Google Fonts removed).
- Theme switching: `src/domain/theme.ts` (pure, tested), `src/hooks/useTheme.ts` (applies it, remembers it under the localStorage key `odyssea.theme`, cross-fades), and `ThemeSwitcher` in the header. A first visit follows the system light/dark setting.
- Motion: the colour tokens are registered with `@property`, and only `<html>` animates them during a switch, so all text fades in step and the saved theme paints instantly on load (both checked in Chrome).
- Shell restyled: serif italic wordmark, pill section nav, serif page headings. Page bodies are still placeholders.
- 101 unit tests (coverage about 99.6%), 4 Playwright smoke tests (including "theme survives a reload"); lint, typecheck, build and graph check are green.
**Working mode:** one phase per session. Finish a step, update this file, stop.
**Next session:** step 4, pages, built to match the "B · Live" board:
- Trip header (title, summary, dates) + live countdown (`src/domain/countdown.ts`, test-first).
- Itinerary day cards with date stamps; the New Year's Eve card inverted.
- Budget and Practical info as panels that open on the right and push the itinerary left (stacked at phone width). Keep `/trips/:slug/budget` and `/trips/:slug/info` as deep links that open those panels.
- The `TripSwitcher` dropdown in the header.
**Blockers / notes:**
- Known, accepted: the saved theme is applied by the deferred module script, so a returning Wood/Dark visitor on a slow connection may see one White frame (a Dark system already gets a dark fallback in CSS). The fix would be a tiny external script in `<head>` (CSP allows `'self'`); not worth the duplicated logic yet.
- **Editing in the site** (dates, text) needs a login. GitHub Pages + JSON data has no safe way to write, so it belongs to the Firebase plan (Auth allowlist), not the MVP. Until then, edits are PRs to the JSON.
- George (`PanagopoulosGeorge`) is invited with write access and needs to accept the invite.
- `main` is protected: a PR, 1 approval and the `checks` CI job are required. Admins can bypass.
- `"Friend"` in `trip.json` is a placeholder. **George picks his own nickname** (edit `travellers` in `src/data/trips/paris-2026/trip.json`; keep the id `friend`, or update `splitWith`/`paidBy` too).

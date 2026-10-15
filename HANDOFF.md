# Handoff: where we left off

**Read this first, update it last.** There is one section per active branch. Edit only your own section, so merges stay conflict-free.
When a branch merges, delete its section. Its plan moves to `docs/done/` (see `CONTRIBUTING.md` → "Planning & handoff").
New section template: `docs/templates/handoff-entry.md`.

---

## feat/scaffold · Paris (with Claude) · updated 2026-10-15
**Plan:** [docs/plans/001-mvp.md](docs/plans/001-mvp.md) (steps 1–2 of 9 done)
**Last done:**
- Step 1, the scaffold:
  - Vite 8 + React 19 + TS + Tailwind v4, react-router (routes + 404), i18next (en only).
  - CSP meta, CI and deploy workflows, Dependabot.
  - `HANDOFF.md` + `docs/`.
- Step 2, the domain (`src/domain/`):
  - zod schemas with cross-file checks (unknown payer, day outside the trip, missing `rateToEur`, http(s)-only URLs).
  - `TripRepository` + its JSON implementation (via `import.meta.glob`).
  - `budget.ts`: EUR cents, even split with the remainder going to the first participants, greedy settle-up.
  - `activeTrip.ts` and `fx.ts` (Frankfurter, timeout, zod-validated).
  - `scripts/fx-rate.mjs`.
  - Paris seed data: 6 empty days, travellers `paris` + `friend`, no expenses or info yet.
- Code graph:
  - `scripts/code-graph.ts` → `docs/code-graph.json` (90 nodes, 106 edges; DB-portable nodes + edges).
  - `npm run graph` regenerates it, `npm run graph:check` runs in CI, and there are 7 tests.
  - Format documented in `CLAUDE.md` → "Code graph".
- 77 tests, coverage of about 99%, and lint, typecheck and build are green.
**Working mode:** one phase per session. Finish a step, update this file, stop.
**Next session:** step 3, design. Mock 2–3 directions as an Artifact for Paris (and the friend) to pick from, then turn the chosen one into Tailwind tokens in `src/index.css`.
**Blockers / notes:**
- Waiting on the design choice from Paris.
- No commits yet (the branch is `feat/scaffold` and everything is untracked).
- The repo isn't on GitHub yet (step 9). The friend's GitHub account is `PanagopoulosGeorge`. Invite them as a collaborator once `paristat/odyssea` exists, with Paris's OK at that step.
- `"Friend"` in `trip.json` is a placeholder name; the friend can set their own nickname.

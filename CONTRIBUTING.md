# Contributing to Odyssea

## Setup

```bash
git clone https://github.com/paristat/odyssea.git
cd odyssea
npm ci
npx playwright install chromium   # once, for e2e tests
npm run dev                        # http://localhost:5173/odyssea/
```

The site needs Node 24 (the same as CI). There are no env vars and no secrets.

## Flow

1. Pull `main` and read **`HANDOFF.md`** to see what's in flight and what's next.
2. Create a branch: `git switch -c feat/short-name`.
3. If it's a new feature, write `docs/plans/NNN-name.md` from `docs/templates/plan.md` and add a line to `docs/ROADMAP.md`.
4. Work in small commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`).
5. Before you push: `npm run graph && npm run lint && npm run typecheck && npm test && npm run build`. `npm run graph` refreshes `docs/code-graph.json`, the map of which function calls, renders or uses which. CI fails if it's stale.
6. Before you stop for the day: update your section in `HANDOFF.md` and commit it.
7. Open a PR to `main`. CI must pass and the other person reviews. Merging deploys the site.

## Planning & handoff

| File | Purpose |
|---|---|
| `HANDOFF.md` | One section per active branch: last done, next step, blockers. Edit only your own section. |
| `docs/ROADMAP.md` | Now / Next / Later, with one line per feature. |
| `docs/plans/` | Plans for features that are in progress or planned. |
| `docs/done/` | Finished plans, each with an Outcome note. Moved here when the PR merges. |
| `docs/templates/` | Templates for plans and handoff entries. |

When your PR merges:
- move its plan to `docs/done/` and add the Outcome note
- delete your branch's section in `HANDOFF.md`
- update `ROADMAP.md`

## Privacy rule (the repo and site are public)

Never commit an **exact address, booking code, phone number or document number**. Write the area or arrondissement instead.
Use first names or nicknames for travellers.

## How to…

### Add a trip
1. Create `src/data/trips/<slug>/`, for example `lisbon-2027`. The slug becomes the URL `/trips/lisbon-2027`.
2. Add `trip.json`, `itinerary.json`, `expenses.json` and `info.json`. Copying an existing trip's files is the easiest start.
3. Run `npm test`. The schema tests tell you exactly which field is wrong.

No code change is needed: the trip appears in the switcher and on `/trips` automatically.

### Add an expense in another currency
1. Run `npm run fx -- USD` to print today's rate (1 EUR = x USD).
2. Add the expense with `"currency": "USD"` and `"rateToEur"` set to that rate. Store amounts in minor units, so $12.50 is `1250`.
3. The stored rate keeps the totals stable over time. Tests fail if a non-EUR expense has no rate.

### Add a language
1. Copy `src/locales/en.json` to `src/locales/<code>.json` and translate the values (keep the keys).
2. Register it in `src/i18n.ts` (`SUPPORTED_LOCALES` + `resources`).
3. Trip content (`LocalizedText` fields) can add `"<code>": "..."` next to `"en"`. Missing translations fall back to English.

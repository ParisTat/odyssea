# Roadmap

Features are listed one per line, each linking to its plan. When you add an idea, put it under **Later**. When someone picks it up, write a plan from `templates/plan.md` and move the line to **Now**.

## Now
- [001 · MVP](plans/001-mvp.md): trip list + switcher, itinerary, budget (EUR, with stored FX rates), practical info, Paris as the first trip

## Next
- Paris content: fill in the itinerary once the stay is booked (the area only, never the address)
- Design polish pass (motion, a11y audit with Lighthouse)

## Later
- Firebase: Realtime DB + Auth allowlist for the two of us; `firebaseTripRepository`; Budget + addresses behind a login; admin-only "Edit trip" (title, summary, dates, later days/expenses) as mocked on the design canvas
- Port `docs/code-graph.json` (nodes + edges) into the DB, e.g. a dev-only "code map" page or a query for "what breaks if I change X"
- Translations: an i18next backend loading strings from Firebase; a second locale (Greek?)
- Stay shortlist with a map + an "inside the Périphérique?" check
- Packing list per trip
- Photo gallery per trip (needs storage, so after Firebase)

## Done
- _(nothing merged yet; finished plans live in [done/](done/))_

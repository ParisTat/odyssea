# 002 · Luggage shipping: "send it or check it in?" calculator

| Status | Owner | Branch | Started |
|---|---|---|---|
| Planned (waiting for plan + look approval) | Paris | `feat/luggage-shipping` | 2026-11-15 |

## Context
Airlines charge about 90 EUR per leg for a 10 kg checked bag (180 EUR round trip). Posting the bag
with a courier is often much cheaper, but only for a medium extra piece, not for a big suitcase. The research is in
[`docs/research/luggage-shipping.md`](../research/luggage-shipping.md) (Greek, prices checked 2026-11-06).

"Done" for the MVP: for a trip, the traveller enters the bag (size, weight), the airline fee per leg and the
arrival/departure dates, and gets a clear answer: cost per option vs the airline, an explicit **"not worth it, check the bag"**
verdict when shipping loses, the date to **send it by**, and the **return drop-off deadline**.

## Scope
- In (MVP): pure domain logic and static provider data (no external API, no CSP change), then one calculator panel per trip.
  - Inputs: bag dimensions (cm) + kg, airline checked-bag fee per leg (outbound and return), arrival and departure dates.
  - Outputs: chargeable weight, round-trip cost per option (sorted, with savings vs the airline), verdict, send-by date,
    return drop-off deadline, and options that were excluded with the reason (too heavy, does not fit a locker, no return service).
- Out (later steps below): pickup points near the stay, reminders, packing checklist, provider reviews UI, combos UI, affiliate APIs.
- Privacy: the stay is an area only, never an address (public repo). Prices are "from" prices; every provider value carries `checkedOn`.

## Approach
- Pure, test-first functions in `src/domain/luggage/` (small files):
  - `chargeableWeight.ts`: volumetric = L x W x H / divisor (default 5000, per provider); chargeable = max(actual, volumetric).
  - `providers.ts`: zod schema for providers, routes (outbound/return), pricing (weight bands or locker sizes), transit days, max kg, point hold days, Trustpilot, `checkedOn`.
  - `businessDays.ts` + `shippingDates.ts`: `sendByDate`, `returnDropOffDeadline` (Mon-Fri business days, hold window).
  - `compareOptions.ts`: money as integer cents; every outbound x return route pair is an option (so combos fall out for free), sorted by total, with `savingsCents`, `notWorthIt`, and a top-level verdict.
- Data: `src/data/luggage/providers.json`, validated by the schema in a test. Read it through a small repository (like `TripRepository`) when the UI arrives; the domain never imports JSON.
- Shortcuts, on purpose: business days ignore public holidays; the Eurosender transit is the Standard 6-7 days; BOX NOW Medium price is unknown, so it is skipped (the next size that fits is used, which is the conservative choice).

## Steps
- [x] 1. Research copied into the repo (`docs/research/`), this plan, ROADMAP line.
- [x] 2. Domain, test-first: chargeable weight, provider schema + data, compare options, send-by / drop-off dates. *(parallelisable with 3: independent files)*
- [ ] 3. Plan + look approval: the user answers the open questions below and picks the calculator layout (mock first). *(can run while 2 is done)*
- [ ] 4. Calculator UI per trip (panel in `TripLayout`, i18n strings, e2e smoke test). Needs 2 + 3.
- [ ] 5. Pickup points near the stay (area-level, filtered by bag size and hold days). Needs a data source (open question).
- [ ] 6. Reminders (send day, parcel arrival, pickup expiry, return drop-off) and the packing / prohibited-items checklist. *(5 and 6 are parallel)*
- [ ] 7. Provider cards with Trustpilot score, point vs door, guarantee, insurance; combos shown in the UI. *(parallel with 5 and 6)*
- [ ] 8. Affiliate / partner APIs and live quotes (needs research; adds an origin to the CSP, so zod-validate responses).

## Acceptance criteria (MVP, steps 2 and 4)
- A 10 kg medium bag with a 90 EUR/leg airline fee shows the courier options cheaper than 180 EUR, sorted by total.
- A 30 kg large bag shows "not worth it, check the bag" and no option is marked as a saving.
- Volumetric weight above actual weight raises the price band used; the chargeable weight is shown.
- A bag over a provider's max kg, or not fitting a locker size, is excluded with a reason, never silently dropped.
- A provider with no return service (BOX NOW) never produces a round-trip option on its own.
- The send-by date accounts for transit business days and the point hold window; an impossible window is reported, not hidden.
- Money is integer cents; all UI strings use `t()`; no address, code or phone number in the repo.
- Lint, typecheck, tests (coverage thresholds), build and `graph:check` pass.

## Open questions (from research section 7, need the user)
1. Real BOX NOW Large price to France, and whether the return can go to a BOX NOW locker/point.
2. Eurosender Parcel Shop (point-to-point) price vs door-to-door.
3. Which providers have a public API or affiliate programme.
4. Source for airline baggage fees: manual input only, or a per-airline table?
5. Default scenario and look: "cabin bag + one medium extra piece" and where the calculator lives in the trip page.

## Verification
- `npm run lint && npm run typecheck && npm test && npm run build`, `npm run graph:check`
- `npm run test:e2e` (UI steps)
- Manual: phone and desktop width, light/dark/wood themes (UI steps)

## Outcome (fill in when moving to docs/done/)

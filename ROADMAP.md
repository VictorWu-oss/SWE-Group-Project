# ToiletTracker project roadmap

## Current scope decision

For the current milestone, the team will focus on the Expo mobile app as the
primary deliverable. The React/Vite web client is deferred and should not block
mobile implementation, testing, or demonstration.

## Goal

Deliver a tested mobile MVP in four weeks. The release includes the Expo
mobile app using the Express/SQLite API. The MVP is search, nearby list, 2D
map, bathroom details, cleanliness/busyness ratings, and loading, empty, error,
and location-denied states.

The web app is deferred for this milestone. The current seed records are demo
locations with unverified coordinates and must not be presented as confirmed
campus facts.

## Architecture

```text
Expo mobile app ─── shared API contract/types ─── Express API ─── SQLite
```

Backend logic belongs in `packages/express-backend`; mobile UI in
`packages/mobile-app`; web UI in `packages/react-frontend`. Document shared
response shapes in `docs/api-contract.md` and keep fixtures aligned.

Root commands should include:

```bash
npm run dev:api
npm run dev:web
npm run dev:mobile
npm test
```

## Full-stack ownership

Every person owns API routes, database/seed behavior, mobile UI, web UI, and
tests for one vertical slice.

| Person | Slice | Responsibilities |
|---|---|---|
| Justin | Search, filters, nearby list, details | Search/filter API, metadata, both clients, fixtures, tests |
| Victor | Map, location, directions, accessibility | Map/location behavior, both clients, distance logic, tests |
| Gavin | Ratings, reviews, maintenance reports | Review API, persistence/validation, both forms, aggregates, tests |
| Aaliyah | Mobile integration and release | Mobile integration, shared API client/types, shared states, tests, and builds |

Aaliyah owns a real product area and is not a catch-all for unfinished work.
Testing and code review remain shared responsibilities.

## Async working agreements

The assignment-ready weekly tickets are in [`TICKETS.md`](./TICKETS.md).

Each work session ends with:

```text
Completed:
Next:
Blocked by:
PR/commit:
Tests or screenshots:
```

- Open small PRs by vertical feature.
- Publish API/database changes before another client depends on them.
- Use fixtures or mocks so web and mobile work can proceed asynchronously.
- Integrate at least twice per week; review PRs within 24 hours.
- A feature is complete only when API, database behavior, mobile UI, web UI,
  and tests are present.

## Four-week roadmap

### Week 1 — Cross-platform foundation

**Goal:** both clients run locally and the shared API contract is stable.

**Justin:** define search/filter responses and bathroom metadata; implement
the web discovery foundation; audit mobile discovery; add backend tests.

**Victor:** confirm the map library works on web and mobile; define distance
and permission behavior; scaffold the web map; define fallback states.

**Gavin:** document review validation; implement the web rating form while
preserving mobile submission; test invalid, duplicate, and successful reviews;
decide whether maintenance reports are in scope.

**Aaliyah:** turn the Vite starter into the web shell with routing/navigation;
add `dev:web`, typed API client, fixtures, shared loading/error states, and
web lint/build checks; document startup.

**Gate:** API, web, and mobile start from the documented instructions; MVP
scope and API response shapes are written down.

### Week 2 — Complete vertical slices

**Goal:** the same core journey works on web and mobile against the real API.

**Justin:** deliver search, filters, nearby list, details, empty states, and
no-results behavior on both clients.

**Victor:** deliver map markers, selection, nearby ordering, browser
geolocation, mobile permissions, and fallbacks on both clients.

**Gavin:** deliver rating forms, validation, updated aggregates, duplicate
handling, and community-report wording on both clients.

**Aaliyah:** deliver responsive layout, shared API error handling, web
fixtures, and API-to-web integration checks.

**Gate:** a user can search, view a bathroom in a list or map, open details,
submit a rating, and see updated information on both platforms.

### Week 3 — Cross-platform testing and scope freeze

**Justin:** test filters, search, details, accessibility labels, narrow web
layouts, and missing metadata.

**Victor:** test maps/location in a browser and on a phone or simulator,
including denied location and failed map tiles.

**Gavin:** test ratings on both clients, persistence, API failures,
duplicates, and date-boundary behavior.

**Aaliyah:** run browser/mobile smoke tests, API integration tests, clean
checkout setup checks, and responsive checks. Add Playwright coverage for the
primary web flow if supported.

**Gate:** freeze the MVP. Features without complete API, database, web UI,
mobile UI, and tests move to future work.

### Week 4 — Stabilize and release

**Justin:** fix discovery/details defects and verify final seed data on both
clients.

**Victor:** fix map/location defects, verify attribution, and test browser
and mobile geolocation separately.

**Gavin:** fix rating defects, verify matching aggregates, and confirm
accurate wording about community reports.

**Aaliyah:** run the release checklist; verify web production build, Expo
flow, clean database startup, release notes, and demo script.

**Together:** classify remaining issues as blockers, accepted limitations, or
future work. Preserve regression time.

## Definition of Done

- Search, list, map, details, and ratings work on web and mobile.
- Both clients consume the same documented API.
- The API starts and responds to `/api/health` from a clean checkout.
- SQLite persistence and repeatable seed behavior work without deleting reviews.
- Loading, error, empty, invalid-input, and location-denied states are handled.
- `npm test` passes, including backend tests, web lint/build, and mobile types.
- The main web journey has an automated or documented browser test.
- The main mobile journey has a documented device/simulator check.
- Demo locations and unverified attributes are clearly labeled.
- Text does not claim live occupancy, verified ratings, or guaranteed
  one-person-one-review behavior.
- Setup instructions, limitations, test evidence, and ownership are documented.

## Deferred backlog

Do not implement these without a confirmed data source, owner, and acceptance
criteria: step-free routes and verified accessibility data; menstrual products,
baby-changing, hooks, shelves, and stall types; staff-only bathrooms; opening
hours; maintenance reports; rating comments/moderation; rating expiry; 3D map;
chat; and advanced routing.

## Risks and responses

| Risk | Response |
|---|---|
| Web/mobile behavior diverges | Require both clients in every feature PR and test the same fixtures |
| API changes block frontend work | Publish contracts first and use fixtures/mocks |
| Location data is unverified | Label the release as a demo; never guess campus facts |
| Phone cannot reach the API | Test LAN setup in Week 2 and retain location fallback |
| Optional stories consume time | Freeze scope in Week 3 and preserve Week 4 for regression |

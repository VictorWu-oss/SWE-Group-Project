# ToiletTracker — slide-ready presentation

**Format:** Markdown slides. No PowerPoint authoring package or office renderer
is installed in the project environment. No screenshots are included: the
available browser capture rendered at an incorrect viewport, and an iOS
simulator is unavailable on this machine. Capture the flow on a physical device
before presenting.

---

## 1. Find a bathroom with less guesswork

ToiletTracker helps people find bathrooms around Cal Poly SLO, inspect
community-reported cleanliness and busyness, and submit a report without
creating an account.

- Search by bathroom or building
- Browse a map and synchronized list with combined directory filters
- Use optional location to sort by distance
- Inspect bathroom details, community reports, hours, directions, and
  maintenance status
- See clear demo-data, unknown-data, and report-freshness labels

---

## 2. Discovery and details

The mobile flow connects bathroom search, rating filters, list/map selection,
details, and community reports.

- Search results update the map markers and list together.
- Filters combine average cleanliness, fresh busyness, verified restroom type,
  accessibility, and amenities. Sorting supports name, distance, and rating.
- Tapping a marker or list row opens the matching detail route.
- Detail views show review count, busyness freshness, hours status, sourced
  directory fields, directions, maintenance reports, and verification state.

---

## 3. Location and reporting

- Location permission is requested only after the user taps **Use location**.
- With a location, results sort by haversine distance and the map shows a
  location marker.
- Without location, search and map/list browsing remain available and results
  sort alphabetically.
- Cleanliness uses an integer **1–5**; busyness uses **Low/Medium/High**.
- Hours are evaluated in the bathroom timezone; overnight hours are supported.
  Unknown hours are never assumed open. Busyness older than **24 hours** is
  labeled stale and excluded from busyness filters.
- Reports are anonymous per installation, limited to one per bathroom per
  `America/Los_Angeles` calendar day, and explicitly not described as live or
  one-person-one-vote.
- Maintenance reports begin as **Submitted**; only authorized backend
  administrators can change workflow status or verify directory entries.

---

## 4. Architecture and contract

```text
Expo Router / React Native
  ├─ Discovery route: search, rating filters, map + list
  ├─ Bathroom route: hours, features, directions, reports
  ├─ Rating and maintenance-report forms
  ├─ Expo Location: opt-in current position
  └─ Leaflet in WebView: OpenStreetMap tiles + marker bridge
             │ EXPO_PUBLIC_API_URL
             ▼
Express API ─ SQLite
  ├─ GET /api/bathrooms[?search=...]
  ├─ GET /api/bathrooms/:id
  └─ POST /api/bathrooms/:id/reviews
  ├─ POST /api/bathrooms/:id/maintenance-reports
  └─ Admin-only directory/status update routes
```

- The mobile client validates API responses at runtime.
- The server validates review fields and returns explicit `400`, `404`, and
  `409` error envelopes.
- SQLite stores reviews and calculates aggregates; its unique constraint
  protects the per-installation/day limit.
- Schema migration keeps existing bathroom and review records while adding
  nullable directory data, verification, and maintenance workflows.
- OpenStreetMap and unpkg map assets require internet access; no map API key is
  configured or needed.

---

## 5. Three behavior-preserving refactorings

1. **Discovery logic extracted** — search, Haversine distance, sorting, and
   formatting moved from screen rendering into pure functions with unit tests.
2. **Shared summary query** — list/search/detail share a parameterized query
   and mapper; detail reads only the requested bathroom.
3. **Review validation separated** — field validation is performed before
   starting the database transaction; transaction and duplicate handling stay
   atomic.

The runtime API parser and Expo Router migration are feature/integration work,
not counted as TE5 refactorings. Full before/after notes and deferred candidates
are in [`refactoring.md`](./refactoring.md).

---

## 6. Validation

- `npm test` — **passed**: 16 backend tests, 8 mobile tests, frontend lint/build,
  and mobile TypeScript check.
- Added backend tests for verified/unverified directory behavior, protected
  management routes, maintenance report workflow, migration/review
  preservation, timezone/overnight hours, and busyness staleness.
- Added mobile tests for combined directory filters, stale busyness, null
  coordinates, and API model compatibility.
- `expo export --platform ios --platform android` — **passed**; both bundles
  generated after these changes.
- Browser smoke check — Expo web loaded a bathroom detail route and showed
  unknown hours, unknown directory features, sourced-safety empty state, and
  the maintenance form.
- Screenshots — not included because the browser capture was distorted and
  this machine has no iOS simulator; capture on a physical device before
  presenting.
- Physical phone permission flow, native Leaflet tiles, and LAN connectivity
  remain manual release checks.

---

## 7. Demo walkthrough

1. Start the API: `npm run dev:api`
2. Start Expo: `npm run dev:mobile -- --lan`
3. Search and combine rating, restroom type, accessibility, and amenity
   filters; sort results and clear filters.
4. Tap a list row or map marker to inspect details.
5. Inspect unverified hours/features, busyness freshness, and safety-source
   caveats.
6. Tap **Get directions**; demo entries with coordinates open a maps link.
7. Submit cleanliness and busyness values; show success and updated aggregate.
8. Submit a maintenance report; show its initial status and explain
   administrator-only status changes.
9. Tap **Use location** to request permission; demonstrate alphabetical
   fallback if permission is denied.
10. Submit a rating again and show the duplicate-report response.

See the README for device-specific `EXPO_PUBLIC_API_URL` setup.

---

## 8. Limitations and next steps

- Checked-in bathroom records and coordinates are **demo/unverified**.
- No approved campus data owner/source for opening hours, accessibility,
  amenities, or safety context has been configured; these values remain
  unknown. Issue #44's safety-location proximity view needs an approved
  source/decision before it can truthfully be populated.
- Directory verification and report management are backend-token protected,
  but there is no staff account/role or admin user interface.
- The official [Cal Poly Interactive Map](https://maps.calpoly.edu/) has a
  public gender-inclusive restroom layer (66 records when checked), but its
  description dates the data to June 2024, calls it advisory/as-is, and the
  layer is marked export-disabled. The team chose to keep demo data and not
  copy/import those records. See [`campus-data.md`](./campus-data.md).
- The official subset is not a complete campus bathroom directory.
- Busyness is the latest report, not real-time occupancy; it is marked stale
  after the current 24-hour project threshold.
- No verified accessibility route, campus-wide safety proximity data, 3D map,
  or text chat is claimed as implemented.

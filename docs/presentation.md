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
- Browse a map and synchronized list
- Use optional location to sort by distance
- See clear demo-data and report-freshness labels

---

## 2. Discovery and details

The mobile flow connects bathroom search, rating filters, list/map selection,
details, and community reports.

- Search results update the map markers and list together.
- Filters use an average cleanliness rating of **4+** and the latest
  **Low/Medium/High** community busyness report.
- Tapping a marker or list row opens the matching detail route.
- Detail views show review count, average, latest report, and demo status.

---

## 3. Location and reporting

- Location permission is requested only after the user taps **Use location**.
- With a location, results sort by haversine distance and the map shows a
  location marker.
- Without location, search and map/list browsing remain available and results
  sort alphabetically.
- Cleanliness uses an integer **1–5**; busyness uses **Low/Medium/High**.
- Reports are anonymous per installation, limited to one per bathroom per
  `America/Los_Angeles` calendar day, and explicitly not described as live or
  one-person-one-vote.

---

## 4. Architecture and contract

```text
Expo Router / React Native
  ├─ Discovery route: search, rating filters, map + list
  ├─ Bathroom route: latest details + review form
  ├─ Expo Location: opt-in current position
  └─ Leaflet in WebView: OpenStreetMap tiles + marker bridge
             │ EXPO_PUBLIC_API_URL
             ▼
Express API ─ SQLite
  ├─ GET /api/bathrooms[?search=...]
  ├─ GET /api/bathrooms/:id
  └─ POST /api/bathrooms/:id/reviews
```

- The mobile client validates API responses at runtime.
- The server validates review fields and returns explicit `400`, `404`, and
  `409` error envelopes.
- SQLite stores reviews and calculates aggregates; its unique constraint
  protects the per-installation/day limit.
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

- `npm test` — **passed**
  - Backend: **8 tests passed**, covering search/list/detail, validation,
    unknown locations, duplicate/concurrent reviews, persistence, and LA date
    boundaries.
  - Mobile utilities: **6 tests passed**, covering search, location sorting,
    no-location fallback, rating filters, distance labels, and API model
    compatibility.
  - React frontend lint/build and mobile TypeScript check passed.
- `expo export --platform ios --platform android` — **passed**; both bundles
  generated.
- Browser smoke check — app loaded demo bathrooms and navigated to the correct
  details/review route.
- Screenshots — not included because the browser capture was distorted and
  this machine has no iOS simulator; capture on a physical device before
  presenting.
- Physical phone permission flow, native Leaflet tiles, and LAN connectivity
  remain manual release checks.

---

## 7. Demo walkthrough

1. Start the API: `npm run dev:api`
2. Start Expo: `npm run dev:mobile -- --lan`
3. Search for a bathroom or building; apply **Cleanliness 4+** or a busyness
   filter, then clear the filters.
4. Tap a list row or map marker to inspect details.
5. Tap **Use location** to request permission; demonstrate alphabetical
   fallback if permission is denied.
6. Submit cleanliness and busyness values; show the updated aggregate.
7. Submit again and show the duplicate-report response.

See the README for device-specific `EXPO_PUBLIC_API_URL` setup.

---

## 8. Limitations and next steps

- Checked-in bathroom records and coordinates are **demo/unverified**.
- The official [Cal Poly Interactive Map](https://maps.calpoly.edu/) has a
  public gender-inclusive restroom layer (66 records when checked), but its
  description dates the data to June 2024, calls it advisory/as-is, and the
  layer is marked export-disabled. The team chose to keep demo data and not
  copy/import those records. See [`campus-data.md`](./campus-data.md).
- The official subset is not a complete campus bathroom directory.
- Busyness is the latest report, not real-time occupancy.
- No accessibility-route, hours, maintenance-report, direction, 3D map, or chat
  feature is claimed as implemented.

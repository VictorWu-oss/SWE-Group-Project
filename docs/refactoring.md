# TE5 refactoring record

## Requirements available

GitHub issue #54 is titled “TE5- 3 Tickets Refactoring” but has no issue body,
comments, child issues, or acceptance criteria. The three changes below are
therefore a practical interpretation of the title: separate implementation
work from the feature tickets, preserve behavior, and run tests that cover the
refactored paths. No teammate reviews are claimed.

## Refactoring candidates

| # | Location | Code smell | Priority | Proposed improvement |
|---|---|---|---|---|
| 1 | [`CampusMapScreen.tsx`](../packages/mobile-app/src/2d/CampusMapScreen.tsx) | Search filtering, distance calculation, and sorting were embedded in the screen component, making the result rules hard to test independently. | P1 | Extract a pure discovery utility for name/building search, haversine distance, and distance/alphabetical ordering; add deterministic unit tests. **Selected and implemented.** |
| 2 | [`reviewService.js`](../packages/express-backend/src/services/reviewService.js) | `getBathroomSummary` previously built every bathroom aggregate and scanned the full list to find one ID; list and detail query projections could drift. | P1 | Share one parameterized query builder for list/search/detail, adding safe fixed SQL filters for one ID or search text. **Selected and implemented.** |
| 3 | [`reviewService.js`](../packages/express-backend/src/services/reviewService.js) | `submitReview` mixed request validation with transaction and persistence logic. | P2 | Extract deterministic review-input validation before beginning the transaction; preserve validation order and messages. **Selected and implemented.** |
| 4 | [`CampusMap.tsx`](../packages/mobile-app/src/2d/CampusMap.tsx) | Map HTML generation, marker styling, external tile configuration, and WebView message parsing live in one component. | P2 | Move HTML generation and bridge-message parsing to focused helpers with tests; retain attribution and keep the React Native component responsible for WebView lifecycle. Deferred to avoid broadening the map ticket. |
| 5 | [`api.ts`](../packages/mobile-app/src/main/api.ts) | The previous generic request helper asserted arbitrary JSON as the requested TypeScript type and assumed every response was valid JSON. | P1 | Validate the bathroom response and error envelopes at runtime; represent HTTP failures with status and a user-readable message. Addressed as required TT-103 contract work; not counted as one of the three TE5 changes. |
| 6 | `src/main/App.tsx` (removed) | One root component previously owned installation-ID persistence, API loading, error/empty rendering, and screen composition. | P2 | Separate shared app data from routed discovery and detail screens. Replaced as TT-101/TT-104 navigation integration; not counted as one of the three TE5 changes. |
| 7 | [`BathroomDetailsScreen.tsx`](../packages/mobile-app/src/rating/BathroomDetailsScreen.tsx) | The details screen combined rating submission, directory facts, directions, safety context, and maintenance-report state and UI. | P1 | Extract directory presentation and maintenance-report behavior into focused components while leaving rating flow and screen navigation in the screen. **Selected and implemented.** |

## Implemented refactorings

### 1. Discovery calculations extracted from the screen

**Before:** the screen owned the query predicate, Haversine calculation,
location-aware sort, and distance formatting alongside rendering and
permission-state UI.

**After:** [`discovery.ts`](../packages/mobile-app/src/main/discovery.ts)
contains the pure search/sort/distance functions; the screen supplies its
current data and renders the results. Map markers and list rows use the same
filtered result set.

**Validation:** [`discovery.test.mjs`](../packages/mobile-app/tests/discovery.test.mjs)
covers matching name/building search, no matches, distance ordering,
alphabetical fallback, and distance labels.

### 2. Shared, filtered bathroom-summary query

**Before:** single-detail lookup loaded and mapped every bathroom summary,
then searched the in-memory array. The list/detail SQL projections were
separate.

**After:** the shared `getBathroomRows` query builds parameterized, fixed
filters for full lists, optional search, and one bathroom ID. List and detail
routes use the same projection and row mapping; detail lookup only returns the
requested bathroom.

**Validation:** backend service and API tests cover list ordering, case-
insensitive search, empty search results, detail lookup, unknown IDs, and
review aggregates.

### 3. Review input validation separated from persistence

**Before:** `submitReview` validated fields and performed transaction setup,
duplicate checks, insert/update, and rollback in one function.

**After:** `validateReviewInput` checks the body and canonical rating values
before the transaction begins. The persistence function remains responsible
for atomicity and translating unique-constraint conflicts into the existing
409 response.

**Validation:** backend API/service tests cover valid and concurrent duplicate
submissions, invalid cleanliness, malformed JSON, unknown bathrooms,
Los Angeles calendar-day rollover, and persistence after database restart.

### 4. Bathroom detail responsibilities separated

**Before:** the detail screen mixed rating form behavior with directory/hour/
safety/directions presentation and maintenance-report loading, submission,
and history.

**After:** [`BathroomDirectoryDetails.tsx`](../packages/mobile-app/src/rating/BathroomDirectoryDetails.tsx)
owns the directory facts and directions presentation.
[`MaintenanceReportsSection.tsx`](../packages/mobile-app/src/rating/MaintenanceReportsSection.tsx)
owns report loading, submission, error/retry feedback, and report history.
[`BathroomDetailsScreen.tsx`](../packages/mobile-app/src/rating/BathroomDetailsScreen.tsx)
continues to own the overall detail layout, rating submission, and navigation.
The extraction keeps unknown/unverified data explicit and distinguishes report
submission errors from report-list loading errors.

**Validation:** `npm run check` passed: all 16 backend tests and 8 mobile tests
passed, frontend ESLint and production build passed, and the mobile TypeScript
check passed. `git diff --check` also passed. Mobile tests emit the existing
Node `MODULE_TYPELESS_PACKAGE_JSON` warning for `discovery.ts`; it is
non-blocking.

## Behavior-preservation notes

- The existing rating fields and values remain `installationId`,
  `cleanliness` (integer 1–5), and `busyness` (`Low` / `Medium` / `High`).
- Reviews remain anonymous per installation and one-per-bathroom per
  `America/Los_Angeles` calendar day; no account or authorization model was
  added.
- Search is a case-insensitive substring match on bathroom name or building.
- Without location, discovery still sorts alphabetically.

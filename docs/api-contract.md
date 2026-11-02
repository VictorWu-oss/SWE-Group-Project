# Mobile bathroom API contract

The mobile app calls the Express API at `EXPO_PUBLIC_API_URL` (default
`http://localhost:3000/api`). The current API is account-free. Review
identification uses an anonymous installation ID stored by the client; it is
not authentication and does not prove one person submitted only one review.

## Bathroom summary

Every successful list, details, and review response uses the following shape:

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable bathroom identifier |
| `name` | string | Bathroom name |
| `building` | string | Building label |
| `latitude` | number or `null` | Decimal-degree latitude; `null` disables map pin/directions |
| `longitude` | number or `null` | Decimal-degree longitude; `null` disables map pin/directions |
| `demo` | boolean | `true` means demo/unverified location data |
| `averageCleanliness` | number from 1–5 or `null` | Mean of saved cleanliness reports, rounded to one decimal |
| `reviewCount` | non-negative integer | Number of saved reports |
| `busyness` | `Low`, `Medium`, `High`, or `null` | Latest community busyness report |
| `busynessReportedAt` | ISO timestamp or `null` | Time of the latest busyness report |
| `busynessStatus` | `unknown`, `current`, or `stale` | `current` means reported within 24 hours; future/invalid timestamps are unknown |
| `reviewedToday` | boolean | Whether this installation submitted today in the LA calendar |
| `restroomType` | `single-stall`, `multi-stall`, or `null` | Unknown until entered by an authorized directory editor |
| `amenities` | object or `null` | Tri-state fields: `babyChanging`, `menstrualProducts`, `hooks`, `shelves`; values are facts only for a verified directory |
| `accessibility` | object or `null` | Tri-state fields: `wheelchairAccessible`, `grabBars`, `accessibleSink`, `stepFreeRoute`; unknown is not false |
| `hours` | weekly object or `null` | Days `sun` through `sat`; `null` means unknown, `[]` means explicitly closed, intervals use local `HH:MM` and support overnight closing |
| `timezone` | IANA timezone or `null` | Bathroom's local timezone for operating hours |
| `openStatus` | `open`, `closed`, or `unknown` | Calculated only from verified hours using the bathroom's local timezone |
| `indoorDirections` | string or `null` | Verified building/entrance instructions |
| `safetyInfo` | list | Each entry includes `text`, `source`, `kind` (`campus_source` or `user_report`), `updatedAt`, and `verified`; no safety guarantees are implied |
| `directoryVerified` | boolean | Only set by an authorized directory update |
| `verificationSource` | string or `null` | Source recorded with the last directory review |
| `verifiedAt` | ISO timestamp or `null` | Time of current verification |
| `verifiedBy` | string or `null` | Server-configured administrator display name |

Identity fields are required. Coordinates can be unknown. The mobile client accepts omitted
aggregate/status fields for compatibility: averages, busyness and timestamp
become `null`; count becomes `0`; `reviewedToday` becomes `false`; missing
`demo` becomes `true` so older responses are not accidentally presented as
verified locations. Present but malformed fields cause a visible response
error, not a successful empty result.

The discovery screen combines loaded summaries by average cleanliness `4+`,
fresh latest busyness (`Low`, `Medium`, or `High`), verified restroom type,
verified accessibility, and verified amenities. Combined filters use AND
semantics; fields with `null`/unknown values never match. Stale busyness is
older than 24 hours and does not match an active busyness filter. Sorting
supports recommended (distance when opted-in, otherwise name), name, distance,
and rating. The same filtered records are used by the map and list.

All bathroom locations and directory attributes begin unverified. Missing hours
are `unknown`, never assumed open. `openStatus` is calculated by the API only
when the directory record is verified and its schedule/timezone are valid.
No approved campus hours, amenities, accessibility, or safety-information
source has been imported.

## Routes

### `GET /bathrooms?installationId=<id>&search=<text>`

Both query parameters are optional. `installationId` controls
`reviewedToday`; `search` performs a case-insensitive substring match against
the bathroom name or building. Search is optional, whitespace is trimmed, and
an empty search returns the full directory.

**200**

```json
{ "bathrooms": [{ "id": "demo-university-union", "name": "Demo Bathroom 01", "building": "University Union", "latitude": 35.3002, "longitude": -120.6608, "demo": true, "averageCleanliness": null, "reviewCount": 0, "busyness": null, "busynessReportedAt": null, "reviewedToday": false }] }
```

No matches are a successful empty result:

```json
{ "bathrooms": [] }
```

### `GET /bathrooms/:bathroomId?installationId=<id>`

Returns `{ "bathroom": <BathroomSummary> }` with `200`, or
`{ "error": "Bathroom not found." }` with `404`.

### `POST /bathrooms/:bathroomId/reviews`

Required JSON request:

```json
{
  "installationId": "tt-example-installation-id",
  "cleanliness": 4,
  "busyness": "Medium"
}
```

`cleanliness` must be an integer from 1 through 5. `busyness` must be exactly
`Low`, `Medium`, or `High`. `installationId` must match
`^[A-Za-z0-9._:-]{8,128}$`. The bathroom ID comes from the URL.

| Status | Response |
|---|---|
| `201` | `{ "bathroom": <updated BathroomSummary> }` |
| `400` | `{ "error": "<validation message>" }`, including malformed JSON |
| `404` | `{ "error": "Bathroom not found." }` |
| `409` | `{ "error": "You've already submitted today's review for this bathroom." }` |
| `500` | `{ "error": "The server could not complete the request." }` |

The backend enforces one review per installation, bathroom, and
`America/Los_Angeles` calendar day with a SQLite unique constraint. A successful
response contains the refreshed aggregate and `reviewedToday` status. Busyness
is a community report with a timestamp, not live occupancy.

### `PATCH /bathrooms/:bathroomId/directory`

Requires `Authorization: Bearer <ADMIN_API_TOKEN>`. The server returns `503`
when no administrator token is configured and `401` for missing/invalid
credentials. This credential is server-side only and must never be embedded in
the mobile application.

The JSON body requires `verified` (boolean) and `source` (3–300 characters).
Optional fields may update the name, building, nullable coordinates, restroom
type, tri-state amenities/accessibility, local timezone and weekly hours,
indoor directions, and sourced safety notes. Example:

```json
{
  "verified": true,
  "source": "Facilities inspection, ticket FM-123",
  "latitude": null,
  "longitude": null,
  "restroomType": "single-stall",
  "amenities": {
    "babyChanging": true,
    "menstrualProducts": null,
    "hooks": false,
    "shelves": null
  },
  "accessibility": {
    "wheelchairAccessible": true,
    "grabBars": true,
    "accessibleSink": null,
    "stepFreeRoute": null
  },
  "timezone": "America/Los_Angeles",
  "hours": {
    "sun": [],
    "mon": [{"open": "08:00", "close": "22:00"}],
    "tue": [{"open": "08:00", "close": "22:00"}],
    "wed": [{"open": "08:00", "close": "22:00"}],
    "thu": [{"open": "08:00", "close": "22:00"}],
    "fri": [{"open": "08:00", "close": "22:00"}],
    "sat": null
  },
  "indoorDirections": "Second floor, east entrance",
  "safetyInfo": [{
    "text": "Campus escort service is available.",
    "source": "Campus Safety",
    "kind": "campus_source",
    "updatedAt": "2026-10-31T12:00:00.000Z",
    "verified": true
  }]
}
```

For each weekday, `null` means unknown, `[]` means confirmed closed, and
intervals with `close` earlier than `open` continue overnight. A valid IANA
timezone is required when a schedule is supplied. The admin name comes from
`ADMIN_DISPLAY_NAME`; verification dates are assigned by the API. Setting
`verified: false` clears current verifier/date and marks the record demo or
unverified. Re-seeding updates names/coordinates only while an entry is
unverified and never removes reviews.

### `GET /bathrooms/:bathroomId/maintenance-reports`

Returns up to 50 reports for that bathroom, newest first. Public response
records include their category, description, workflow status, and timestamps,
but not the submitter's installation ID.

### `POST /bathrooms/:bathroomId/maintenance-reports`

Request: `{ "installationId": "tt-example-installation-id", "category": "fixture", "description": "Sink faucet is leaking." }`.
Categories are `cleanliness`, `supplies`, `fixture`, `accessibility`,
`safety`, and `other`; descriptions must be 5–500 characters. A successful
submission returns `201` with a report in `open` status. Reports are user
submissions, not confirmed maintenance events.

### `PATCH /bathrooms/maintenance-reports/:reportId`

Requires the administrator bearer token. The request body is
`{ "status": "in_progress" }`. Allowed statuses are `open`, `in_progress`,
`resolved`, and `dismissed`. The API assigns the update time and configured
administrator name; unauthenticated management is not available.

## Fixtures

- [`bathrooms-list.json`](./fixtures/bathrooms-list.json): normal list.
- [`bathrooms-empty.json`](./fixtures/bathrooms-empty.json): no search matches.
- [`bathroom-missing-optionals.json`](./fixtures/bathroom-missing-optionals.json):
  compatibility shape with optional fields omitted.

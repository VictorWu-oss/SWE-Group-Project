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
| `latitude` | number | Decimal-degree latitude |
| `longitude` | number | Decimal-degree longitude |
| `demo` | boolean | `true` means demo/unverified location data |
| `averageCleanliness` | number from 1–5 or `null` | Mean of saved cleanliness reports, rounded to one decimal |
| `reviewCount` | non-negative integer | Number of saved reports |
| `busyness` | `Low`, `Medium`, `High`, or `null` | Latest community busyness report |
| `busynessReportedAt` | ISO timestamp or `null` | Time of the latest busyness report |
| `reviewedToday` | boolean | Whether this installation submitted today in the LA calendar |

Coordinates and identity fields are required. The mobile client accepts omitted
aggregate/status fields for compatibility: averages, busyness and timestamp
become `null`; count becomes `0`; `reviewedToday` becomes `false`; missing
`demo` becomes `true` so older responses are not accidentally presented as
verified locations. Present but malformed fields cause a visible response
error, not a successful empty result.

The discovery screen can filter loaded summaries by average cleanliness `4+`
and latest busyness (`Low`, `Medium`, or `High`). A missing aggregate/report
does not match an active corresponding filter. These are community reports,
not official quality or occupancy guarantees.

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

## Fixtures

- [`bathrooms-list.json`](./fixtures/bathrooms-list.json): normal list.
- [`bathrooms-empty.json`](./fixtures/bathrooms-empty.json): no search matches.
- [`bathroom-missing-optionals.json`](./fixtures/bathroom-missing-optionals.json):
  compatibility shape with optional fields omitted.

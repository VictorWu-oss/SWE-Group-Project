# Directory, hours, safety, and maintenance

## Data trust and ownership

Bathrooms remain demo/unverified until an authorized editor records a source
and verifies the directory entry. Existing seed rows are not promoted to
verified, and new attributes default to unknown. The SQLite schema migration
preserves bathrooms and reviews while allowing coordinates to be unknown.
Re-seeding does not erase reviews or overwrite a verified directory entry.

The project has not received an approved campus owner/source for opening hours,
amenities, accessibility, or safety information. The official Cal Poly
Interactive Map layer described in [campus-data.md](./campus-data.md) is not
treated as permission to import its records. Consequently, demo records show
unknown operating hours, unknown accessibility/amenities, and no safety
information. Do not populate these with guesses.

`ADMIN_API_TOKEN` enables directory and maintenance workflow actions, and
`ADMIN_DISPLAY_NAME` identifies the administrator on verification records.
Both are backend-only settings. Keep the token out of the mobile `.env`, source
control, screenshots, and client requests. If the token is unset, management
endpoints return `503`; incorrect or absent credentials return `401`.

Configure these values in
`packages/express-backend/.env` only after a project owner assigns an
administrator and supplies an approved data source:

```dotenv
ADMIN_API_TOKEN=replace-with-a-private-random-token
ADMIN_DISPLAY_NAME=Facilities data owner
```

See [api-contract.md](./api-contract.md) for the authorized directory request
shape. Authorized directory updates record their source, timestamp, and
configured administrator name. Setting `verified: false` withdraws the
verified state.

## Hours and busyness rules

- Each weekday has an array of local-time intervals, `[]` for confirmed
  closed, or `null` for unknown. Schedules require a valid IANA timezone.
- Intervals can cross midnight; for example, `22:00` to `02:00` remains open
  after midnight. The API computes `openStatus` in the bathroom timezone.
- Only a verified directory schedule can produce open/closed. Missing,
  incomplete, invalid, or unverified hours return `unknown`.
- A community busyness report is current for 24 hours, then stale. This is a
  conservative project default because issue #43 has no comments specifying
  an agreed age boundary. The original timestamp remains visible. Stale and
  future/invalid reports do not match busyness filters. Busyness is never
  represented as live occupancy.

## Directory attributes and filters

Restroom type is `single-stall` or `multi-stall`; `null` is unknown. Amenity
and accessibility fields are tri-state booleans. A `false` value means an
authorized source confirmed the feature is not available; `null` means
unknown. Discovery filters only match verified `true` attributes.

Filters combine with AND semantics across search, community ratings, restroom
type, accessibility, and amenities. Multiple selected accessibility and
amenity filters must all match. Sorting options are recommended (distance when
location has been explicitly enabled, otherwise name), name, distance, and
rating. One result set drives both map markers and list rows. Unknown
coordinates remain in the list, but do not produce markers or directions.

The details screen distinguishes verified facts, confirmed-unavailable
features, and unknown/unverified data. A verified indoor directions string is
displayed only when present.

## Safety limitations

Safety notes are stored with text, source, update timestamp, verification flag,
and `kind` (`campus_source` or `user_report`). The interface labels user
reports separately from source information and marks unverified information
explicitly; it never makes a safety guarantee. No safety
locations, lighting layer, or trusted safety source is currently configured,
so no safety notes or proximity filtering are seeded. Issue #44 needs campus
approval of the source and whether the app should show contextual notes or
proximity results before that information can be populated.

## Maintenance report workflow

1. A user selects a category and submits a 5–500 character description for a
   specific bathroom. The installation ID is recorded privately to support
   abuse investigation but is not returned in public list responses.
2. The report is stored with status `open`; the app confirms that submission
   is not staff confirmation and lists public report status/timestamps.
3. An administrator may set `open`, `in_progress`, `resolved`, or `dismissed`
   using `PATCH /bathrooms/maintenance-reports/:reportId` and the backend
   bearer token. The API records the update timestamp and configured admin
   name.

There is no staff account/role system in this app. Until one is established,
the backend token is a deployment-level administrative gate; keep it private
and use only from a trusted administrator environment. User submissions are
not automatically verified or represented as a promise of service response.

## Branch-flow recovery

| Branch from the discovery/rating journey | User feedback and recovery |
|---|---|
| Location denied/unavailable | Explain location is optional; keep map/list/search active; allow an explicit retry. |
| Search/filter has no matches | Explain that all active filters must match; clear filters or edit/clear search. |
| Bathroom removed or detail request returns 404 | Show an unavailable-details state and return to the directory. |
| Rating or maintenance input is incomplete/invalid | Disable submission until required values/length are valid; show API validation errors inline. |
| API/network failure | Keep an actionable retry for directory/details; preserve form selections and permit submission retry; maintenance history has a retry action. |
| Rating accepted or duplicate | Show success and refreshed aggregate; on duplicate, fetch the current record and explain the daily limit. |

The full user journey and alternate states are also listed in
[mobile-storyboard.md](./mobile-storyboard.md).

# Testing

## Testing setup

The project uses Node's built-in `node:test` runner. No separate test framework or external service is required for isolated backend unit tests.

Backend unit tests run against an in-memory SQLite database; the review persistence test uses a temporary SQLite file and removes it after the test. Mobile and backend contract tests start the real Express app on an ephemeral local port.

Unit-test tools and commands:

- Tool: Node.js built-in `node:test` runner.
- Mocking: no external HTTP or database mocks are needed; backend units use in-memory SQLite, and pure mobile/React helpers receive plain objects and coordinates.
- Run every unit-test package: `npm run test:unit`.
- Run backend units: `npm run test:unit --workspace express-backend`.
- Run mobile units: `npm run test:unit --workspace mobile-app`.
- Run React units: `npm run test:unit --workspace react-frontend`.
- Run direct backend units, including review, maintenance, and hours: `node --test packages/express-backend/tests/reviewService.test.js packages/express-backend/tests/maintenanceService.test.js packages/express-backend/tests/hours.test.js`.

Other existing commands:

```sh
npm test --workspace express-backend
npm test --workspace mobile-app
npm test --workspace react-frontend
npm test
```

The workspace backend test command currently imports authentication dependencies in the complete suite. If `bcryptjs` or another workspace dependency is missing, restore dependencies with `npm install` before retrying the complete suite.

## Red–Green–Refactor: Unicode-safe maintenance descriptions

### Requirement

Maintenance descriptions must:

- contain 5–500 characters after surrounding whitespace is removed;
- count Unicode characters instead of JavaScript UTF-16 code units;
- return the trimmed description for persistence;
- reject non-string, too-short, and too-long descriptions with status `400` and the existing client-facing validation message.

### Initial test

The meaningful red test was added to [maintenanceService.test.js](/Users/justintran/SWE-Group-Project/packages/express-backend/tests/maintenanceService.test.js). It creates a maintenance report whose description contains four wrench emoji and asserts that the service rejects it:

```js
test('rejects descriptions shorter than five Unicode characters', () => {
  // ...
  description: '🔧🔧🔧🔧',
  // ...
});
```

The test exercised `createMaintenanceReport` and its SQLite-backed validation behavior. It was not a setup-only failure.

### Red command and actual result

```sh
node --test --test-name-pattern="rejects descriptions shorter than five Unicode characters" packages/express-backend/tests/maintenanceService.test.js
```

Actual result:

```text
✖ rejects descriptions shorter than five Unicode characters
ℹ tests 1
ℹ pass 0
ℹ fail 1

AssertionError [ERR_ASSERTION]: Missing expected exception.
```

The test failed because four emoji were accepted. The existing JavaScript `.length` check counted each emoji as two UTF-16 code units, incorrectly making the description appear to contain eight characters.

A first attempt to use the workspace backend script was blocked by the complete suite trying to load missing `bcryptjs` from `authRoutes.js`. It did not produce the Red result; the direct test-file command above was used instead.

### Production-code change

The smallest production change extracted maintenance description validation into `validateMaintenanceDescription` in [maintenanceService.js](/Users/justintran/SWE-Group-Project/packages/express-backend/src/services/maintenanceService.js).

The helper:

1. rejects non-string values;
2. trims surrounding whitespace;
3. uses `Array.from(trimmed).length` to count Unicode code points;
4. rejects fewer than five or more than 500 characters;
5. returns the trimmed description.

`createMaintenanceReport` now uses the helper and persists its returned trimmed value.

### Green command and actual result

```sh
node --test --test-name-pattern="rejects descriptions shorter than five Unicode characters" packages/express-backend/tests/maintenanceService.test.js
```

Actual result:

```text
✔ rejects descriptions shorter than five Unicode characters
ℹ tests 1
ℹ pass 1
ℹ fail 0
```

The complete maintenance unit file was then run:

```sh
node --test packages/express-backend/tests/maintenanceService.test.js
```

Actual result: 7 tests passed, 0 failed.

The added boundary coverage verifies the five-character minimum, the 500-character maximum, over-limit rejection, and non-string rejection.

### Refactoring

The initial fix extracted validation out of `createMaintenanceReport`, because this behavior is now independently testable and no longer duplicated inside the persistence flow. The existing category, installation ID, bathroom lookup, and status behavior were unchanged.

No UI or database schema changes were required.

## Unit-test coverage map

| Test file | Unit(s) | Test behavior | Expected outcome |
| --- | --- | --- | --- |
| [maintenanceService.test.js](/Users/justintran/SWE-Group-Project/packages/express-backend/tests/maintenanceService.test.js) | `maintenanceService` | Rejects unsupported categories. | Throws status `400` with the exact allowed-category message. |
| [maintenanceService.test.js](/Users/justintran/SWE-Group-Project/packages/express-backend/tests/maintenanceService.test.js) | `validateMaintenanceDescription` | Rejects four Unicode emoji as too short. | Throws status `400`; proves validation counts Unicode characters, not UTF-16 code units. |
| [maintenanceService.test.js](/Users/justintran/SWE-Group-Project/packages/express-backend/tests/maintenanceService.test.js) | `validateMaintenanceDescription` | Accepts the five-character minimum and trims whitespace. | Returns the five-character trimmed string. |
| [maintenanceService.test.js](/Users/justintran/SWE-Group-Project/packages/express-backend/tests/maintenanceService.test.js) | `validateMaintenanceDescription` | Tests exactly 500 and 501 characters. | Accepts 500 and rejects 501 with status `400`. |
| [maintenanceService.test.js](/Users/justintran/SWE-Group-Project/packages/express-backend/tests/maintenanceService.test.js) | `validateMaintenanceDescription` | Rejects a non-string description. | Throws status `400` with the description-length message. |
| [maintenanceService.test.js](/Users/justintran/SWE-Group-Project/packages/express-backend/tests/maintenanceService.test.js) | `createMaintenanceReport` | Persists a trimmed description with initial `open` status. | Returns the trimmed report and matching timestamps/status. |
| [maintenanceService.test.js](/Users/justintran/SWE-Group-Project/packages/express-backend/tests/maintenanceService.test.js) | `updateMaintenanceStatus` | Rejects an unsupported status. | Throws status `400` with the exact allowed-status message. |
| [hours.test.js](/Users/justintran/SWE-Group-Project/packages/express-backend/tests/hours.test.js) | `isValidTimezone` | Accepts a valid IANA timezone and rejects invalid or missing values. | Los Angeles is valid; malformed/null/empty values are invalid. |
| [hours.test.js](/Users/justintran/SWE-Group-Project/packages/express-backend/tests/hours.test.js) | `validateHours` | Accepts a complete overnight weekly schedule. | No validation exception is thrown. |
| [hours.test.js](/Users/justintran/SWE-Group-Project/packages/express-backend/tests/hours.test.js) | `validateHours` | Rejects a missing weekday. | Throws status `400` naming the missing weekday. |
| [hours.test.js](/Users/justintran/SWE-Group-Project/packages/express-backend/tests/hours.test.js) | `validateHours` | Rejects malformed times and equal open/close times. | Throws status `400`; invalid intervals are not stored. |
| [hours.test.js](/Users/justintran/SWE-Group-Project/packages/express-backend/tests/hours.test.js) | `getBusynessStatus` | Tests current, stale, future, missing, and invalid timestamps. | Returns `current`, `stale`, or `unknown` according to the 24-hour boundary and validity rules. |
| [hours.test.js](/Users/justintran/SWE-Group-Project/packages/express-backend/tests/hours.test.js) | `getOpenStatus` | Tests an overnight interval after midnight. | Returns `open` in the bathroom timezone. |
| [reviewService.test.js](/Users/justintran/SWE-Group-Project/packages/express-backend/tests/reviewService.test.js) | `getLosAngelesDay`, `submitReview`, `getBathroomSummary` | Tests timezone rollover, invalid ratings, missing bathrooms, duplicate reviews, persistence, and reopening SQLite. | Only valid reviews persist; duplicate/same-day responses and aggregates match the contract. |
| [discovery.test.mjs](/Users/justintran/SWE-Group-Project/packages/mobile-app/tests/discovery.test.mjs) | `distanceBetween`, `filterAndSortBathrooms`, `hasVerifiedCampusSafetyInfo`, `parseBathroom` | Tests search, sorting, filtering, safety labels, stale reports, and malformed response fields. | Results and labels match the discovery rules; malformed coordinates or safety data fail visibly. |
| [apiDiagnostics.test.mjs](/Users/justintran/SWE-Group-Project/packages/mobile-app/tests/apiDiagnostics.test.mjs) | API diagnostic helpers | Tests unreachable, HTTP-error, timeout, and malformed-response paths. | User-facing diagnostic errors retain status/context and classify network failures correctly. |
| [location.test.mjs](/Users/justintran/SWE-Group-Project/packages/react-frontend/src/location.test.mjs) | `distanceBetween`, `sortBathrooms`, `formatDistance` | Tests equal coordinates, search/distance sorting, missing coordinates, and mile/feet formatting. | Matching locations return zero distance; missing locations remain usable and sort predictably. |

The unit suite currently passes 34 tests across 19 backend, 12 mobile, and 3 React location tests. It is isolated from external APIs and does not require the Expo app or browser to be running.

The complete testing plan for unit, system, UI, and root `npm test` setup remains the project testing plan; this document records the implemented unit setup and the TDD cycle alongside existing commands.

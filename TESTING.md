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

## System tests

System tests run real application components together over HTTP. They use
Node's built-in `node:test`, the real Express app, and isolated in-memory
SQLite databases. The app binds to an ephemeral port on `127.0.0.1`; no live
API server, campus data, credentials, or external network service is required.
Install the declared workspace dependencies first with `npm install`.

Commands:

```sh
npm run test:system
npm run test:system --workspace express-backend
npm run test:system --workspace mobile-app
```

| Test location and case | Real components exercised | Behavior and expected results |
| --- | --- | --- |
| [maintenanceApi.test.js](/Users/justintran/SWE-Group-Project/packages/express-backend/tests/maintenanceApi.test.js) — successful report workflow | Express maintenance `POST` and `GET` routes, `createMaintenanceReport`, `getMaintenanceReports`, and in-memory SQLite persistence. | A valid report returns `201`, trimmed description, expected category and `open` status; a subsequent list request returns the saved report with valid timestamps. |
| [maintenanceApi.test.js](/Users/justintran/SWE-Group-Project/packages/express-backend/tests/maintenanceApi.test.js) — invalid description workflow | Express request parsing and route handling, `validateMaintenanceDescription` through `createMaintenanceReport`, `getMaintenanceReports`, and SQLite. | Too-short and over-limit descriptions each return `400` with the validation message; listing and a direct database count confirm no report was saved. |
| [apiContract.test.mjs](/Users/justintran/SWE-Group-Project/packages/mobile-app/tests/apiContract.test.mjs) — mobile/API workflow | Real Express app, bathroom/review/directory/maintenance routes, SQLite-backed services, and mobile response parsers. | The mobile contract accepts real list/details/review/directory/maintenance responses; duplicate reviews and unknown bathrooms return expected errors. |

Each test helper creates and seeds its own in-memory database, starts a local
server for that database, then closes the server and database in `finally`.
System tests therefore do not touch the development SQLite database and can
be repeated safely.

## UI tests

### User story

As a student, I want to report a maintenance issue for a bathroom and see
whether my report was accepted, so I can notify facilities without assuming
staff have already confirmed the issue.

The tests use Jest with the Expo `jest-expo` preset and React Native Testing
Library. They render the production `MaintenanceReportsSection` component and
interact through button roles, visible category labels, and the accessible
description label. Only `fetchMaintenanceReports` and
`submitMaintenanceReport` are mocked to isolate the component from HTTP; input
validation, disabled state, message rendering, and report history remain real.

Test file: [maintenanceReports.ui.test.tsx](/Users/justintran/SWE-Group-Project/packages/mobile-app/tests/maintenanceReports.ui.test.tsx).

| UI test | User-visible behavior |
| --- | --- |
| Successful maintenance report | Starts with no reports; selects a category, types a description, submits, then sees the confirmation, the new report text, and its `Submitted` status. Verifies the request uses the selected bathroom/category/description and installation ID. |
| Invalid input and API failure recovery | A short description keeps the submit button disabled and does not invoke submission. After correcting the text, a simulated service failure is shown to the user; no success message or report is displayed. |

Install the project's declared test dependencies from the repository root:

```sh
npm install
```

No simulator, running API, credentials, or external network access is required
for UI tests. Run only the component UI tests with:

```sh
npm run test:ui
npm run test:ui --workspace mobile-app
```

The root `npm test` / `npm run check` validation also runs the UI suite after
the existing backend and mobile tests.

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

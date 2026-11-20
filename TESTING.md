# Testing

## Test levels and tools

- **Unit tests** isolate a function/service or component behavior with controlled inputs. Node's built-in `node:test` runs backend, mobile helper, and React helper tests. Jest with `jest-expo` and React Native Testing Library renders the maintenance UI.
- **System tests** connect multiple real application components. The Express/API tests start the real app and use HTTP requests against a fresh in-memory SQLite database. Mobile API-contract tests additionally run real mobile response parsers against real API responses.
- **UI tests** render a user-facing React Native component and simulate accessible interactions, asserting visible results. API calls are mocked at the network boundary; the component, its validation, and UI state transitions are real.

Unit tests should be quick and narrowly scoped. System tests verify integrated behavior across routes, services, parsers, and persistence. UI tests verify what a user can do and see through the interface.

## Installation and environment

Requirements: Node.js 22.13 or newer and npm 10 or newer. Install the exact locked workspace dependencies from the repository root:

```sh
npm ci
```

No live API server, production/development database, credentials, `.env` file,
browser, browser driver, emulator, or simulator is needed for automated tests.
There are no Playwright/Cypress browser tests in this test setup. System tests
bind only to `127.0.0.1` on an ephemeral port and use isolated in-memory
databases. Test credentials, where needed, are local fixtures and not secrets.

In-memory databases and test servers are closed in cleanup blocks. The review
unit test's temporary SQLite file is removed after use. Jest/RNTL cleanup is
automatic between tests. No manual database seed or cleanup is required.

## Commands

From the repository root:

```sh
npm test                 # all unit, system, UI, lint, build, and TS checks
npm run check            # same full validation as npm test
npm run test:unit        # all unit-test workspaces
npm run test:system      # all configured system-test workspaces
npm run test:ui          # React Native component UI suite
```

Run each category by workspace:

```sh
npm run test:unit --workspace express-backend
npm run test:unit --workspace mobile-app
npm run test:unit --workspace react-frontend

npm run test:system --workspace express-backend
npm run test:system --workspace mobile-app

npm run test:ui --workspace mobile-app
```

The root `npm test` script delegates to `check`, whose `&&`-chained commands
run each test category and then frontend lint/build and the mobile TypeScript
check. The chain stops and returns a nonzero exit status if any category or
quality check fails.

Workspace all-test commands (also available for targeted debugging):

```sh
npm test --workspace express-backend
npm test --workspace mobile-app
npm test --workspace react-frontend
```

`npm test` in the backend and mobile workspaces runs their respective
Node test files; the named `test:unit`, `test:system`, and `test:ui` scripts
provide explicit category selection. The React workspace `npm test` runs its
location helper unit tests.

## System tests

System tests run real application components together over HTTP. They use
Node's built-in `node:test`, the real Express app, and isolated in-memory
SQLite databases. The app binds to an ephemeral port on `127.0.0.1`; no live
API server, campus data, credentials, or external network service is required.
Install dependencies once from the repository root with `npm ci` as described
above.

System-test commands:

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

No simulator, running API, credentials, or external network access is required
for UI tests. Run only the component UI tests with:

```sh
npm run test:ui
npm run test:ui --workspace mobile-app
```

The root `npm test` / `npm run check` validation also runs the UI suite after
the unit and system test categories.

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

The full root run covers 34 unit tests (19 backend, 12 mobile, 3 React), 29
system tests (25 backend, 4 mobile/API contract), and 2 UI tests, followed by
frontend lint/build and the mobile TypeScript check. Unit tests are isolated
from external APIs and do not require the Expo app or a browser to be running.

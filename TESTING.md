# Testing

## Testing setup

The project uses Node's built-in `node:test` runner. No separate test framework or external service is required for isolated backend unit tests.

Backend unit tests run against an in-memory SQLite database; the review persistence test uses a temporary SQLite file and removes it after the test. Mobile and backend contract tests start the real Express app on an ephemeral local port.

Existing test commands:

```sh
node --test packages/express-backend/tests/reviewService.test.js packages/express-backend/tests/maintenanceService.test.js
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

## Existing unit coverage

| Unit | Test coverage |
| --- | --- |
| `reviewService` | Los Angeles calendar day calculation, cleanliness/busyness validation, missing bathrooms, persistence, duplicate reviews, day rollover, and reopening SQLite. |
| `maintenanceService` | Category/status validation, Unicode-aware trimmed description validation, open-status initialization, and persistence. |
| Mobile discovery/parsing | Search, sorting, distance, combined filters, safety filtering, optional response fields, and malformed values. |
| React location helpers | Haversine distance, alphabetical/distance sorting, search filtering, and missing-distance formatting. |

The complete testing plan for unit, system, UI, and root `npm test` setup remains documented in the assignment/test-plan work; this document records the implemented TDD cycle alongside existing test commands.

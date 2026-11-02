# Mobile development guide

How feature owners add a screen, call the API, and test their
work in the Expo app (`packages/mobile-app`). For first-time
setup, see the README sections "Start The API" and "Start The
Mobile App".

## Where things live

| Path                       | What it holds                                |
| -------------------------- | -------------------------------------------- |
| `src/app/`                 | Screens. Each file is a route (Expo Router). |
| `src/app/_layout.tsx`      | Root stack and the `AppProvider` wrapper.    |
| `src/main/api.ts`          | Every request to the Express API.            |
| `src/main/types.ts`        | Shared types and response parsers.           |
| `src/main/AppProvider.tsx` | Shared app data (`useAppData`).              |
| `src/main/ScreenState.tsx` | Loading, error, and empty screens.           |
| `src/2d/`                  | Map and discovery list (Victor, Justin).     |
| `src/rating/`              | Details, ratings, maintenance (Gavin).       |
| `tests/`                   | Node tests run by `npm test`.                |

## Add a screen

1. Create a file in `src/app/`. The file path becomes the route:
   `src/app/report.tsx` is `/report`, and
   `src/app/bathroom/[id].tsx` is `/bathroom/<id>`.
2. Register it in `src/app/_layout.tsx` with
   `<Stack.Screen name="report" />` if it needs options such as
   modal presentation.
3. Navigate to it with `router.push` from `expo-router`:

   ```tsx
   router.push({ pathname: "/bathroom/[id]", params: { id } });
   ```

4. Read shared data with `useAppData()` instead of fetching the
   bathroom list again. It provides `installationId`,
   `bathrooms`, `loading`, `error`, `reloadBathrooms()`, and
   `updateBathroom()`.
5. Every screen that loads data needs all three states. Use
   `ScreenState` so they look the same everywhere:

   ```tsx
   if (loading) {
     return (
       <ScreenState title="Loading" message="..." loading />
     );
   }
   if (error) {
     return (
       <ScreenState
         title="Couldn't load ..."
         message={error}
         actionLabel="Try again"
         onAction={retry}
       />
     );
   }
   ```

   `src/app/index.tsx` and `src/app/bathroom/[id].tsx` are
   working examples, including the empty state.

## Call the API

Screens never call `fetch` directly. Add a function to
`src/main/api.ts` instead:

1. Use the private `request(path, options)` helper. It adds the
   base URL from `EXPO_PUBLIC_API_URL`, sets JSON headers, and
   turns network failures and `{ "error": "..." }` responses
   into an `ApiError` with a readable message.
2. Pull the field you need with `responseField(body, 'name')`.
3. Validate it with a parser before returning it, such as
   `parseBathroom` from `types.ts`. Add a new parser there for a
   new response shape. Parsers keep a bad response from crashing
   a screen.
4. Document the endpoint and its response in
   `docs/api-contract.md`.

Paths in `api.ts` start after `/api`, e.g.
`request('/bathrooms')`. The base URL already ends in `/api`.

## Test your work

Run everything from the repository root before opening a PR:

```bash
npm run check
```

This runs backend tests, mobile tests, the web lint/build, and
the mobile TypeScript check. All must pass.

- **Mobile unit tests** live in `packages/mobile-app/tests/` as
  `*.test.mjs` files and import TypeScript source directly (see
  `discovery.test.mjs`). Imported files must use plain
  TypeScript that Node can strip, without parameter properties
  or enums.
- **Fixtures** for API responses live in `docs/fixtures/` (list,
  empty list, missing optional fields) and
  `packages/mobile-app/tests/fixtures/`. Use them to test how a
  screen or parser handles empty and partial data without
  running the API.
- **The API contract test** (`tests/apiContract.test.mjs`)
  starts the real Express app in memory and runs its responses
  through the mobile parsers. If you change a backend response
  or a parser, this test tells you when they no longer match.
  Add a case when you add an endpoint the app reads.
- **Backend tests** live in `packages/express-backend/tests/`
  and use an in-memory SQLite database. See `api.test.js` for
  the pattern.
- **On a phone:** run the README's "Manual Mobile Smoke Test"
  for any change a user can see, and check the loading, error,
  and empty states by stopping the API or searching for
  something that does not exist.

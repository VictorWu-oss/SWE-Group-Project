# ToiletTracker

ToiletTracker is an account-free mobile app for finding bathrooms on the
Cal Poly SLO campus and sharing cleanliness and busyness reports. The first
milestone includes the 2D map, search, nearby list, bathroom details, and
ratings. Directions, 3D maps, and text chat are later milestones.

## Requirements

- Node.js 22.13 or newer (the API uses Node's built-in `node:sqlite`)
- npm 10 or newer
- Expo Go on a physical phone, or an iOS/Android simulator

## Install

From the repository root:

```bash
npm install
```

## Bathroom Data

Edit `packages/express-backend/data/bathrooms.seed.json` to enter bathrooms
verified by the team. The checked-in records are **demo locations with
unverified coordinates**. They are named `Demo Bathroom` in the app and are
marked `demo: true`; they are not verified campus information. No ratings,
hours, or busyness values are seeded. New bathrooms without reports show
"No reviews yet."

Seed or update the local database from the repository root:

```bash
npm run seed
```

The SQLite file is created at
`packages/express-backend/data/toilet-tracker.sqlite` and is ignored by Git.
The API seeds the editable bathroom list on startup as well. Seeding upserts
location/name fields but preserves submitted reviews and busyness reports.

## Start The API

In one terminal at the repository root:

```bash
npm run dev:api
```

The API listens on port `3000` on all network interfaces. Confirm it is up:

```bash
curl http://localhost:3000/api/health
```

To use a different database file or port, create
`packages/express-backend/.env`:

```dotenv
PORT=3000
DATABASE_PATH=./data/toilet-tracker.sqlite
```

## Start The Mobile App

For the iOS simulator, the default API URL `http://localhost:3000/api` works.
For a physical phone, find the computer's Wi-Fi IP address (on macOS):

```bash
ipconfig getifaddr en0
```

Copy `packages/mobile-app/.env.example` to
`packages/mobile-app/.env`, then replace the example address with that IP:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.25:3000/api
```

Keep the phone and computer on the same Wi-Fi network and allow local network
connections to port `3000` in the computer firewall. In another terminal at
the repository root, start Expo:

```bash
npm run dev:mobile -- --lan
```

Open the QR code with Expo Go on your phone. If you change the `.env` file,
restart Expo so it reloads the setting. For the Android emulator, use
`EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api` instead.

## Maps And Location

The 2D map uses Leaflet and OpenStreetMap tiles; it requires an internet
connection but no API key or paid map credential. Map data includes
OpenStreetMap attribution in the app. If location permission is denied or
unavailable, the map and bathroom list remain usable and the list sorts by
name instead of distance. Search matches bathroom names and building names.
Tapping a marker or list item opens the same bathroom details route. Search
filters map markers and list results together.
Location permission is requested only when the user taps **Use location**.
The map/list can be searched without location. The optional rating filters use
the community cleanliness average (4+) and latest busyness report.

The app uses Expo Router for its discovery and bathroom-details screens. Map
tiles and Leaflet are loaded from OpenStreetMap and unpkg, so map display
requires an internet connection. No map credential is required. The map shows
OpenStreetMap attribution; keep it visible when changing the map UI.

## API Contract

The mobile app and API share documented response shapes, validation, status
codes, and fixture examples in [`docs/api-contract.md`](docs/api-contract.md).
The API supports case-insensitive search by bathroom name or building using
the optional `search` query parameter. The mobile app locally filters the
loaded directory so list and map results update together.

The official [Cal Poly Interactive Map](https://maps.calpoly.edu/) includes a
gender-inclusive restroom layer, but this release does not import it. The
source describes its data as current as of June 2024 and advisory/as-is, and
the layer is marked export-disabled in the map configuration. See
[`docs/campus-data.md`](docs/campus-data.md) for what was verified and why the
app's demo seed records remain unchanged.

## Reviews And Privacy

The app creates an anonymous random ID on first launch and stores it in the
device's secure storage. The API stores reviews in SQLite and shares their
aggregates with all app installations using that API database. A database
unique constraint enforces at most one review per installation, bathroom,
and `America/Los_Angeles` calendar day, including concurrent submissions.
Reviews contain no account or personal profile fields.

This limits repeat submissions from one installation. It cannot guarantee
one review per person: a person can use another installation or alter a
client request. Do not describe the ratings as verified or as one-person,
one-vote.

Busyness is the latest community report, not live occupancy. The app displays
the report timestamp. Cleanliness averages and review counts are computed
from saved submissions.

## Checks

From the repository root:

```bash
npm test
```

This runs backend persistence, discovery, validation, and
duplicate/date-boundary tests; mobile discovery/contract utility tests; the
existing web frontend lint/build checks; and the mobile TypeScript check.

## Manual Mobile Smoke Test

1. Start the API with `npm run dev:api` and confirm
   `http://localhost:3000/api/health` returns `{"status":"ok"}`.
2. Start the app with `npm run dev:mobile -- --lan`. For a phone, configure
   `EXPO_PUBLIC_API_URL` in `packages/mobile-app/.env` to the computer's LAN
   address, then restart Expo.
3. Open the app and confirm the map markers and bathroom list appear.
4. Confirm location has not been requested at launch. Tap **Use location**;
   allow or deny it, then verify distance sorting or usable alphabetical
   fallback respectively. Retry from the location button.
5. Search for a bathroom or building; verify both map markers and list rows
   filter together. Clear the query and verify both restore.
6. Tap **Cleanliness 4+** and each busyness filter; verify results reflect
   available ratings/reports. Clear filters and verify the full list returns.
7. Tap a marker and a list row; verify each opens the matching bathroom
   details. Return to the map and verify the selected bathroom remains
   highlighted when it is still in the search results.
8. Submit a valid cleanliness and busyness report. Verify the updated average,
   count, busyness, timestamp, and reviewed-today state. Submit again and
   verify the duplicate-report response is handled.
9. Disconnect the API and reload; verify the app presents an actionable error
   and retry recovers when the service returns.

The physical-device Expo Go flow and external OpenStreetMap tile/CDN loading
still require manual verification on a phone with the API host reachable over
the LAN. The checked-in bathroom coordinates are demo data and need replacement
with team-verified information before representing the app as ready for campus
navigation.

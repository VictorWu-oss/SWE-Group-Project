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

This runs backend persistence/duplicate/date-boundary tests, the existing web
frontend lint/build checks, and the mobile TypeScript check. The automated
tests cover file-backed SQLite persistence after closing and reopening the
database, Los Angeles calendar-day rollover, and parallel API submissions.

The physical-device Expo Go flow and external OpenStreetMap tile/CDN loading
must still be verified on a phone with the API host reachable on the LAN.
Demo bathroom coordinates also need replacement with team-verified data.

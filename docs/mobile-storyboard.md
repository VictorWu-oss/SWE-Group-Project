# ToiletTracker mobile storyboard

## Story

As a student on campus, I want to find a nearby public bathroom, inspect its
details, and submit a cleanliness or busyness report from my phone.

## Screen 1 — Launch and loading

- Show the app shell while bathroom data loads.
- Request location permission without making it mandatory.
- Show a loading indicator and a recoverable error state if the API fails.

## Screen 2 — Map and nearby list

- Show a 2D map with bathroom markers.
- Show the nearby bathroom list below the map.
- When location is available, sort by distance.
- When location is denied or unavailable, keep the map and list usable and sort
  by bathroom name.

## Screen 3 — Search

- Let the user search by bathroom name or building.
- Update the nearby list as the search changes.
- Show a clear no-results state with a suggestion to try another search.

## Screen 4 — Bathroom details

- Open details when the user taps a map marker or list item.
- Show name, building, location, cleanliness aggregate, busyness report, and
  available metadata.
- Label demo or unverified location data clearly.

## Screen 5 — Submit a report

- Allow a cleanliness value from 1–5 and a Low/Medium/High busyness value.
- Show validation, success, duplicate, and API failure messages.
- Describe ratings as community reports, not verified data or live occupancy.

## Mobile acceptance flow

1. Launch the app and wait for the bathroom list.
2. Deny location and confirm the app remains usable.
3. Search for a bathroom or building.
4. Tap a marker or list item to open details.
5. Submit a valid report and confirm the aggregate refreshes.
6. Repeat the report and confirm the duplicate-report message.

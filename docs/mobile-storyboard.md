# ToiletTracker mobile storyboard

## Story

As a student on campus, I want to find a nearby public bathroom, inspect its
details, and submit a cleanliness or busyness report from my phone.

## Screen 1 — Launch and loading

- Show the app shell while bathroom data loads.
- Do not request location permission automatically; offer a **Use location**
  action that requests it only after the user opts in.
- Show a loading indicator and a recoverable error state if the API fails.

## Screen 2 — Map and nearby list

- Show a 2D map with bathroom markers.
- Show the nearby bathroom list below the map.
- When location is available, sort by distance.
- When location is denied or unavailable, keep the map and list usable and sort
  by bathroom name.
- Let users filter by saved cleanliness average (4+) and latest community
  busyness report, verified restroom type, verified accessibility, and
  verified amenities. Synchronize filters between markers and list rows.
- Support combined filters, clearing them, and name/distance/rating sorting.

## Screen 3 — Search

- Let the user search by bathroom name or building.
- Update the nearby list as the search changes.
- Show a clear no-results state with a suggestion to try another search.

## Screen 4 — Bathroom details

- Open details when the user taps a map marker or list item.
- Show name, building, location, cleanliness aggregate, busyness report, and
  available metadata.
- Label demo or unverified location/directory data clearly.
- Show verified open/closed state in the bathroom timezone; show unknown for
  missing or unverified hours.
- Display verified restroom type, amenities, accessibility, and indoor
  instructions; distinguish unknown from confirmed unavailable.
- Show sourced safety context with update time and whether it is verified.
- Offer directions when coordinates are available; explain when they are
  missing.

## Screen 5 — Submit a report

- Allow a cleanliness value from 1–5 and a Low/Medium/High busyness value.
- Show validation, success, duplicate, and API failure messages.
- Describe ratings as community reports, not verified data or live occupancy.
- Let users submit a categorized maintenance report and see its status; do not
  imply that staff have confirmed or resolved it.

## Alternate flows attached to the happy path

| Trigger | Alternate state | Recovery |
|---|---|---|
| User denies or device cannot provide location | Explain that location is optional; keep the directory usable and sort by name. | Retry **Use location** or continue searching without it. |
| Search or combined filters match nothing | Explain that all selected filters are combined and indicate whether filters are active. | Edit search or clear all filters. |
| Bathroom was removed or cannot be loaded | Show the details unavailable/error state. | Retry if the service failed; return to discovery if the record is not found. |
| Rating has missing choices or server validation fails | Keep the user on the form and show required choices or the API error. | Complete the choices or correct input; retry after a network error. |
| Maintenance description/category is invalid | Prevent submission until category and 5–500 character description are valid. | Select a category and edit the description. |
| API/network failure | Keep discovery/detail errors actionable; show submission errors inline rather than false success. | Retry loading or resubmit after connectivity returns. |
| Rating accepted | Confirm the rating was saved and refresh the aggregate/updated busyness. | Continue browsing or use the updated details. |
| Duplicate daily rating | Explain the daily limit and refresh the current bathroom values. | Return to browsing; no second review is recorded that day. |

## Mobile acceptance flow

1. Launch the app and wait for the bathroom list.
2. Verify location has not been requested, then opt in or continue without it.
3. Search and combine/clear rating, restroom type, accessibility, and amenity
   filters; verify map/list consistency and empty-state recovery.
4. Tap a marker or list item to open details.
5. Inspect verified/unknown hours and attributes, freshness/source labels,
   missing-location direction fallback, and safety caveat.
6. Submit a valid rating and confirm the success message and aggregate refresh.
7. Submit a categorized maintenance report and confirm `Submitted` status.
8. Repeat the rating and confirm the duplicate-report message.

# Mobile map and location contract

## Bathroom marker fields

The mobile map accepts the shared `Bathroom` shape and requires:

| Field | Type | Use |
|---|---|---|
| `id` | string | Stable marker and selection identifier |
| `name` | string | Marker selection and list label |
| `building` | string | List label and search text |
| `latitude` | number | Marker latitude in decimal degrees |
| `longitude` | number | Marker longitude in decimal degrees |

Coordinates in the checked-in seed file are demo data and must not be
described as verified campus locations.

## Location states

| State | Mobile behavior |
|---|---|
| Not requested | Location is optional. Do not prompt on launch; show an explicit current-location action. |
| Loading | Show a location indicator while permission/location is requested after the user action. |
| Granted | Show the user marker and sort bathrooms by haversine distance. |
| Denied | Keep the map, search, and list usable; explain the fallback and sort by name. The user can retry from the location action. |
| Unavailable/error | Keep the map, search, and list usable; explain that location is unavailable and sort by name. The user can retry from the location action. |

Location is optional. A user can browse the map and open bathroom details even
when permission is denied or the device cannot provide a location.

## Distance behavior

The app uses the haversine distance between the user and each bathroom. Inputs
are decimal-degree latitude/longitude pairs; the result is in kilometers and
is formatted as feet for short distances or miles for longer distances.

When no valid user location exists, the list is sorted alphabetically by
bathroom name. The fallback must not claim that the list is nearby.

Location permission is requested only after the user taps **Use location**.
The app gets a one-time current position; it does not track the user in the
background.

## Marker selection interface

Selecting a marker emits the bathroom `id`. The screen uses that ID to find the
matching API record, opens the bathroom details sheet, and keeps the selected
marker visually highlighted.

Search and community-rating filters are applied to one shared result set used
by both map markers and list rows. The cleanliness filter uses the saved
average cleanliness (`4+`); busyness filters use the latest community report.
Bathrooms without the matching rating are omitted while the corresponding
filter is active. Clear filters to restore the full search result set.

## Map attribution

The Leaflet map uses OpenStreetMap tiles and displays `© OpenStreetMap`
attribution inside the map.

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
| Loading | Show the location loading indicator while permission/location is requested. |
| Granted | Show the user marker and sort bathrooms by haversine distance. |
| Denied | Keep the map, search, and list usable; show the location-off message and sort by name. |
| Unavailable/error | Keep the map, search, and list usable; show the unavailable message and sort by name. |

Location is optional. A user can browse the map and open bathroom details even
when permission is denied or the device cannot provide a location.

## Distance behavior

The app uses the haversine distance between the user and each bathroom. Inputs
are decimal-degree latitude/longitude pairs; the result is in kilometers and
is formatted as feet for short distances or miles for longer distances.

When no valid user location exists, the list is sorted alphabetically by
bathroom name. The fallback must not claim that the list is nearby.

## Marker selection interface

Selecting a marker emits the bathroom `id`. The screen uses that ID to find the
matching API record, opens the bathroom details sheet, and keeps the selected
marker visually highlighted.

## Map attribution

The Leaflet map uses OpenStreetMap tiles and displays `© OpenStreetMap`
attribution inside the map.

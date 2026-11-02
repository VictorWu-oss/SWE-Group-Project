# Campus bathroom data source

## What is available

The official [Cal Poly Interactive Map](https://maps.calpoly.edu/) is a public
ArcGIS Experience Builder map published by Cal Poly Facilities Management
Department. Its [public ArcGIS item metadata](https://www.arcgis.com/sharing/rest/content/items/5d3c7ce97866487eac63664dff9fb946?f=json)
describes the map as including gender-restroom locations and says its data is
current as of June 2024 and updated as needed. Its disclaimer says information
is advisory, provided as-is, and without warranties.

The map configuration contains a **Gender Inclusive Restroom** point layer.
Its public [layer metadata](https://services6.arcgis.com/2p89s65aBU4qN9v4/arcgis/rest/services/Gender_Inclusive_Restroom/FeatureServer/40?f=json)
advertises query capability and fields including building number/name, room,
type, single/multi-stall, public status, accessibility, location/access notes,
latitude/longitude, and floor. A count-only request to its query endpoint
returned 66 records on November 1, 2026:

`https://services6.arcgis.com/2p89s65aBU4qN9v4/arcgis/rest/services/Gender_Inclusive_Restroom/FeatureServer/40/query?where=1%3D1&returnCountOnly=true&f=json`

This is a subset/category, not a complete list of all campus bathrooms. It
does not validate the project's current demo locations and does not provide
evidence for unrelated amenities or opening hours.

## Why records were not imported

The published web-map configuration marks this layer `disableExport: true`.
The user chose to keep demo seed data rather than copy records from the layer.
Accordingly, no restroom features or coordinates were scraped/imported into the
project. The checked-in demo records remain explicitly marked as demo. The
official map is still a useful source for a future, campus-approved integration
after confirming data freshness, licensing/attribution, update expectations,
and the intended subset of restrooms.

## Attribution and limitations

Credit Cal Poly Facilities Management Department and link the official
interactive map if this source is later used. Treat the map as advisory and
its data as potentially stale. Do not infer access restrictions, verify
accessibility from the field label alone, or extrapolate from the gender-
inclusive subset to all public bathrooms. Confirm with the data owner before
publishing any copied or repackaged dataset.

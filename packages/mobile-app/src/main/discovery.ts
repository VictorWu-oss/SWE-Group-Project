import type { Bathroom, Coordinates } from './types';

export type BathroomResult = {
  bathroom: Bathroom;
  distanceKilometers: number | null;
};

export type CleanlinessFilter = 'any' | 'four-plus';
export type BusynessFilter = 'any' | Bathroom['busyness'];
export type BathroomSort = 'recommended' | 'name' | 'distance' | 'rating';
export type AccessibilityFilter = 'wheelchairAccessible' | 'grabBars' | 'accessibleSink' | 'stepFreeRoute';
export type AmenityFilter = 'babyChanging' | 'menstrualProducts' | 'hooks' | 'shelves';

export type DirectoryFilters = {
  restroomTypes: Array<NonNullable<Bathroom['restroomType']>>;
  accessibility: AccessibilityFilter[];
  amenities: AmenityFilter[];
  sort: BathroomSort;
};

const noDirectoryFilters: DirectoryFilters = {
  restroomTypes: [],
  accessibility: [],
  amenities: [],
  sort: 'recommended',
};

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function distanceBetween(first: Coordinates, second: Coordinates) {
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(first.latitude))
    * Math.cos(toRadians(second.latitude))
    * Math.sin(longitudeDelta / 2) ** 2;
  const boundedHaversine = Math.min(1, Math.max(0, haversine));
  return 6371 * 2 * Math.atan2(
    Math.sqrt(boundedHaversine),
    Math.sqrt(1 - boundedHaversine),
  );
}

export function filterAndSortBathrooms(
  bathrooms: Bathroom[],
  search: string,
  location: Coordinates | null,
  cleanlinessFilter: CleanlinessFilter = 'any',
  busynessFilter: BusynessFilter = 'any',
  directoryFilters: DirectoryFilters = noDirectoryFilters,
): BathroomResult[] {
  const normalizedSearch = search.trim().toLocaleLowerCase();
  return bathrooms
    .filter((bathroom) => (
      `${bathroom.name} ${bathroom.building}`.toLocaleLowerCase().includes(normalizedSearch)
    ))
    .filter((bathroom) => (
      cleanlinessFilter === 'any'
      || (bathroom.averageCleanliness !== null && bathroom.averageCleanliness >= 4)
    ))
    .filter((bathroom) => (
      busynessFilter === 'any'
      || (bathroom.busyness === busynessFilter && bathroom.busynessStatus === 'current')
    ))
    .filter((bathroom) => (
      directoryFilters.restroomTypes.length === 0
      || (bathroom.directoryVerified
        && directoryFilters.restroomTypes.includes(
          bathroom.restroomType as NonNullable<Bathroom['restroomType']>,
        ))
    ))
    .filter((bathroom) => bathroom.directoryVerified
      || (directoryFilters.accessibility.length === 0 && directoryFilters.amenities.length === 0))
    .filter((bathroom) => directoryFilters.accessibility.every((field) => (
      bathroom.directoryVerified && bathroom.accessibility?.[field] === true
    )))
    .filter((bathroom) => directoryFilters.amenities.every((field) => (
      bathroom.directoryVerified && bathroom.amenities?.[field] === true
    )))
    .map((bathroom) => ({
      bathroom,
      distanceKilometers: location && bathroom.latitude !== null && bathroom.longitude !== null
        ? distanceBetween(location, {
          latitude: bathroom.latitude,
          longitude: bathroom.longitude,
        })
        : null,
    }))
    .sort((first, second) => {
      if (directoryFilters.sort === 'name') {
        return first.bathroom.name.localeCompare(second.bathroom.name);
      }
      if (directoryFilters.sort === 'rating') {
        const firstRating = first.bathroom.averageCleanliness ?? -1;
        const secondRating = second.bathroom.averageCleanliness ?? -1;
        if (firstRating !== secondRating) return secondRating - firstRating;
      }
      if (directoryFilters.sort === 'distance' && location) {
        const firstDistance = first.distanceKilometers ?? Number.POSITIVE_INFINITY;
        const secondDistance = second.distanceKilometers ?? Number.POSITIVE_INFINITY;
        if (firstDistance !== secondDistance) return firstDistance - secondDistance;
      }
      if (location) {
        const distanceDifference = (first.distanceKilometers ?? Number.POSITIVE_INFINITY)
          - (second.distanceKilometers ?? Number.POSITIVE_INFINITY);
        if (distanceDifference !== 0) return distanceDifference;
      }
      return first.bathroom.name.localeCompare(second.bathroom.name);
    });
}

export function formatDistance(kilometers: number | null) {
  if (kilometers === null) return 'Distance unavailable';
  const miles = kilometers * 0.621371;
  return miles < 0.1
    ? `${Math.round(miles * 5280)} ft away`
    : `${miles.toFixed(1)} mi away`;
}

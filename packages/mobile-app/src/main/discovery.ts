import type { Bathroom, Coordinates } from './types';

export type BathroomResult = {
  bathroom: Bathroom;
  distanceKilometers: number | null;
};

export type CleanlinessFilter = 'any' | 'four-plus';
export type BusynessFilter = 'any' | Bathroom['busyness'];

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
      busynessFilter === 'any' || bathroom.busyness === busynessFilter
    ))
    .map((bathroom) => ({
      bathroom,
      distanceKilometers: location
        ? distanceBetween(location, {
          latitude: bathroom.latitude,
          longitude: bathroom.longitude,
        })
        : null,
    }))
    .sort((first, second) => {
      if (first.distanceKilometers !== null && second.distanceKilometers !== null) {
        const distanceDifference = first.distanceKilometers - second.distanceKilometers;
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

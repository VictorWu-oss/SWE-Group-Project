export function distanceBetween(first, second) {
  const radians = (value) => (value * Math.PI) / 180;
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const value = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  const bounded = Math.min(1, Math.max(0, value));
  return 6371 * 2 * Math.atan2(Math.sqrt(bounded), Math.sqrt(1 - bounded));
}

export function sortBathrooms(bathrooms, search, location) {
  const term = search.trim().toLocaleLowerCase();
  return bathrooms.filter((bathroom) => `${bathroom.name} ${bathroom.building}`.toLocaleLowerCase().includes(term)).map((bathroom) => ({
    bathroom,
    distanceKilometers: location && bathroom.latitude !== null && bathroom.longitude !== null ? distanceBetween(location, bathroom) : null,
  })).sort((first, second) => location ? (first.distanceKilometers ?? Infinity) - (second.distanceKilometers ?? Infinity) : first.bathroom.name.localeCompare(second.bathroom.name));
}

export function formatDistance(kilometers) {
  if (kilometers === null) return 'Distance unavailable';
  const miles = kilometers * 0.621371;
  return miles < 0.1 ? `${Math.round(miles * 5280)} ft away` : `${miles.toFixed(1)} mi away`;
}

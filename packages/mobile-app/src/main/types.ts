export type Busyness = 'Low' | 'Medium' | 'High';
export type CleanlinessRating = 1 | 2 | 3 | 4 | 5;

export type Bathroom = {
  id: string;
  name: string;
  building: string;
  latitude: number;
  longitude: number;
  demo: boolean;
  averageCleanliness: number | null;
  reviewCount: number;
  busyness: Busyness | null;
  busynessReportedAt: string | null;
  reviewedToday: boolean;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalNullableNumber(value: unknown, field: string): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Bathroom response has an invalid ${field}.`);
  }
  return value;
}

function optionalNullableString(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new Error(`Bathroom response has an invalid ${field}.`);
  }
  return value;
}

function isBusyness(value: string): value is Busyness {
  return value === 'Low' || value === 'Medium' || value === 'High';
}

export function parseBathroom(value: unknown): Bathroom {
  if (!isRecord(value)) throw new Error('Bathroom service returned an invalid bathroom.');

  const { id, name, building, latitude, longitude } = value;
  if (
    typeof id !== 'string'
    || typeof name !== 'string'
    || typeof building !== 'string'
    || typeof latitude !== 'number'
    || !Number.isFinite(latitude)
    || latitude < -90
    || latitude > 90
    || typeof longitude !== 'number'
    || !Number.isFinite(longitude)
    || longitude < -180
    || longitude > 180
  ) {
    throw new Error('Bathroom service returned invalid location or identity fields.');
  }

  const demo = value.demo === undefined ? true : value.demo;
  const reviewCount = value.reviewCount === undefined ? 0 : value.reviewCount;
  const reviewedToday = value.reviewedToday === undefined ? false : value.reviewedToday;
  const averageCleanliness = optionalNullableNumber(value.averageCleanliness, 'averageCleanliness');
  const busynessValue = optionalNullableString(value.busyness, 'busyness');
  const busynessReportedAt = optionalNullableString(value.busynessReportedAt, 'busynessReportedAt');

  if (typeof demo !== 'boolean') throw new Error('Bathroom response has an invalid demo flag.');
  if (typeof reviewCount !== 'number' || !Number.isInteger(reviewCount) || reviewCount < 0) {
    throw new Error('Bathroom response has an invalid reviewCount.');
  }
  if (typeof reviewedToday !== 'boolean') {
    throw new Error('Bathroom response has an invalid reviewedToday flag.');
  }
  if (
    averageCleanliness !== null
    && (averageCleanliness < 1 || averageCleanliness > 5)
  ) {
    throw new Error('Bathroom response has an invalid averageCleanliness.');
  }
  if (busynessValue !== null && !isBusyness(busynessValue)) {
    throw new Error('Bathroom response has an invalid busyness value.');
  }
  if (busynessReportedAt !== null && Number.isNaN(Date.parse(busynessReportedAt))) {
    throw new Error('Bathroom response has an invalid busynessReportedAt timestamp.');
  }

  return {
    id,
    name,
    building,
    latitude,
    longitude,
    demo,
    averageCleanliness,
    reviewCount,
    busyness: busynessValue,
    busynessReportedAt,
    reviewedToday,
  };
}

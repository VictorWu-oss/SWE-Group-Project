export type Busyness = 'Low' | 'Medium' | 'High';
export type CleanlinessRating = 1 | 2 | 3 | 4 | 5;

export type Bathroom = {
  id: string;
  name: string;
  building: string;
  latitude: number | null;
  longitude: number | null;
  demo: boolean;
  averageCleanliness: number | null;
  reviewCount: number;
  busyness: Busyness | null;
  busynessReportedAt: string | null;
  busynessStatus: 'unknown' | 'current' | 'stale';
  reviewedToday: boolean;
  restroomType: 'single-stall' | 'multi-stall' | null;
  amenities: Record<'babyChanging' | 'menstrualProducts' | 'hooks' | 'shelves', boolean | null> | null;
  accessibility: Record<
    'wheelchairAccessible' | 'grabBars' | 'accessibleSink' | 'stepFreeRoute',
    boolean | null
  > | null;
  hours: Record<
    'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat',
    Array<{ open: string; close: string }> | null
  > | null;
  timezone: string | null;
  openStatus: 'unknown' | 'open' | 'closed';
  indoorDirections: string | null;
  safetyInfo: Array<{
    text: string;
    source: string;
    kind: 'campus_source' | 'user_report';
    updatedAt: string;
    verified: boolean;
  }>;
  directoryVerified: boolean;
  verificationSource: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type MaintenanceCategory =
  | 'cleanliness'
  | 'supplies'
  | 'fixture'
  | 'accessibility'
  | 'safety'
  | 'other';

export type MaintenanceReportStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed';

export type MaintenanceReport = {
  id: number;
  bathroomId: string;
  category: MaintenanceCategory;
  description: string;
  status: MaintenanceReportStatus;
  createdAt: string;
  updatedAt: string;
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

function nullableCoordinate(value: unknown, field: string, minimum: number, maximum: number) {
  if (value === undefined || value === null) return null;
  if (
    typeof value !== 'number'
    || !Number.isFinite(value)
    || value < minimum
    || value > maximum
  ) {
    throw new Error(`Bathroom response has an invalid ${field}.`);
  }
  return value;
}

function isBooleanOrNullRecord(
  value: unknown,
  field: string,
  allowed: string[],
): Record<string, boolean | null> | null {
  if (value === undefined || value === null) return null;
  if (!isRecord(value)) throw new Error(`Bathroom response has an invalid ${field}.`);
  const unexpected = Object.keys(value).find((key) => !allowed.includes(key));
  if (unexpected) throw new Error(`Bathroom response has an invalid ${field}.${unexpected}.`);
  const parsed: Record<string, boolean | null> = {};
  for (const key of allowed) {
    const property = value[key];
    if (property !== undefined && property !== null && typeof property !== 'boolean') {
      throw new Error(`Bathroom response has an invalid ${field}.${key}.`);
    }
    parsed[key] = property ?? null;
  }
  return parsed;
}

function parseHours(value: unknown): Bathroom['hours'] {
  if (value === undefined || value === null) return null;
  if (!isRecord(value)) throw new Error('Bathroom response has invalid hours.');
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
  const unexpected = Object.keys(value).find((day) => !days.includes(day as typeof days[number]));
  if (unexpected) throw new Error(`Bathroom response has invalid weekday ${unexpected}.`);
  const result = {} as NonNullable<Bathroom['hours']>;
  for (const day of days) {
    const intervals = value[day];
    if (intervals === null) {
      result[day] = null;
      continue;
    }
    if (!Array.isArray(intervals)) throw new Error(`Bathroom response has invalid ${day} hours.`);
    result[day] = intervals.map((interval) => {
      if (
        !isRecord(interval)
        || typeof interval.open !== 'string'
        || typeof interval.close !== 'string'
        || !/^([01]\d|2[0-3]):[0-5]\d$/.test(interval.open)
        || !/^([01]\d|2[0-3]):[0-5]\d$/.test(interval.close)
        || interval.open === interval.close
      ) {
        throw new Error(`Bathroom response has invalid ${day} hours.`);
      }
      return { open: interval.open, close: interval.close };
    });
  }
  return result;
}

function isBusyness(value: string): value is Busyness {
  return value === 'Low' || value === 'Medium' || value === 'High';
}

function isSafetyInfoKind(value: unknown): value is 'campus_source' | 'user_report' {
  return value === 'campus_source' || value === 'user_report';
}

export function parseBathroom(value: unknown): Bathroom {
  if (!isRecord(value)) throw new Error('Bathroom service returned an invalid bathroom.');

  const { id, name, building } = value;
  if (
    typeof id !== 'string'
    || typeof name !== 'string'
    || typeof building !== 'string'
  ) {
    throw new Error('Bathroom service returned invalid location or identity fields.');
  }

  const latitude = nullableCoordinate(value.latitude, 'latitude', -90, 90);
  const longitude = nullableCoordinate(value.longitude, 'longitude', -180, 180);
  const demo = value.demo === undefined ? true : value.demo;
  const reviewCount = value.reviewCount === undefined ? 0 : value.reviewCount;
  const reviewedToday = value.reviewedToday === undefined ? false : value.reviewedToday;
  const averageCleanliness = optionalNullableNumber(value.averageCleanliness, 'averageCleanliness');
  const busynessValue = optionalNullableString(value.busyness, 'busyness');
  const busynessReportedAt = optionalNullableString(value.busynessReportedAt, 'busynessReportedAt');
  const busynessStatus = value.busynessStatus ?? 'unknown';
  const openStatus = value.openStatus ?? 'unknown';
  const restroomType = value.restroomType ?? null;
  const amenities = isBooleanOrNullRecord(
    value.amenities,
    'amenities',
    ['babyChanging', 'menstrualProducts', 'hooks', 'shelves'],
  );
  const accessibility = isBooleanOrNullRecord(
    value.accessibility,
    'accessibility',
    ['wheelchairAccessible', 'grabBars', 'accessibleSink', 'stepFreeRoute'],
  );
  const hours = parseHours(value.hours);
  const timezone = optionalNullableString(value.timezone, 'timezone');
  const indoorDirections = optionalNullableString(value.indoorDirections, 'indoorDirections');
  const directoryVerified = value.directoryVerified ?? false;
  const verificationSource = optionalNullableString(value.verificationSource, 'verificationSource');
  const verifiedAt = optionalNullableString(value.verifiedAt, 'verifiedAt');
  const verifiedBy = optionalNullableString(value.verifiedBy, 'verifiedBy');
  const safetyInfo = value.safetyInfo ?? [];

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
  if (!['unknown', 'current', 'stale'].includes(busynessStatus as string)) {
    throw new Error('Bathroom response has an invalid busynessStatus.');
  }
  if (!['unknown', 'open', 'closed'].includes(openStatus as string)) {
    throw new Error('Bathroom response has an invalid openStatus.');
  }
  if (
    busynessStatus !== 'unknown'
    && (busynessValue === null || busynessReportedAt === null)
  ) {
    throw new Error('Bathroom response has an inconsistent busyness status.');
  }
  if (openStatus !== 'unknown' && directoryVerified !== true) {
    throw new Error('Bathroom response has an open status for an unverified directory.');
  }
  if (restroomType !== null && !['single-stall', 'multi-stall'].includes(restroomType as string)) {
    throw new Error('Bathroom response has an invalid restroomType.');
  }
  if (typeof directoryVerified !== 'boolean') {
    throw new Error('Bathroom response has an invalid directoryVerified flag.');
  }
  if (value.safetyInfo !== undefined && !Array.isArray(safetyInfo)) {
    throw new Error('Bathroom response has invalid safety information.');
  }
  const parsedSafetyInfo = (safetyInfo as unknown[]).map((entry) => {
    if (
      !isRecord(entry)
      || typeof entry.text !== 'string'
      || typeof entry.source !== 'string'
      || !isSafetyInfoKind(entry.kind)
      || typeof entry.updatedAt !== 'string'
      || Number.isNaN(Date.parse(entry.updatedAt))
      || typeof entry.verified !== 'boolean'
    ) {
      throw new Error('Bathroom response has an invalid safety information entry.');
    }
    return {
      text: entry.text,
      source: entry.source,
      kind: entry.kind,
      updatedAt: entry.updatedAt,
      verified: entry.verified,
    };
  });
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
    busynessStatus: busynessStatus as Bathroom['busynessStatus'],
    reviewedToday,
    restroomType: restroomType as Bathroom['restroomType'],
    amenities: amenities as Bathroom['amenities'],
    accessibility: accessibility as Bathroom['accessibility'],
    hours,
    timezone,
    openStatus: openStatus as Bathroom['openStatus'],
    indoorDirections,
    safetyInfo: parsedSafetyInfo,
    directoryVerified,
    verificationSource,
    verifiedAt,
    verifiedBy,
  };
}

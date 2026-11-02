import type {
  Bathroom,
  Busyness,
  CleanlinessRating,
  MaintenanceCategory,
  MaintenanceReport,
  MaintenanceReportStatus,
  Coordinates,
} from './types';
import { parseBathroom } from './types';
import { Platform } from 'react-native';
import {
  ApiError,
  apiHttpError,
  apiInvalidResponseError,
  apiTimeoutError,
  apiUnreachableError,
} from './apiErrors';
export { ApiError } from './apiErrors';

export type WalkingRoute = {
  coordinates: Coordinates[];
  distanceMeters: number;
  durationSeconds: number;
  instructions: string[];
};

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const API_URL = (Platform.OS === 'web' ? 'http://localhost:3000/api' : configuredApiUrl).replace(/\/$/, '');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function request(path: string, options?: RequestInit): Promise<unknown> {
  let response: Response;
  const endpoint = `${API_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    response = await fetch(endpoint, {
      ...options,
      signal: options?.signal || controller.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...options?.headers },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw apiTimeoutError(API_URL, endpoint);
    }
    const detail = error instanceof Error ? ` ${error.message}` : '';
    throw apiUnreachableError(API_URL, endpoint, detail);
  } finally {
    clearTimeout(timeout);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    if (response.ok) {
      throw apiInvalidResponseError('Bathroom service returned an invalid response.', response.status);
    }
    body = null;
  }

  if (!response.ok) {
    const message = isRecord(body) && typeof body.error === 'string'
      ? body.error
      : `Bathroom service request failed (${response.status}).`;
    throw apiHttpError(message, response.status, endpoint);
  }

  return body;
}

function responseField(body: unknown, field: string): unknown {
  if (!isRecord(body) || !(field in body)) {
    throw apiInvalidResponseError('Bathroom service returned an invalid response.');
  }
  return body[field];
}

function parseWalkingRoute(value: unknown): WalkingRoute {
  if (!isRecord(value)
    || !Array.isArray(value.coordinates)
    || !value.coordinates.every((coordinate) => isRecord(coordinate)
      && typeof coordinate.latitude === 'number'
      && typeof coordinate.longitude === 'number')
    || typeof value.distanceMeters !== 'number'
    || typeof value.durationSeconds !== 'number'
    || !Array.isArray(value.instructions)
    || !value.instructions.every((instruction) => typeof instruction === 'string')) {
    throw apiInvalidResponseError('Route service returned an invalid walking route.');
  }
  return value as WalkingRoute;
}

export async function fetchWalkingRoute(
  origin: Coordinates,
  destination: Coordinates,
): Promise<WalkingRoute> {
  const body = await request('/routes/walking', {
    method: 'POST',
    body: JSON.stringify({ origin, destination }),
  });
  return parseWalkingRoute(responseField(body, 'route'));
}

export async function fetchBathrooms(
  installationId: string,
  search = '',
): Promise<Bathroom[]> {
  const query = new URLSearchParams({ installationId });
  if (search.trim()) query.set('search', search.trim());
  const body = await request(`/bathrooms?${query.toString()}`);
  const value = responseField(body, 'bathrooms');
  if (!Array.isArray(value)) {
    throw apiInvalidResponseError('Bathroom service returned an invalid bathroom list.');
  }
  return value.map(parseBathroom);
}

export async function fetchBathroom(
  bathroomId: string,
  installationId: string,
): Promise<Bathroom> {
  const query = new URLSearchParams({ installationId });
  const body = await request(
    `/bathrooms/${encodeURIComponent(bathroomId)}?${query.toString()}`,
  );
  return parseBathroom(responseField(body, 'bathroom'));
}

export async function submitBathroomReview(
  bathroomId: string,
  installationId: string,
  cleanliness: CleanlinessRating,
  busyness: Busyness,
): Promise<Bathroom> {
  const body = await request(
    `/bathrooms/${encodeURIComponent(bathroomId)}/reviews`,
    {
      method: 'POST',
      body: JSON.stringify({ installationId, cleanliness, busyness }),
    },
  );
  return parseBathroom(responseField(body, 'bathroom'));
}

function parseMaintenanceReport(value: unknown): MaintenanceReport {
  if (
    !isRecord(value)
    || typeof value.id !== 'number'
    || !Number.isInteger(value.id)
    || typeof value.bathroomId !== 'string'
    || typeof value.category !== 'string'
    || !['cleanliness', 'supplies', 'fixture', 'accessibility', 'safety', 'other'].includes(value.category)
    || typeof value.description !== 'string'
    || typeof value.status !== 'string'
    || !['open', 'in_progress', 'resolved', 'dismissed'].includes(value.status)
    || typeof value.createdAt !== 'string'
    || Number.isNaN(Date.parse(value.createdAt))
    || typeof value.updatedAt !== 'string'
    || Number.isNaN(Date.parse(value.updatedAt))
  ) {
    throw apiInvalidResponseError('Bathroom service returned an invalid maintenance report.');
  }
  return {
    id: value.id,
    bathroomId: value.bathroomId,
    category: value.category as MaintenanceCategory,
    description: value.description,
    status: value.status as MaintenanceReportStatus,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export async function fetchMaintenanceReports(bathroomId: string): Promise<MaintenanceReport[]> {
  const body = await request(
    `/bathrooms/${encodeURIComponent(bathroomId)}/maintenance-reports`,
  );
  const reports = responseField(body, 'reports');
  if (!Array.isArray(reports)) {
    throw apiInvalidResponseError('Bathroom service returned an invalid maintenance report list.');
  }
  return reports.map(parseMaintenanceReport);
}

export async function submitMaintenanceReport(
  bathroomId: string,
  installationId: string,
  category: MaintenanceCategory,
  description: string,
): Promise<MaintenanceReport> {
  const body = await request(
    `/bathrooms/${encodeURIComponent(bathroomId)}/maintenance-reports`,
    {
      method: 'POST',
      body: JSON.stringify({ installationId, category, description }),
    },
  );
  return parseMaintenanceReport(responseField(body, 'report'));
}

import type {
  Bathroom,
  Busyness,
  CleanlinessRating,
  MaintenanceCategory,
  MaintenanceReport,
  MaintenanceReportStatus,
} from './types';
import { parseBathroom } from './types';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function request(path: string, options?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...options?.headers },
    });
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : '';
    throw new ApiError(`Unable to reach the bathroom service.${detail}`, 0);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    if (response.ok) {
      throw new ApiError('Bathroom service returned an invalid response.', response.status);
    }
    body = null;
  }

  if (!response.ok) {
    const message = isRecord(body) && typeof body.error === 'string'
      ? body.error
      : `Bathroom service request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }

  return body;
}

function responseField(body: unknown, field: string): unknown {
  if (!isRecord(body) || !(field in body)) {
    throw new ApiError('Bathroom service returned an invalid response.', 502);
  }
  return body[field];
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
    throw new ApiError('Bathroom service returned an invalid bathroom list.', 502);
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
    throw new ApiError('Bathroom service returned an invalid maintenance report.', 502);
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
    throw new ApiError('Bathroom service returned an invalid maintenance report list.', 502);
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

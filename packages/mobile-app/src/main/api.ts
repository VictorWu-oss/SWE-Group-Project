import type { Bathroom, Busyness, CleanlinessRating } from './types';
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

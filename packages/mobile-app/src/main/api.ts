import type { Bathroom, Busyness } from './types';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Unable to reach the bathroom service.');
  return body as T;
}

export async function fetchBathrooms(installationId: string): Promise<Bathroom[]> {
  const response = await request<{ bathrooms: Bathroom[] }>(
    `/bathrooms?installationId=${encodeURIComponent(installationId)}`,
  );
  return response.bathrooms;
}

export async function submitBathroomReview(
  bathroomId: string,
  installationId: string,
  cleanliness: number,
  busyness: Busyness,
): Promise<Bathroom> {
  const response = await request<{ bathroom: Bathroom }>(
    `/bathrooms/${encodeURIComponent(bathroomId)}/reviews`,
    {
      method: 'POST',
      body: JSON.stringify({ installationId, cleanliness, busyness }),
    },
  );
  return response.bathroom;
}
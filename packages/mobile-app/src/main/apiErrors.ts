export type ApiErrorCode = 'API_TIMEOUT' | 'API_UNREACHABLE' | 'API_HTTP_ERROR' | 'API_INVALID_RESPONSE';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly endpoint?: string;

  constructor(message: string, status: number, code: ApiErrorCode, endpoint?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.endpoint = endpoint;
  }
}

export function apiTimeoutError(apiUrl: string, endpoint: string) {
  return new ApiError(`Bathroom service timed out after 8 seconds. Check that the backend is running at ${apiUrl}.`, 0, 'API_TIMEOUT', endpoint);
}

export function apiUnreachableError(apiUrl: string, endpoint: string, detail = '') {
  return new ApiError(`Unable to reach the bathroom service at ${apiUrl}.${detail}`, 0, 'API_UNREACHABLE', endpoint);
}

export function apiHttpError(message: string, status: number, endpoint: string) {
  return new ApiError(message, status, 'API_HTTP_ERROR', endpoint);
}

export function apiInvalidResponseError(message: string, status = 502) {
  return new ApiError(message, status, 'API_INVALID_RESPONSE');
}

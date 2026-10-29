function getBaseApiUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  const raw = (envUrl && envUrl.trim()) || 'http://localhost:8000/api/v1';
  // Strip trailing slashes
  const trimmed = raw.replace(/\/+$/, '');
  // Ensure /api/v1 prefix is preserved consistently
  if (!trimmed.endsWith('/api/v1')) {
    return `${trimmed}/api/v1`;
  }
  return trimmed;
}

export const API_URL = getBaseApiUrl();

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number = 0, detail: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

function formatErrorMessage(status: number, detail: unknown): string {
  if (typeof detail === 'string' && detail.trim().length > 0) {
    const trimmed = detail.trim();
    // Farmer-friendly mappings for backend implementation gate messages
    if (trimmed.includes('High-impact') || trimmed.includes('requires Extension Officer approval')) {
      return 'This recommendation is still awaiting review.';
    }
    if (trimmed.includes('requires revision before execution')) {
      return 'This recommendation has changes requested and cannot be implemented yet.';
    }
    if (trimmed.includes('already been implemented')) {
      return 'This recommendation has already been completed.';
    }
    if (trimmed.includes('Only the farm owner') || trimmed.includes('do not own the farm')) {
      return 'Only the registered farm owner can carry out this recommendation.';
    }
    if (trimmed.includes('Unauthorized') || trimmed.includes('Forbidden')) {
      return "You don't have permission to perform this action.";
    }
    // Return sanitized text without internal codes
    return trimmed;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((d: any) => d?.msg || 'Invalid input').join('; ');
  }
  if (detail && typeof detail === 'object') {
    const obj = detail as Record<string, any>;
    if (obj.detail) return formatErrorMessage(status, obj.detail);
    if (obj.message) return formatErrorMessage(status, String(obj.message));
  }

  switch (status) {
    case 400:
      return 'Unable to process this request. Please verify the submitted information.';
    case 401:
      return 'Invalid credentials. Please verify your email and password.';
    case 403:
      return "You don't have permission to perform this action.";
    case 404:
      return 'The requested information could not be found.';
    case 422:
      return 'Please check your submitted details and try again.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'The service is temporarily unavailable. Please try again shortly.';
    default:
      return 'An unexpected issue occurred. Please try again.';
  }
}

function handleNetworkError(err: unknown): never {
  if (err instanceof ApiError) {
    throw err;
  }
  const rawMsg = err instanceof Error ? err.message : String(err);
  if (
    rawMsg.includes('Failed to fetch') ||
    rawMsg.includes('NetworkError') ||
    rawMsg.includes('fetch failed') ||
    rawMsg.includes('ECONNREFUSED') ||
    rawMsg.includes('Network request failed')
  ) {
    throw new ApiError(
      'Service is currently unreachable. Please check your connection and try again.',
      0,
      err
    );
  }
  throw new ApiError('Network connection issue. Please try again.', 0, err);
}

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${cleanEndpoint}`, { ...options, headers });
  } catch (err) {
    handleNetworkError(err);
  }

  if (!response.ok) {
    let detail: unknown = null;
    try {
      const data = await response.json();
      detail = data.detail;
    } catch {
      detail = null;
    }
    const message = formatErrorMessage(response.status, detail);
    throw new ApiError(message, response.status, detail);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

export const fetchAuthApi = async (endpoint: string, body: URLSearchParams) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${cleanEndpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch (err) {
    handleNetworkError(err);
  }

  if (!response.ok) {
    let detail: unknown = null;
    try {
      const data = await response.json();
      detail = data.detail;
    } catch {
      detail = null;
    }
    const message = formatErrorMessage(response.status, detail);
    throw new ApiError(message, response.status, detail);
  }

  return response.json();
};

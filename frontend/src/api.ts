// Centralized API client with auth token handling

const API_BASE = "http://localhost:3001/api";

/**
 * Build a URL with query parameters.
 */
function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

/**
 * Get the stored auth token from localStorage.
 */
function getToken(): string | null {
  return localStorage.getItem("token");
}

/**
 * Build common headers including Authorization if token exists.
 */
function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Handle API response: parse JSON, handle 401 by clearing token.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    localStorage.removeItem("token");
    // Let React Router handle redirect via ProtectedRoute — don't bypass SPA
    throw new Error("Unauthorized");
  }
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error ${response.status}: ${errorBody}`);
  }
  return response.json() as Promise<T>;
}

/**
 * GET request with optional query parameters.
 */
export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const url = buildUrl(path, params);
  const response = await fetch(url, {
    method: "GET",
    headers: authHeaders(),
  });
  return handleResponse<T>(response);
}

/**
 * POST request with optional JSON body.
 */
export async function apiPost<T>(
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const url = buildUrl(path);
  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

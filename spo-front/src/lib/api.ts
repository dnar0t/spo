const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from './auth';

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

export { clearTokens };

/**
 * Синхронизирует токены между api.ts и auth.ts
 * Вызывается при восстановлении или установке токенов извне.
 */
export function setTokens(accessToken: string, refreshToken: string): void {
  saveTokens({ accessToken, refreshToken });
}

interface RequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function refreshTokensRequest(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    throw new ApiError('No refresh token', 401);
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearTokens();
    throw new ApiError('Refresh token expired', 401);
  }

  const data = await response.json();
  saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
}

async function request<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { headers = {}, skipAuth = false, ...rest } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const token = getAccessToken();
  if (!skipAuth && token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...rest,
    headers: requestHeaders,
  });

  // Попытка refresh токена при 401
  if (response.status === 401 && !skipAuth && getRefreshToken()) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshTokensRequest().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    await refreshPromise;

    // Повторяем запрос с новым токеном
    const newToken = getAccessToken();
    if (newToken) {
      requestHeaders['Authorization'] = `Bearer ${newToken}`;
    }

    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...rest,
      headers: requestHeaders,
    });
  }

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = null;
    }

    const message =
      (errorBody && typeof errorBody === 'object' && 'message' in errorBody
        ? (errorBody as Record<string, string>).message
        : undefined) ||
      (errorBody && typeof errorBody === 'object' && 'error' in errorBody
        ? (errorBody as Record<string, string>).error
        : undefined) ||
      `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  get<T = unknown>(endpoint: string, options?: RequestOptions) {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch<T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T = unknown>(endpoint: string, options?: RequestOptions) {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};

export { ApiError };
export type { RequestOptions };

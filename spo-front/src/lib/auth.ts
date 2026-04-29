/**
 * Типы для аутентификации и пользователя
 */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserDto {
  id: number;
  login: string;
  fullName: string;
  email: string;
  roles: string[];
}

// Ключи для localStorage
const ACCESS_TOKEN_KEY = "spo_access_token";
const REFRESH_TOKEN_KEY = "spo_refresh_token";

// In-memory storage (приоритетнее localStorage)
let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;

/**
 * Сохранить токены (в память и localStorage как fallback)
 */
export function saveTokens(tokens: AuthTokens): void {
  memoryAccessToken = tokens.accessToken;
  memoryRefreshToken = tokens.refreshToken;
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  } catch {
    // localStorage может быть недоступен (инкогнито, тесты)
  }
}

/**
 * Получить access token (из памяти, из localStorage)
 */
export function getAccessToken(): string | null {
  if (memoryAccessToken) return memoryAccessToken;
  try {
    const stored = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (stored) {
      memoryAccessToken = stored;
      return stored;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Получить refresh token
 */
export function getRefreshToken(): string | null {
  if (memoryRefreshToken) return memoryRefreshToken;
  try {
    const stored = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (stored) {
      memoryRefreshToken = stored;
      return stored;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Очистить токены
 */
export function clearTokens(): void {
  memoryAccessToken = null;
  memoryRefreshToken = null;
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

/**
 * Проверить, есть ли токены
 */
export function hasTokens(): boolean {
  return getAccessToken() !== null && getRefreshToken() !== null;
}

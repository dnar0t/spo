import { clearTokens } from './auth';
export { clearTokens };
export declare function setTokens(accessToken: string, refreshToken: string): void;
interface RequestOptions extends Omit<RequestInit, 'headers'> {
    headers?: Record<string, string>;
    skipAuth?: boolean;
}
declare class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(message: string, status: number, body?: unknown);
}
declare function request<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T>;
export declare const api: {
    get<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T>;
    post<T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T>;
    put<T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T>;
    patch<T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T>;
    delete<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T>;
};
export { ApiError };
export type { RequestOptions };
export { request };

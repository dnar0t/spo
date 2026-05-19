"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = exports.api = exports.clearTokens = void 0;
exports.setTokens = setTokens;
exports.request = request;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const auth_1 = require("./auth");
Object.defineProperty(exports, "clearTokens", { enumerable: true, get: function () { return auth_1.clearTokens; } });
let isRefreshing = false;
let refreshPromise = null;
function setTokens(accessToken, refreshToken) {
    (0, auth_1.saveTokens)({ accessToken, refreshToken });
}
class ApiError extends Error {
    constructor(message, status, body) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.body = body;
    }
}
exports.ApiError = ApiError;
async function refreshTokensRequest() {
    const refreshToken = (0, auth_1.getRefreshToken)();
    if (!refreshToken) {
        (0, auth_1.clearTokens)();
        throw new ApiError('No refresh token', 401);
    }
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) {
        (0, auth_1.clearTokens)();
        throw new ApiError('Refresh token expired', 401);
    }
    const json = await response.json();
    const tokens = json && typeof json === 'object' && 'success' in json && 'data' in json ? json.data : json;
    (0, auth_1.saveTokens)({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
}
async function request(endpoint, options = {}) {
    const { headers = {}, skipAuth = false, ...rest } = options;
    const requestHeaders = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        ...headers,
    };
    const token = (0, auth_1.getAccessToken)();
    if (!skipAuth && token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
    }
    let response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...rest,
        headers: requestHeaders,
    });
    if (response.status === 401 && !skipAuth && (0, auth_1.getRefreshToken)()) {
        if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = refreshTokensRequest().finally(() => {
                isRefreshing = false;
                refreshPromise = null;
            });
        }
        await refreshPromise;
        const newToken = (0, auth_1.getAccessToken)();
        if (newToken) {
            requestHeaders['Authorization'] = `Bearer ${newToken}`;
        }
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...rest,
            headers: requestHeaders,
        });
    }
    if (!response.ok) {
        let errorBody;
        try {
            errorBody = await response.json();
        }
        catch {
            errorBody = null;
        }
        const message = (errorBody && typeof errorBody === 'object' && 'message' in errorBody
            ? errorBody.message
            : undefined) ||
            (errorBody && typeof errorBody === 'object' && 'error' in errorBody
                ? errorBody.error
                : undefined) ||
            `Request failed with status ${response.status}`;
        throw new ApiError(message, response.status, errorBody);
    }
    if (response.status === 204) {
        return undefined;
    }
    const contentLength = response.headers.get('content-length');
    if (contentLength === '0') {
        return undefined;
    }
    const json = await response.json();
    if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
        return json.data;
    }
    return json;
}
exports.api = {
    get(endpoint, options) {
        return request(endpoint, { ...options, method: 'GET' });
    },
    post(endpoint, body, options) {
        return request(endpoint, {
            ...options,
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        });
    },
    put(endpoint, body, options) {
        return request(endpoint, {
            ...options,
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined,
        });
    },
    patch(endpoint, body, options) {
        return request(endpoint, {
            ...options,
            method: 'PATCH',
            body: body ? JSON.stringify(body) : undefined,
        });
    },
    delete(endpoint, options) {
        return request(endpoint, { ...options, method: 'DELETE' });
    },
};
//# sourceMappingURL=api.js.map
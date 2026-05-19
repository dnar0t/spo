"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveTokens = saveTokens;
exports.getAccessToken = getAccessToken;
exports.getRefreshToken = getRefreshToken;
exports.clearTokens = clearTokens;
exports.hasTokens = hasTokens;
const ACCESS_TOKEN_KEY = "spo_access_token";
const REFRESH_TOKEN_KEY = "spo_refresh_token";
let memoryAccessToken = null;
let memoryRefreshToken = null;
function saveTokens(tokens) {
    memoryAccessToken = tokens.accessToken;
    memoryRefreshToken = tokens.refreshToken;
    try {
        localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
    catch {
    }
}
function getAccessToken() {
    if (memoryAccessToken)
        return memoryAccessToken;
    try {
        const stored = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (stored) {
            memoryAccessToken = stored;
            return stored;
        }
    }
    catch {
    }
    return null;
}
function getRefreshToken() {
    if (memoryRefreshToken)
        return memoryRefreshToken;
    try {
        const stored = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (stored) {
            memoryRefreshToken = stored;
            return stored;
        }
    }
    catch {
    }
    return null;
}
function clearTokens() {
    memoryAccessToken = null;
    memoryRefreshToken = null;
    try {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    catch {
    }
}
function hasTokens() {
    return getAccessToken() !== null && getRefreshToken() !== null;
}
//# sourceMappingURL=auth.js.map
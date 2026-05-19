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
export declare function saveTokens(tokens: AuthTokens): void;
export declare function getAccessToken(): string | null;
export declare function getRefreshToken(): string | null;
export declare function clearTokens(): void;
export declare function hasTokens(): boolean;

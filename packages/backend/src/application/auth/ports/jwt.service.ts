export interface IJwtService {
  generateAccessToken(payload: { sub: string; login: string; sessionId: string }): string;
  generateRefreshToken(): string;
  verifyAccessToken(token: string): { sub: string; login: string; sessionId: string };
  getAccessTokenExpiry(): number; // seconds
  getRefreshTokenExpiry(): number; // seconds
}

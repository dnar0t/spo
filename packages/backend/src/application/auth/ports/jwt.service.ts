export interface IJwtService {
  generateAccessToken(payload: {
    sub: string;
    login: string;
    sessionId: string;
    roles: string[];
  }): string;
  generateRefreshToken(): string;
  verifyAccessToken(token: string): {
    sub: string;
    login: string;
    sessionId: string;
    roles: string[];
  };
  getAccessTokenExpiry(): number; // seconds
  getRefreshTokenExpiry(): number; // seconds
}

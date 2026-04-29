import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'node:crypto';
import { IJwtService } from '../../application/auth/ports/jwt.service';

@Injectable()
export class JwtService implements IJwtService {
  private readonly accessTokenSecret: string;
  private readonly accessTokenExpirySeconds: number;
  private readonly refreshTokenExpirySeconds: number;

  constructor(private readonly configService: ConfigService) {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    this.accessTokenSecret = jwtSecret;
    this.accessTokenExpirySeconds = this.configService.get<number>(
      'JWT_ACCESS_EXPIRY_SECONDS',
      900,
    ); // 15 min
    this.refreshTokenExpirySeconds = this.configService.get<number>(
      'JWT_REFRESH_EXPIRY_SECONDS',
      604800,
    ); // 7 days
  }

  generateAccessToken(payload: {
    sub: string;
    login: string;
    sessionId: string;
    roles: string[];
  }): string {
    const now = Math.floor(Date.now() / 1000);

    return jwt.sign(
      {
        sub: payload.sub,
        login: payload.login,
        sessionId: payload.sessionId,
        roles: payload.roles,
        iat: now,
        exp: now + this.accessTokenExpirySeconds,
      },
      this.accessTokenSecret,
      { algorithm: 'HS256' },
    );
  }

  generateRefreshToken(): string {
    return crypto.randomBytes(48).toString('hex');
  }

  verifyAccessToken(token: string): {
    sub: string;
    login: string;
    sessionId: string;
    roles: string[];
  } {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        algorithms: ['HS256'],
      }) as jwt.JwtPayload & { sub: string; login: string; sessionId: string; roles: string[] };

      return {
        sub: decoded.sub,
        login: decoded.login,
        sessionId: decoded.sessionId,
        roles: decoded.roles ?? [],
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Access token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid access token');
      }
      throw new UnauthorizedException('Token verification failed');
    }
  }

  getAccessTokenExpiry(): number {
    return this.accessTokenExpirySeconds;
  }

  getRefreshTokenExpiry(): number {
    return this.refreshTokenExpirySeconds;
  }
}

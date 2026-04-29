import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import { IEncryptionService } from '../../application/auth/ports/encryption.service';

/**
 * EncryptionService
 *
 * Реализация IEncryptionService с AES-256-GCM.
 *
 * - encrypt: генерирует случайный IV (12 байт), шифрует данные,
 *   возвращает IV + зашифрованные данные + auth tag как base64
 * - decrypt: разбирает IV (12 байт) + encrypted + auth tag (16 байт),
 *   расшифровывает данные
 *
 * Ключ шифрования берётся из ENCRYPTION_KEY env (64 hex символа = 32 байта).
 */
@Injectable()
export class EncryptionService implements IEncryptionService {
  private readonly key: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 12;
  private readonly authTagLength = 16;

  constructor(private readonly configService: ConfigService) {
    const keyHex = this.configService.get<string>('ENCRYPTION_KEY');

    if (!keyHex) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    if (keyHex.length !== 64) {
      throw new Error(
        'ENCRYPTION_KEY must be 64 hex characters (32 bytes). ' +
          'Generate one with: openssl rand -hex 32',
      );
    }
    this.key = Buffer.from(keyHex, 'hex');
  }

  /**
   * Шифрование строки алгоритмом AES-256-GCM.
   * Возвращает base64-строку вида: IV (12 байт) + Encrypted + AuthTag (16 байт).
   */
  encrypt(plainText: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv, {
      authTagLength: this.authTagLength,
    });

    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);

    const authTag = cipher.getAuthTag();

    // Combine: IV + Encrypted + AuthTag → base64
    const combined = Buffer.concat([iv, encrypted, authTag]);
    return combined.toString('base64');
  }

  /**
   * Расшифрование строки, зашифрованной методом encrypt.
   * Принимает base64-строку вида: IV (12 байт) + Encrypted + AuthTag (16 байт).
   */
  decrypt(cipherText: string): string {
    const combined = Buffer.from(cipherText, 'base64');

    if (combined.length < this.ivLength + this.authTagLength) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = combined.subarray(0, this.ivLength);
    const authTag = combined.subarray(combined.length - this.authTagLength);
    const encrypted = combined.subarray(this.ivLength, combined.length - this.authTagLength);

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv, {
      authTagLength: this.authTagLength,
    });

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted.toString('utf8');
  }
}

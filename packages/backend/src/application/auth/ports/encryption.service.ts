export interface IEncryptionService {
  encrypt(plainText: string): string;  // returns encrypted + IV as base64
  decrypt(cipherText: string): string;
}

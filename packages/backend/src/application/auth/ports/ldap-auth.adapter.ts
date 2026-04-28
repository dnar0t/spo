export interface ILdapAuthAdapter {
  authenticate(login: string, password: string): Promise<{
    success: boolean;
    userDetails?: { dn: string; cn: string; mail: string };
  }>;
  isConfigured(): boolean;
}

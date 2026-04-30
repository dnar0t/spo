export const LDAP_AUTH_ADAPTER = Symbol('LDAP_AUTH_ADAPTER');

export interface ILdapAuthAdapter {
  authenticate(
    login: string,
    password: string,
  ): Promise<{
    success: boolean;
    userDetails?: { dn: string; cn: string; mail: string };
  }>;
  isConfigured(): boolean;
}

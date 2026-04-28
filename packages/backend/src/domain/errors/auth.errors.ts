import { DomainError } from './domain.error';

/**
 * Ошибка: неверный логин или пароль
 */
export class InvalidCredentialsError extends DomainError {
  constructor(message = 'Invalid login or password') {
    super(message, 'INVALID_CREDENTIALS');
  }
}

/**
 * Ошибка: учётная запись временно заблокирована после N неудачных попыток
 */
export class AccountLockedError extends DomainError {
  constructor(message = 'Account is locked due to too many failed attempts') {
    super(message, 'ACCOUNT_LOCKED');
  }
}

/**
 * Ошибка: невалидный или просроченный токен
 */
export class InvalidTokenError extends DomainError {
  constructor(message = 'Token is invalid or expired') {
    super(message, 'INVALID_TOKEN');
  }
}

/**
 * Ошибка: сессия истекла
 */
export class SessionExpiredError extends DomainError {
  constructor(message = 'Session has expired') {
    super(message, 'SESSION_EXPIRED');
  }
}

/**
 * Ошибка: проблема с подключением к LDAP
 */
export class LdapConnectionError extends DomainError {
  constructor(message = 'Failed to connect to LDAP server') {
    super(message, 'LDAP_CONNECTION_ERROR');
  }
}

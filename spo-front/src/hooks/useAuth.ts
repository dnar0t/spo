import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, setTokens, clearTokens } from '@/lib/api';
import { getAccessToken, getRefreshToken, hasTokens } from '@/lib/auth';
import type { UserDto } from '@/lib/auth';

interface AuthState {
  user: UserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

type UseAuthReturn = AuthState & AuthActions;

// Глобальное состояние для синхронизации между экземплярами хука
let globalAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

let globalListeners: Array<() => void> = [];

function notifyListeners() {
  globalListeners.forEach((listener) => listener());
}

async function fetchUser(): Promise<UserDto | null> {
  try {
    // Ответ /auth/me возвращает данные пользователя напрямую (без обёртки user)
    const user = await api.get<UserDto>('/auth/me');
    return user;
  } catch {
    return null;
  }
}

export function useAuth(): UseAuthReturn {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>(globalAuthState);
  const fetchedRef = useRef(false);

  // Подписка на глобальное состояние
  useEffect(() => {
    const listener = () => {
      setState({ ...globalAuthState });
    };
    globalListeners.push(listener);
    return () => {
      globalListeners = globalListeners.filter((l) => l !== listener);
    };
  }, []);

  // Проверка аутентификации при монтировании
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    if (!hasTokens()) {
      globalAuthState = { user: null, isAuthenticated: false, isLoading: false };
      notifyListeners();
      return;
    }

    // Восстанавливаем токены из localStorage в api
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();
    if (accessToken && refreshToken) {
      setTokens(accessToken, refreshToken);
    }

    fetchUser().then((user) => {
      globalAuthState = {
        user,
        isAuthenticated: !!user,
        isLoading: false,
      };
      notifyListeners();
    });
  }, []);

  const login = useCallback(async (loginValue: string, password: string): Promise<void> => {
    const data = await api.post<{
      accessToken: string;
      refreshToken: string;
      user: UserDto;
    }>('/auth/login', { login: loginValue, password }, { skipAuth: true });

    setTokens(data.accessToken, data.refreshToken);

    globalAuthState = {
      user: data.user,
      isAuthenticated: true,
      isLoading: false,
    };
    notifyListeners();
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Игнорируем ошибки при логауте
    }

    clearTokens();

    globalAuthState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
    };
    notifyListeners();

    navigate('/login', { replace: true });
  }, [navigate]);

  return {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    login,
    logout,
  };
}

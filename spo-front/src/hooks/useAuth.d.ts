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
export declare function useAuth(): UseAuthReturn;
export {};

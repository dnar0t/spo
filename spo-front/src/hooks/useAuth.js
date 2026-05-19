"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuth = useAuth;
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const api_1 = require("@/lib/api");
const auth_1 = require("@/lib/auth");
let globalAuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
};
let globalListeners = [];
function notifyListeners() {
    globalListeners.forEach((listener) => listener());
}
async function fetchUser() {
    try {
        const user = await api_1.api.get('/auth/me');
        return user;
    }
    catch {
        return null;
    }
}
function useAuth() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [state, setState] = (0, react_1.useState)(globalAuthState);
    const fetchedRef = (0, react_1.useRef)(false);
    (0, react_1.useEffect)(() => {
        const listener = () => {
            setState({ ...globalAuthState });
        };
        globalListeners.push(listener);
        return () => {
            globalListeners = globalListeners.filter((l) => l !== listener);
        };
    }, []);
    (0, react_1.useEffect)(() => {
        if (fetchedRef.current)
            return;
        fetchedRef.current = true;
        if (!(0, auth_1.hasTokens)()) {
            globalAuthState = { user: null, isAuthenticated: false, isLoading: false };
            notifyListeners();
            return;
        }
        const accessToken = (0, auth_1.getAccessToken)();
        const refreshToken = (0, auth_1.getRefreshToken)();
        if (accessToken && refreshToken) {
            (0, api_1.setTokens)(accessToken, refreshToken);
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
    const login = (0, react_1.useCallback)(async (loginValue, password) => {
        const data = await api_1.api.post('/auth/login', { login: loginValue, password }, { skipAuth: true });
        (0, api_1.setTokens)(data.accessToken, data.refreshToken);
        globalAuthState = {
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
        };
        notifyListeners();
    }, []);
    const logout = (0, react_1.useCallback)(async () => {
        try {
            await api_1.api.post('/auth/logout');
        }
        catch {
        }
        (0, api_1.clearTokens)();
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
//# sourceMappingURL=useAuth.js.map
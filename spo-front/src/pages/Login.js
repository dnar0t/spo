"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Login;
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const useAuth_1 = require("@/hooks/useAuth");
const api_1 = require("@/lib/api");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const label_1 = require("@/components/ui/label");
const card_1 = require("@/components/ui/card");
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@/lib/utils");
function Login() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const { login, isAuthenticated } = (0, useAuth_1.useAuth)();
    const [loginValue, setLoginValue] = (0, react_1.useState)('');
    const [password, setPassword] = (0, react_1.useState)('');
    const [showPassword, setShowPassword] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [isSubmitting, setIsSubmitting] = (0, react_1.useState)(false);
    const [loginTouched, setLoginTouched] = (0, react_1.useState)(false);
    const [passwordTouched, setPasswordTouched] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);
    if (isAuthenticated) {
        return null;
    }
    const loginError = loginTouched && !loginValue.trim();
    const passwordError = passwordTouched && !password;
    const canSubmit = loginValue.trim().length > 0 && password.length > 0 && !isSubmitting;
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoginTouched(true);
        setPasswordTouched(true);
        if (!loginValue.trim() || !password)
            return;
        setError(null);
        setIsSubmitting(true);
        try {
            await login(loginValue.trim(), password);
            navigate('/', { replace: true });
        }
        catch (err) {
            if (err instanceof api_1.ApiError) {
                setError(err.message);
            }
            else if (err instanceof Error) {
                setError(err.message);
            }
            else {
                setError('Произошла неизвестная ошибка. Попробуйте снова.');
            }
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <card_1.Card className="w-full max-w-sm shadow-elevated border-border/60">
        <card_1.CardHeader className="space-y-1 text-center pb-4">
          <div className="flex justify-center mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
              СПО
            </div>
          </div>
          <card_1.CardTitle className="text-xl font-semibold tracking-wide">СПО INFOMATIX</card_1.CardTitle>
          <card_1.CardDescription className="text-sm">Планирование и отчётность</card_1.CardDescription>
        </card_1.CardHeader>

        <card_1.CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            
            {error && (<div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <lucide_react_1.AlertCircle className="h-4 w-4 mt-0.5 shrink-0"/>
                <span>{error}</span>
              </div>)}

            
            <div className="space-y-1.5">
              <label_1.Label htmlFor="login" className="text-xs font-medium">
                Логин
              </label_1.Label>
              <input_1.Input id="login" type="text" placeholder="Введите логин" value={loginValue} onChange={(e) => setLoginValue(e.target.value)} onBlur={() => setLoginTouched(true)} disabled={isSubmitting} className={(0, utils_1.cn)('h-9 text-sm', loginError && 'border-destructive focus-visible:ring-destructive')} autoComplete="username" autoFocus/>
              {loginError && (<p className="text-xs text-destructive mt-0.5">Пожалуйста, введите логин</p>)}
            </div>

            
            <div className="space-y-1.5">
              <label_1.Label htmlFor="password" className="text-xs font-medium">
                Пароль
              </label_1.Label>
              <div className="relative">
                <input_1.Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Введите пароль" value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => setPasswordTouched(true)} disabled={isSubmitting} className={(0, utils_1.cn)('h-9 text-sm pr-9', passwordError && 'border-destructive focus-visible:ring-destructive')} autoComplete="current-password"/>
                <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1} aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}>
                  {showPassword ? <lucide_react_1.EyeOff className="h-4 w-4"/> : <lucide_react_1.Eye className="h-4 w-4"/>}
                </button>
              </div>
              {passwordError && (<p className="text-xs text-destructive mt-0.5">Пожалуйста, введите пароль</p>)}
            </div>

            
            <button_1.Button type="submit" className="w-full h-9 text-sm font-medium" disabled={!canSubmit}>
              {isSubmitting ? (<>
                  <lucide_react_1.Loader2 className="h-4 w-4 animate-spin"/>
                  Вход...
                </>) : ('Войти')}
            </button_1.Button>
          </form>
        </card_1.CardContent>
      </card_1.Card>
    </div>);
}
//# sourceMappingURL=Login.js.map
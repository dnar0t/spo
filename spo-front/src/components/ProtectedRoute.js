"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtectedRoute = ProtectedRoute;
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const useAuth_1 = require("@/hooks/useAuth");
const lucide_react_1 = require("lucide-react");
const button_1 = require("@/components/ui/button");
class RouteErrorBoundary extends react_1.Component {
    constructor(props) {
        super(props);
        this.handleReload = () => {
            this.setState({ hasError: false, error: null });
            window.location.reload();
        };
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (<div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            <lucide_react_1.AlertCircle className="h-10 w-10 text-destructive"/>
            <h2 className="text-lg font-semibold">Что-то пошло не так</h2>
            <p className="text-sm text-muted-foreground">
              При загрузке страницы произошла ошибка. Пожалуйста, попробуйте обновить страницу.
            </p>
            <button_1.Button onClick={this.handleReload} size="sm">
              Обновить страницу
            </button_1.Button>
          </div>
        </div>);
        }
        return this.props.children;
    }
}
function ProtectedRoute({ children }) {
    const { isAuthenticated, isLoading } = (0, useAuth_1.useAuth)();
    if (isLoading) {
        return (<div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <lucide_react_1.Loader2 className="h-8 w-8 animate-spin text-primary"/>
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        </div>
      </div>);
    }
    if (!isAuthenticated) {
        return <react_router_dom_1.Navigate to="/login" replace/>;
    }
    return <RouteErrorBoundary>{children}</RouteErrorBoundary>;
}
//# sourceMappingURL=ProtectedRoute.js.map
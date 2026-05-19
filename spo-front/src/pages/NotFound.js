"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_router_dom_1 = require("react-router-dom");
const react_1 = require("react");
const NotFound = () => {
    const location = (0, react_router_dom_1.useLocation)();
    (0, react_1.useEffect)(() => {
        console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    }, [location.pathname]);
    return (<div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>);
};
exports.default = NotFound;
//# sourceMappingURL=NotFound.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NavLink = void 0;
const react_router_dom_1 = require("react-router-dom");
const react_1 = require("react");
const utils_1 = require("@/lib/utils");
const NavLink = (0, react_1.forwardRef)(({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    return (<react_router_dom_1.NavLink ref={ref} to={to} className={({ isActive, isPending }) => (0, utils_1.cn)(className, isActive && activeClassName, isPending && pendingClassName)} {...props}/>);
});
exports.NavLink = NavLink;
NavLink.displayName = "NavLink";
//# sourceMappingURL=NavLink.js.map
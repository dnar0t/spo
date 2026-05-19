import { NavLinkProps } from "react-router-dom";
interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
    className?: string;
    activeClassName?: string;
    pendingClassName?: string;
}
declare const NavLink: import("react").ForwardRefExoticComponent<NavLinkCompatProps & import("react").RefAttributes<HTMLAnchorElement>>;
export { NavLink };

import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  /** When set, this decides the highlight instead of the router's path match. */
  isActiveOverride?: boolean;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, isActiveOverride, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        aria-current={isActiveOverride === true ? "page" : isActiveOverride === false ? null : undefined}
        className={({ isActive, isPending }) => {
          const active = isActiveOverride ?? isActive;
          return cn(className, active && activeClassName, isPending && pendingClassName);
        }}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };

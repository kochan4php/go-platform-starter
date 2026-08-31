import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { type SessionUser, useAuth } from "./auth-context";

interface AccessGuardProps {
  children: ReactNode;
  permissions?: string[];
  roles?: string[];
  when?(user: SessionUser): boolean;
}

/** UI hint only; the gateway remains the authorization authority. */
export function AccessGuard({ children, permissions = [], roles = [], when }: AccessGuardProps) {
  const { user, booting } = useAuth();
  if (booting) return null;
  if (!user) return <Navigate to="/login" replace />;

  const deniedPermission = permissions.find((permission) => !user.perms.includes(permission));
  const roleDenied = roles.length > 0 && !roles.some((role) => user.roles?.includes(role));
  if (deniedPermission || roleDenied || (when && !when(user))) {
    return (
      <Navigate
        to="/admin/403"
        replace
        state={{ requestedPermission: deniedPermission, requestedRoles: roles }}
      />
    );
  }
  return children;
}

export default function RequirePermission({ perm, children }: { perm: string; children: ReactNode }) {
  return <AccessGuard permissions={[perm]}>{children}</AccessGuard>;
}

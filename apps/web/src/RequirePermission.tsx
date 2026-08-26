import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./auth-context";

/** UI hint only — the gateway enforces truth server-side (PLAN item 61). */
export default function RequirePermission({ perm, children }: { perm: string; children: ReactNode }) {
  const { user, booting } = useAuth();
  if (booting) return null; // session restore in flight — don't bounce yet
  if (!user) return <Navigate to="/login" replace />;
  if (!user.perms.includes(perm)) {
    return <Navigate to="/admin/403" replace state={{ requestedPermission: perm }} />;
  }
  return children;
}

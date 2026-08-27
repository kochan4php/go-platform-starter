// Federated remote modules are resolved at runtime by
// @originjs/vite-plugin-federation; these declarations give TypeScript the
// shape of the exposed modules.
declare module "web_auth/LoginPage" {
  const LoginPage: import("react").ComponentType<{
    onLoggedIn(u: {
      accessToken: string;
      user: { id: string; email: string; perms?: string[]; ver?: number };
    }): void;
    mode?: "page" | "reauth";
    onCancel?(): void;
  }>;
  export default LoginPage;
}
declare module "web_auth/RegisterPage" {
  const RegisterPage: import("react").ComponentType;
  export default RegisterPage;
}
declare module "web_auth/ForgotPage" {
  const ForgotPage: import("react").ComponentType;
  export default ForgotPage;
}
declare module "web_auth/ResetPage" {
  const ResetPage: import("react").ComponentType;
  export default ResetPage;
}
declare module "web_admin_users/UsersPage" {
  const UsersPage: import("react").ComponentType;
  export default UsersPage;
}
declare module "web_admin_roles/RolesPage" {
  const RolesPage: import("react").ComponentType;
  export default RolesPage;
}

interface Document {
  startViewTransition?: (update: () => void | Promise<void>) => { finished: Promise<void> };
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, expect, it } from "vitest";
import { AuthProvider, useAuth } from "./auth-context";

afterEach(cleanup);

it("keeps the current screen available behind an expired-session re-auth gate", () => {
  const queryClient = new QueryClient();
  function Probe() {
    const { user, sessionExpired } = useAuth();
    return (
      <p>
        {user?.email}:{String(sessionExpired)}
      </p>
    );
  }
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialUser={{ id: "7", email: "admin@example.com", perms: [], ver: 1 }}>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );

  act(() => window.dispatchEvent(new Event("starter:session-expired")));
  expect(screen.getByText("admin@example.com:true").textContent).toBe("admin@example.com:true");
});

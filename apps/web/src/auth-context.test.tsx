import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth-context";

afterEach(cleanup);

afterEach(() => vi.restoreAllMocks());

it("boots an anonymous tab from the refresh cookie", async () => {
  const payload = btoa(
    JSON.stringify({ sub: "11", email: "restored@example.com", perms: ["user:read:any"], ver: 3 }),
  );
  const token = `header.${payload}.signature`;
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: { accessToken: token } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  function Probe() {
    const { user, booting } = useAuth();
    return <p>{booting ? "booting" : (user?.email ?? "anonymous")}</p>;
  }
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
  expect(screen.getByText("booting")).toBeTruthy();
  expect(await screen.findByText("restored@example.com")).toBeTruthy();
});

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

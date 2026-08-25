import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import type { SessionPayload } from "./LoginPage";
import LoginPage from "./LoginPage";

const loginMock = vi.fn();

vi.mock("./api", () => ({
  login: (...a: unknown[]) => loginMock(...a),
}));

afterEach(() => {
  cleanup();
  loginMock.mockReset();
  vi.unstubAllGlobals();
});

it("logs in and hands the session (with decoded claims) to the host", async () => {
  vi.stubGlobal("location", { ...window.location, assign: () => undefined });
  let received: SessionPayload | undefined;
  function capture(u: SessionPayload) {
    received = u;
  }
  loginMock.mockResolvedValue({
    accessToken: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzMSIsInBlcm1zIjpbInVzZXI6cmVhZDphbnkiXSwidmVyIjoxfQ.sig",
    user: { id: "s1", email: "a@b.c" },
  });

  render(<LoginPage onLoggedIn={capture} />);
  await userEvent.type(screen.getByLabelText("Email"), "a@b.c");
  await userEvent.type(screen.getByLabelText("Password"), "hunter2secret");
  await userEvent.click(screen.getByRole("button", { name: "Log in" }));

  await waitFor(() => {
    expect(received?.user?.email).toBe("a@b.c");
    expect(received?.user?.perms).toContain("user:read:any");
  });
});

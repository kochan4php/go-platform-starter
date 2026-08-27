import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import RegisterPage from "./RegisterPage";
import ResetPage from "./ResetPage";
import { normalizeEmail, passwordStrength, validEmail } from "./auth-ui";

const registerMock = vi.fn();
const validateResetMock = vi.fn();

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return {
    ...actual,
    register: (...args: unknown[]) => registerMock(...args),
    validateReset: (...args: unknown[]) => validateResetMock(...args),
  };
});

afterEach(() => {
  cleanup();
  registerMock.mockReset();
  validateResetMock.mockReset();
  sessionStorage.clear();
  history.replaceState(null, "", "/");
});

it("normalizes email and scores password strength deterministically", () => {
  expect(normalizeEmail("  Person@Example.COM ")).toBe("person@example.com");
  expect(validEmail("person@example.com")).toBe(true);
  expect(validEmail("not-an-email")).toBe(false);
  expect(passwordStrength("LongPassword-42!")).toBe(5);
});

it("requires matching strong passwords and carries the email to login", async () => {
  registerMock.mockResolvedValue({ id: 9, email: "person@example.com" });
  render(<RegisterPage />);

  const submit = screen.getByRole("button", { name: "Create account" });
  expect((submit as HTMLButtonElement).disabled).toBe(true);
  await userEvent.type(screen.getByLabelText("Email"), " Person@Example.COM ");
  await userEvent.type(screen.getByLabelText("Password"), "LongPassword-42!");
  await userEvent.type(screen.getByLabelText("Confirm password"), "LongPassword-42!");
  await userEvent.click(submit);

  await screen.findByRole("heading", { name: "Account created" });
  expect(registerMock).toHaveBeenCalledWith("person@example.com", "LongPassword-42!");
  expect(sessionStorage.getItem("auth:login-email")).toBe("person@example.com");
  expect(screen.getByRole("link", { name: /Continue to login/ }).getAttribute("href")).toBe(
    "/login?email=person%40example.com",
  );
});

it("rejects an invalid reset grant before showing password controls", async () => {
  history.replaceState(null, "", "/reset?token=expired");
  validateResetMock.mockRejectedValue(new Error("invalid token"));
  render(<ResetPage />);

  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "This reset link is not valid" })).not.toBeNull(),
  );
  expect(screen.queryByLabelText("New password")).toBeNull();
  expect(screen.getByRole("link", { name: /Request another link/ }).getAttribute("href")).toBe("/forgot");
});

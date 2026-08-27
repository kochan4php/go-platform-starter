import { expect, test } from "@playwright/test";

// Full-journey smoke through the federated shell against the real mesh:
// login → admin users table → logout (PLAN item 67).
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@example.local";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "";

test.skip(!adminPassword, "E2E_ADMIN_PASSWORD not set");

test("login → admin table → logout", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Password").fill(adminPassword);
  await page.getByRole("button", { name: "Log in" }).click();

  // Host redirects to the federated users page after login.
  await expect(page).toHaveURL(/\/admin\/users/);
  await expect(page.getByRole("heading", { name: /Users \(\d+\)/ })).toBeVisible({ timeout: 15_000 });

  // The refresh cookie must restore the in-memory session on a direct route reload.
  await page.reload();
  await expect(page).toHaveURL(/\/admin\/users/);
  await expect(page.getByRole("heading", { name: /Users \(\d+\)/ })).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });

  // Federated navigation: the register screen is a separate remote bundle.
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Claim your seat." })).toBeVisible({ timeout: 15_000 });
});

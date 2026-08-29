import { expect, test } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@example.local";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "";

test.skip(!adminPassword, "E2E_ADMIN_PASSWORD not set");

test("login → dashboard → roles accordion → users via SPA nav", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Password", { exact: true }).fill(adminPassword);
  await page.getByRole("button", { name: "Log in" }).click();

  await page.waitForURL(/admin\/users/, { timeout: 20000 });
  await expect(page.getByRole("heading", { name: /Users \(\d+\)/ })).toBeVisible({ timeout: 20000 });

  // SPA navigation to roles: accordion first slice pinned open, content visible
  await page.getByRole("link", { name: /Roles & Permissions/ }).click();
  await page.waitForURL(/admin\/roles/);
  await expect(page.getByRole("heading", { name: "Roles & permissions" })).toBeVisible();
  const roleHeading = page.locator("h3").filter({ hasText: /\S/ }).first();
  await expect(roleHeading).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/assigned/).first()).toBeVisible();
});

test("register screen renders and creates an account", async ({ page }) => {
  const email = `smoke-${Date.now()}@example.local`;
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("smoke-password-1");
  await page.getByLabel("Confirm password", { exact: true }).fill("smoke-password-1");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(/Account created/i)).toBeVisible({ timeout: 15000 });
});

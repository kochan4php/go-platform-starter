import { expect, test } from "@playwright/test";

test("roles page shows accordion content after login", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_ADMIN_EMAIL ?? "admin@example.local");
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.E2E_ADMIN_PASSWORD ?? "local-root-access-2026!");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/admin\/users/, { timeout: 15000 });
  // Ensure the dashboard has settled before deep-linking to roles.
  await expect(page.getByRole("heading", { name: /Users \(\d+\)/ })).toBeVisible({ timeout: 15_000 });
  await page.goto("/admin/roles");
  await expect(page.getByRole("heading", { name: "admin" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/\d+ users? assigned/)).toBeVisible();
  await page.getByRole("button", { name: "Matrix" }).click();
  await expect(page.getByRole("columnheader", { name: "Permission" })).toBeVisible();
});

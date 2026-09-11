import AxeBuilder from "@axe-core/playwright";
import { type Page, expect, test } from "@playwright/test";

const auditDir = "tmp/audit-users-roles";

async function expectAccessibleDialog(page: Page) {
  expect((await new AxeBuilder({ page }).include("dialog[open]").analyze()).violations).toEqual([]);
}

test("users and roles complete CRUD lifecycle", async ({ page }) => {
  test.setTimeout(90_000);
  const suffix = Date.now();
  const email = `browser-audit-${suffix}@example.local`;
  const roleName = `browser-audit-${suffix}`;
  const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@example.local";
  const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "local-root-access-2026!";

  await page.addInitScript(() => {
    if (!sessionStorage.getItem("audit-whats-new")) {
      localStorage.removeItem("whats-new:0.6.0");
      sessionStorage.setItem("audit-whats-new", "shown");
    }
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Password", { exact: true }).fill(adminPassword);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/admin\/users/);

  const whatsNew = page.getByRole("dialog", { name: "What changed" });
  await expect(whatsNew).toBeVisible();
  await expect(whatsNew.getByRole("listitem")).toHaveCount(4);
  await expect(whatsNew).toContainText("editor/devcontainer configuration, and automated review gates");
  await page.screenshot({ path: `${auditDir}/04-whats-new-fixed.png`, fullPage: true });
  await expectAccessibleDialog(page);
  await expect
    .poll(() => page.evaluate(() => document.querySelector("dialog[open]")?.contains(document.activeElement)))
    .toBe(true);
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => document.querySelector("dialog[open]")?.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(whatsNew).toBeHidden();

  await page.route(
    "**/api/v1/users?*",
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    },
    { times: 1 },
  );
  await page.reload();
  await expect(page.locator(".ui-skeleton").first()).toBeVisible();
  await page.screenshot({ path: `${auditDir}/05-users-skeleton.png`, fullPage: true });
  await expect(page.getByRole("heading", { name: /Users \(\d+\)/ })).toBeVisible();
  await expect(page.getByTestId("profiles-summary")).not.toContainText(/^0$/);
  await page.screenshot({ path: `${auditDir}/06-users-list-fixed.png`, fullPage: true });

  await page.getByRole("button", { name: "New user" }).click();
  const createUser = page.getByRole("dialog", { name: "Register user" });
  await expect(createUser).toBeVisible();
  await page.screenshot({ path: `${auditDir}/07-register-user-modal.png`, fullPage: true });
  await expectAccessibleDialog(page);
  await createUser.getByLabel("Display name").fill("Browser Audit User");
  await createUser.getByLabel("Email").fill(email);
  await createUser.getByLabel(/Temporary password/).fill("browser-audit-pass-1");
  await createUser.getByRole("checkbox").first().check();
  await createUser.getByRole("button", { name: "Register user", exact: true }).click();
  await expect(createUser).toBeHidden();
  await expect(page.getByText(email).first()).toBeVisible();

  const userRow = page.getByRole("row", { name: new RegExp(email) });
  await userRow.getByRole("button", { name: "Edit" }).click();
  const editUser = page.getByRole("dialog", { name: /Edit user/ });
  await editUser.getByLabel("Display name").fill("Browser Audit Renamed");
  await editUser.getByRole("button", { name: "Save changes" }).click();
  await expect(editUser).toBeHidden();
  await expect(page.getByText("Browser Audit Renamed").first()).toBeVisible();

  await page.route(
    "**/api/v1/rbac/roles*",
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    },
    { times: 1 },
  );
  await page.goto("/admin/roles");
  await expect(page.locator(".ui-skeleton").first()).toBeVisible();
  await page.screenshot({ path: `${auditDir}/08-roles-skeleton.png`, fullPage: true });
  await expect(page.getByRole("heading", { name: "admin" })).toBeVisible();
  await page.screenshot({ path: `${auditDir}/09-roles-list-fixed.png`, fullPage: true });

  await page.getByRole("button", { name: "New role" }).click();
  const createRole = page.getByRole("dialog", { name: "Create role" });
  await expect(createRole).toBeVisible();
  await page.screenshot({ path: `${auditDir}/10-create-role-modal.png`, fullPage: true });
  await expectAccessibleDialog(page);
  await createRole.locator('input[maxlength="60"]').fill(roleName);
  await createRole.getByLabel("Description").fill("Browser audit role");
  await createRole.getByRole("button", { name: "Select all" }).click();
  await createRole.getByRole("button", { name: "Create role", exact: true }).click();
  await expect(createRole).toBeHidden();

  const roleRail = page.getByRole("button", { name: new RegExp(roleName) });
  await expect(roleRail).toBeVisible();
  await roleRail.click();
  const rolePanel = page.locator("section").filter({ has: page.getByRole("heading", { name: roleName }) });
  await rolePanel.getByRole("button", { name: "Edit" }).click();
  const editRole = page.getByRole("dialog", { name: `Edit role: ${roleName}` });
  await editRole.getByLabel("Description").fill("Browser audit role updated");
  await editRole.getByRole("button", { name: "Save changes" }).click();
  await expect(editRole).toBeHidden();
  await expect(rolePanel).toContainText("Browser audit role updated");

  await rolePanel.getByRole("button", { name: "Users", exact: true }).click();
  const roleUsers = page.getByRole("dialog", { name: `Users in ${roleName}` });
  await roleUsers.getByLabel("Find user").fill(email);
  const roleUser = roleUsers.getByText(email).locator("../..");
  await roleUser.getByRole("button", { name: "Assign" }).click();
  await expect(roleUser.getByRole("button", { name: "Remove" })).toBeVisible();
  await roleUsers.getByRole("button", { name: "Done" }).click();

  await page.goto("/admin/users");
  await expect(page.getByRole("row", { name: new RegExp(`${email}.*${roleName}`) })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept(email));
  await page
    .getByRole("row", { name: new RegExp(email) })
    .getByRole("button", { name: /Delete/ })
    .click();
  const confirmDeleteUser = page.getByRole("dialog", { name: "Delete Browser Audit Renamed?" });
  await confirmDeleteUser.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText(email).first()).toBeHidden({ timeout: 10_000 });
  await page.waitForTimeout(5_500);

  await page.goto("/admin/roles");
  const updatedRoleRail = page.getByRole("button", { name: new RegExp(roleName) });
  await updatedRoleRail.click();
  const updatedRolePanel = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: roleName }) });
  await updatedRolePanel.getByRole("button", { name: /Delete/ }).click();
  const deleteRole = page.getByRole("dialog", { name: `Delete ${roleName}` });
  await deleteRole.getByLabel(`Type ${roleName}`).fill(roleName);
  await deleteRole.getByRole("button", { name: "Delete role" }).click();
  await expect(deleteRole).toBeHidden();
  await expect(page.getByText(roleName)).toHaveCount(0);
});

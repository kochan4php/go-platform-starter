import AxeBuilder from "@axe-core/playwright";
import { type Page, expect, test } from "@playwright/test";

const gateway = process.env.E2E_GATEWAY_URL ?? "http://127.0.0.1:8000";
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@example.local";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "";

async function login(page: Page, email = adminEmail, password = adminPassword) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/admin\//, { timeout: 15_000 });
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

test("public pages pass automated accessibility checks", async ({ page }) => {
  for (const path of ["/login", "/register", "/forgot", "/reset", "/missing"]) {
    await page.goto(path);
    await expectNoAxeViolations(page);
  }
});

test("failed login exposes an accessible error and lockout stays uniform", async ({ page, request }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`missing-${Date.now()}@example.local`);
  await page.getByLabel("Password", { exact: true }).fill("definitely-wrong");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("alert").first()).toBeVisible();

  const email = `locked-${Date.now()}@example.local`;
  const password = "Lockout-password-123";
  expect(
    (await request.post(`${gateway}/api/v1/auth/register`, { data: { email, password } })).status(),
  ).toBe(201);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await request.post(`${gateway}/api/v1/auth/login`, {
      data: { email, password: "wrong-password-123" },
    });
    expect(response.status()).toBe(401);
  }
  const locked = await request.post(`${gateway}/api/v1/auth/login`, { data: { email, password } });
  expect(locked.status()).toBe(401);
  expect((await locked.json()).message).toBe("invalid_credentials");
});

test("protected admin routes redirect anonymous users to login", async ({ page }) => {
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/admin/roles");
  await expect(page).toHaveURL(/\/login$/);
});

test("concurrent tab refreshes share a valid rotation", async ({ browser }) => {
  test.skip(!adminPassword, "E2E_ADMIN_PASSWORD not set");
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page);
  await expect(page).toHaveURL(/admin\/users/);
  const refresh = (await context.cookies()).find((cookie) => cookie.name === "refresh_token");
  expect(refresh).toBeDefined();
  const deviceID = await page.evaluate(() => localStorage.getItem("starter:device-id"));
  expect(deviceID).toBeTruthy();
  const options = {
    method: "POST",
    headers: { Cookie: `refresh_token=${refresh?.value}`, "X-Device-ID": deviceID ?? "" },
  };
  const responses = await Promise.all([
    fetch(`${gateway}/api/v1/auth/refresh`, options),
    fetch(`${gateway}/api/v1/auth/refresh`, options),
  ]);
  expect(responses.map((response) => response.status)).toEqual([200, 200]);
  await context.close();
});

test("an expired session can be dismissed back to login", async ({ page, context }) => {
  test.skip(!adminPassword, "E2E_ADMIN_PASSWORD not set");
  await login(page);
  await expect(page).toHaveURL(/admin\/users/);
  await context.clearCookies();
  await page.reload();
  await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
});

test("roles without permission land on the 403 UI", async ({ page, request }) => {
  const email = `plain-${Date.now()}@example.local`;
  const password = "Plain-user-password-123";
  expect(
    (await request.post(`${gateway}/api/v1/auth/register`, { data: { email, password } })).status(),
  ).toBe(201);
  await login(page, email, password);
  await page.goto("/admin/roles");
  await expect(page).toHaveURL(/admin\/403/);
  await expect(page.getByText(/access denied|permission/i).first()).toBeVisible();
});

test("duplicate role validation stays inline and logout works from roles", async ({ page }) => {
  test.skip(!adminPassword, "E2E_ADMIN_PASSWORD not set");
  await login(page);
  await page.getByRole("link", { name: /Roles & Permissions/ }).click();
  await page.getByRole("button", { name: "New role" }).click();
  const dialog = page.getByRole("dialog", { name: "Create role" });
  await dialog.getByRole("textbox", { name: /^Name/ }).fill("admin");
  await expect(dialog.getByText(/reserved/i)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Create role" })).toBeDisabled();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await page
    .getByRole("dialog", { name: "Discard unsaved changes?" })
    .getByRole("button", { name: "Discard" })
    .click();
  await expect(dialog).toBeHidden();
  const session = page.locator("details").filter({ hasText: adminEmail });
  await session.locator("summary").click();
  await session.getByRole("button", { name: "Log out" }).click();
  await page.getByRole("dialog", { name: "Log out?" }).getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("directory pagination, keyboard navigation, visual baseline, and a11y", async ({ page }) => {
  test.skip(!adminPassword, "E2E_ADMIN_PASSWORD not set");
  await login(page);
  await expect(page.getByRole("heading", { name: /Users \(\d+\)/ })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
  await expect(page).toHaveScreenshot("users-directory.png", { fullPage: true });

  await expectNoAxeViolations(page);

  const next = page.getByRole("button", { name: "Next" });
  if (await next.isEnabled()) {
    await next.click();
    await page.getByRole("button", { name: "Previous" }).click();
  }

  for (const path of ["/admin/roles", "/admin/settings", "/admin/403"]) {
    await page.goto(path);
    await expectNoAxeViolations(page);
  }
});

test("mobile register and roles accordion remain operable @mobile", async ({ page }) => {
  const email = `mobile-${Date.now()}@example.local`;
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Mobile-password-123");
  await page.getByLabel("Confirm password", { exact: true }).fill("Mobile-password-123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(/Account created/i)).toBeVisible();

  test.skip(!adminPassword, "E2E_ADMIN_PASSWORD not set");
  await login(page);
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page).toHaveScreenshot("mobile-drawer-open.png", { fullPage: true });
  await page.getByRole("button", { name: "Close navigation" }).last().click();
  await expect(page).toHaveScreenshot("mobile-drawer-closed.png", { fullPage: true });
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("link", { name: /Roles & Permissions/ }).click();
  const accordion = page.locator("button[aria-expanded]").first();
  await accordion.tap();
  await expect(accordion).toBeVisible();
  await expect(page).toHaveScreenshot("roles-mobile-drawer.png", { fullPage: true });
});

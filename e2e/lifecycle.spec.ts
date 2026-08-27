import { expect, test } from "@playwright/test";

test("full admin user lifecycle", async ({ page }) => {
  const email = `lifecycle-${Date.now()}@example.local`;

  // 1. register with the FULL form: avatar, display name, email, password, role
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.local");
  await page.getByLabel("Password").fill("admin-bootstrap-pw");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/admin\/users/, { timeout: 20000 });

  await page.getByRole("button", { name: "New user" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("Display name").fill("Lifecycle Tester");
  await dialog.getByLabel("Email").fill(email);
  await dialog.getByLabel("Avatar URL (optional)").fill("https://picsum.photos/seed/lifecycle/200");
  await expect(dialog.getByRole("img", { name: "Avatar preview" })).toBeVisible();
  await dialog.getByLabel(/Temporary password/).fill("lifecycle-pass-1");
  await dialog.getByRole("checkbox").first().check();
  await dialog.getByRole("button", { name: "Register", exact: true }).click();

  // modal closes, list refreshes with the new profile
  await expect(dialog).toBeHidden({ timeout: 15000 });
  await expect(page.getByText(email).first()).toBeVisible({ timeout: 15000 });

  // 2. edit: full form (avatar preview, display name, email, password) — NO ID field
  await page
    .getByRole("row", { name: new RegExp(email) })
    .getByRole("button", { name: "Edit" })
    .click();
  const edit = page.getByRole("dialog");
  await expect(edit).toBeVisible();
  await expect(edit.getByText("Avatar URL")).toBeVisible();
  await expect(edit.getByText("Display name")).toBeVisible();
  await expect(edit.getByText("Email", { exact: true })).toBeVisible();
  await expect(edit.getByText(/New password/)).toBeVisible();
  await expect(edit.getByText(/^ID$/)).toHaveCount(0);

  await edit.getByLabel("Display name").fill("Lifecycle Renamed");
  await edit.getByLabel(/New password/).fill("renovated-pass-9");
  await edit.getByRole("button", { name: "Save" }).click();
  await expect(edit).toBeHidden({ timeout: 15000 });

  // 3. old password must now be rejected by login
  await page.request
    .post("http://127.0.0.1:8010/api/v1/auth/login", {
      data: { email, password: "lifecycle-pass-1" },
    })
    .then((r) => expect(r.status()).toBe(401));
  await page.request
    .post("http://127.0.0.1:8010/api/v1/auth/login", {
      data: { email, password: "renovated-pass-9" },
    })
    .then((r) => expect(r.status()).toBe(200));
});

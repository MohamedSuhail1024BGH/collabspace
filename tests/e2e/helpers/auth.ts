import { Page, expect } from "@playwright/test";

export async function loginAs(
  page: Page,
  email = "ava@acme.com",
  password = "password123"
) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.getByPlaceholder("name@company.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).not.toHaveURL(/\/login/);

  // If landed on /start, launch into workspace to reach dashboard
  if (page.url().includes("/start")) {
    const launchBtn = page.getByRole("button", { name: "Launch Workspace" }).first();
    if (await launchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await launchBtn.click();
      await expect(page).toHaveURL("/");
    }
  }
}

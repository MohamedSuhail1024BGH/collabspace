import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Multi-Tenant Workspaces", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("should display default Acme Corporation workspace and switch to Starlight Studios", async ({ page }) => {
    await page.goto("/");

    // Verify page loads with Acme Corporation
    await expect(page.getByRole("heading", { name: "Ship more, together." })).toBeVisible();
    await expect(page.getByText("Acme Corporation").first()).toBeVisible();

    // Open Workspace Switcher dropdown using test ID
    const switcher = page.getByTestId("workspace-switcher-trigger");
    await switcher.click();

    // Verify dropdown shows Starlight Studios option
    const starlightOption = page.getByTestId("workspace-option-starlight");
    await expect(starlightOption).toBeVisible();

    // Switch to Starlight Studios
    await starlightOption.click();

    // Assert workspace switcher updates
    await expect(page.getByText("Starlight Studios").first()).toBeVisible();
    await expect(page.getByText("Enterprise").first()).toBeVisible();

    // Navigate to /projects and verify Starlight Studios' projects are displayed
    await page.goto("/projects");
    await expect(page.getByText("Mobile App Launch").first()).toBeVisible();
    await expect(page.getByText("Design System v2").first()).toBeVisible();

    // Switch back to Acme Corporation
    await switcher.click();
    await page.getByTestId("workspace-option-acme").click();

    // Verify Acme projects return
    await expect(page.getByText("Brand refresh").first()).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Settings Panel", () => {
  test("navigates to settings and manages workspace, account, and UI preferences", async ({ page }) => {
    await loginAs(page);

    // Navigate to Settings via sidebar
    const settingsLink = page.getByRole("link", { name: "Settings" });
    await expect(settingsLink).toBeVisible();
    await settingsLink.click();

    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole("heading", { name: "Settings & Preferences" })).toBeVisible();

    // 1. Workspace Tab
    await expect(page.getByTestId("settings-workspace-tab")).toBeVisible();
    await expect(page.getByTestId("workspace-name-input")).toBeVisible();
    await expect(page.getByTestId("workspace-plan-select")).toBeVisible();

    // Update workspace name
    await page.getByTestId("workspace-name-input").fill("Acme Global");
    await page.getByTestId("save-workspace-button").click();
    await expect(page.getByTestId("settings-feedback-banner")).toContainText("Workspace settings updated successfully");

    // Restore workspace name to keep test environment clean
    await page.getByTestId("workspace-name-input").fill("Acme Corporation");
    await page.getByTestId("save-workspace-button").click();
    await expect(page.getByTestId("settings-feedback-banner")).toContainText("Workspace settings updated successfully");

    // 2. Account Tab
    await page.getByTestId("settings-account-tab").click();
    await expect(page.getByTestId("user-name-input")).toBeVisible();
    await expect(page.getByTestId("settings-delete-account-button")).toBeVisible();

    // Update profile
    await page.getByTestId("user-name-input").fill("Ava Sterling");
    await page.getByTestId("save-profile-button").click();
    await expect(page.getByTestId("settings-feedback-banner")).toContainText("Account profile updated successfully");

    // Restore profile name
    await page.getByTestId("user-name-input").fill("Ava Thompson");
    await page.getByTestId("save-profile-button").click();
    await expect(page.getByTestId("settings-feedback-banner")).toContainText("Account profile updated successfully");

    // 3. UI & Preferences Tab
    await page.getByTestId("settings-ui-tab").click();
    await expect(page.getByText("Appearance & Theme")).toBeVisible();
    await expect(page.getByText("Notification Preferences")).toBeVisible();

    // Click another accent color (e.g. Cyan)
    await page.getByRole("button", { name: "Cyan" }).click();
    await expect(page.getByTestId("settings-feedback-banner")).toContainText("switched to Cyan");

    // Click density button (e.g. Compact)
    await page.getByRole("button", { name: "Compact" }).click();
    await expect(page.getByTestId("settings-feedback-banner")).toContainText("Layout density set to Compact");
  });
});


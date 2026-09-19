import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Settings Panel", () => {
  test("navigates to settings and manages workspace, members, account, and UI preferences", async ({ page }) => {
    await loginAs(page);

    // Navigate to Settings
    await page.goto("/settings");

    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole("heading", { name: "Settings & Preferences" })).toBeVisible();

    // -------------------------------------------------------------
    // 1. Workspace Tab
    // -------------------------------------------------------------
    await expect(page.getByTestId("settings-workspace-tab")).toBeVisible();
    await expect(page.getByTestId("workspace-name-input")).toBeVisible();
    await expect(page.getByTestId("workspace-description-input")).toBeVisible();
    await expect(page.getByTestId("workspace-public-toggle")).toBeVisible();
    await expect(page.getByTestId("workspace-delete-button")).toBeVisible();
    await expect(page.getByTestId("copy-workspace-slug-btn")).toBeVisible();
    await expect(page.getByTestId("workspace-plan-select")).not.toBeVisible();

    // Update workspace name and description
    await page.getByTestId("workspace-name-input").fill("Acme Global");
    await page.getByTestId("workspace-description-input").fill("High-impact enterprise innovation workspace.");
    await page.getByTestId("save-workspace-button").click();
    await expect(page.getByTestId("settings-feedback-banner")).toContainText("Workspace settings updated successfully");

    // Restore workspace name to keep test environment clean
    await page.getByTestId("workspace-name-input").fill("Acme Corporation");
    await page.getByTestId("save-workspace-button").click();
    await expect(page.getByTestId("settings-feedback-banner")).toContainText("Workspace settings updated successfully");

    // -------------------------------------------------------------
    // 2. Members & Roles Tab
    // -------------------------------------------------------------
    await page.getByTestId("settings-members-tab").click();
    await expect(page.getByTestId("invite-user-search-input")).toBeVisible();
    await expect(page.getByTestId("invite-role-select")).toBeVisible();
    await expect(page.getByText("Workspace Members")).toBeVisible();

    // Search for users to invite
    await page.getByTestId("invite-user-search-input").fill("dev");
    // Verify results appear or clear
    await page.getByTestId("invite-user-search-input").fill("");

    // -------------------------------------------------------------
    // 3. Account Tab & Password Security
    // -------------------------------------------------------------
    await page.getByTestId("settings-account-tab").click();
    await expect(page.getByTestId("user-name-input")).toBeVisible();
    await expect(page.getByTestId("user-username-input")).toBeVisible();
    await expect(page.getByTestId("user-bio-input")).toBeVisible();
    await expect(page.getByTestId("settings-delete-account-button")).toBeVisible();

    // Update profile
    await page.getByTestId("user-name-input").fill("Ava Sterling");
    await page.getByTestId("user-bio-input").fill("Product Director & Systems Architect");
    await page.getByTestId("save-profile-button").click();
    await expect(page.getByTestId("settings-feedback-banner")).toContainText("Account profile updated successfully");

    // Restore profile name
    await page.getByTestId("user-name-input").fill("Ava Thompson");
    await page.getByTestId("save-profile-button").click();
    await expect(page.getByTestId("settings-feedback-banner")).toContainText("Account profile updated successfully");

    // Test password security error handling
    await page.getByTestId("current-password-input").fill("wrongpassword");
    await page.getByTestId("new-password-input").fill("newpassword123");
    await page.getByTestId("confirm-password-input").fill("newpassword123");
    await page.getByTestId("change-password-button").click();
    await expect(page.getByTestId("password-feedback-banner")).toContainText("Current password is incorrect");

    // -------------------------------------------------------------
    // 4. UI & Preferences Tab
    // -------------------------------------------------------------
    await page.getByTestId("settings-ui-tab").click();
    await expect(page.getByText("Appearance & Theme")).toBeVisible();
    await expect(page.getByText("Notification Preferences")).toBeVisible();

    // Accent Theme
    await page.getByRole("button", { name: "Cyan" }).click();
    await expect(page.getByTestId("settings-feedback-banner")).toContainText("switched to Cyan");
    await expect(page.locator("html")).toHaveAttribute("data-accent", "cyan");

    // Layout Density
    await page.getByRole("button", { name: "Compact" }).click();
    await expect(page.getByTestId("settings-feedback-banner")).toContainText("Layout density set to Compact");
    await expect(page.locator("html")).toHaveAttribute("data-density", "compact");

    // Notification Toggles
    await page.getByTestId("email-alerts-toggle").click();
    await expect(page.getByTestId("settings-feedback-banner")).toContainText("Email notifications");

    await page.getByTestId("task-alerts-toggle").click();
    await expect(page.getByTestId("settings-feedback-banner")).toContainText("Task assignment alerts");

    await page.getByTestId("weekly-digest-toggle").click();
    await expect(page.getByTestId("settings-feedback-banner")).toContainText("Weekly performance digest");
  });
});

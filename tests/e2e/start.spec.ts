import { test, expect } from "@playwright/test";
import { dismissStatusNotice } from "./helpers/auth";

test.describe("Start Launchpad & Discovery", () => {
  test("should allow owner to view workspaces, search public workspaces, and discover users", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await dismissStatusNotice(page);

    // Login as useranon1 (Owner)
    await page.getByPlaceholder("name@company.com").fill("useranon1@cspace.com");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Verify redirected to /start
    await expect(page).toHaveURL(/\/start/);
    await expect(page.getByText("Welcome to CollabSpace")).toBeVisible();
    await expect(page.getByText("@useranon1").first()).toBeVisible();

    // Verify My Workspaces tab shows CollabSpace
    await expect(page.getByTestId("tab-my-workspaces")).toBeVisible();
    await expect(page.getByText("CollabSpace").first()).toBeVisible();

    // Test Search Workspaces tab
    await page.getByTestId("tab-discover-workspaces").click();
    await expect(page.getByTestId("search-workspaces-input")).toBeVisible();
    await page.getByTestId("search-workspaces-input").fill("Acme");
    await expect(page.getByText("Acme Corporation").first()).toBeVisible();

    // Test Discover Users (@User Directory) tab
    await page.getByTestId("tab-discover-users").click();
    await expect(page.getByTestId("search-users-input")).toBeVisible();

    // Search by handle
    await page.getByTestId("search-users-input").fill("useradm1");
    await expect(page.getByText("@useradm1")).toBeVisible();
    await expect(page.getByText("USER_ADMIN1")).toBeVisible();

    // Search by member name
    await page.getByTestId("search-users-input").fill("USER_MEMBER");
    await expect(page.getByText("@usermem1")).toBeVisible();
    await expect(page.getByText("@usermem2")).toBeVisible();

    // Switch back to My Workspaces and launch CollabSpace
    await page.getByTestId("tab-my-workspaces").click();
    const launchBtn = page.getByRole("button", { name: "Launch Workspace" }).first();
    await launchBtn.click();

    // Verify dashboard reached
    await expect(page).toHaveURL("/");

    // Navigate to Settings -> Members & Roles to verify owner guidance over team members
    await page.goto("/settings");
    await expect(page.getByTestId("settings-members-tab")).toBeVisible();
    await page.getByTestId("settings-members-tab").click();

    // Verify owner sees team members with roles
    await expect(page.getByText(/Workspace Members/)).toBeVisible();
    await expect(page.getByText("@useradm1").first()).toBeVisible();
    await expect(page.getByText("@usermem1").first()).toBeVisible();
    await expect(page.getByText("@userview1").first()).toBeVisible();
  });
});

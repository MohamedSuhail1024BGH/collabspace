import { test, expect, devices } from "@playwright/test";
import { dismissStatusNotice } from "./helpers/auth";

test.use({
  ...devices["Pixel 7"],
});

test.describe("Sidebar Mobile Drawer & Workspace Switcher", () => {
  test("expandable workspace switcher bar at bottom of sidebar is unobscured by navigation bar", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await dismissStatusNotice(page);

    // Login as useranon1 (Owner)
    await page.getByPlaceholder("name@company.com").fill("useranon1@cspace.com");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Wait for redirect after login
    await page.waitForURL(/\/start|\/$/);
    if (page.url().includes("/start")) {
      const launchBtn = page.getByRole("button", { name: "Launch Workspace" }).first();
      await launchBtn.click();
      await page.waitForURL(/\/$/);
    }
    await expect(page).toHaveURL(/\/$/);

    // Open mobile sidebar drawer using "More" button in MobileBottomNav
    const moreBtn = page.getByRole("button", { name: "Open navigation menu" });
    await expect(moreBtn).toBeVisible();
    await moreBtn.click();

    // Verify sidebar drawer is open
    const sidebar = page.getByTestId("primary-sidebar").last();
    await expect(sidebar).toBeVisible();

    // Verify Workspace Switcher trigger is visible
    const switcherTrigger = page.getByTestId("workspace-switcher-trigger").last();
    await expect(switcherTrigger).toBeVisible();

    // Verify MobileBottomNav is hidden / pointer-events-none when drawer is open
    const bottomNav = page.getByTestId("mobile-bottom-nav");
    await expect(bottomNav).toHaveClass(/opacity-0/);
    await expect(bottomNav).toHaveClass(/pointer-events-none/);

    // Verify trigger bounding box is accessible and above the bottom edge
    const triggerBox = await switcherTrigger.boundingBox();
    const viewportSize = page.viewportSize();
    expect(triggerBox).not.toBeNull();
    if (triggerBox && viewportSize) {
      expect(triggerBox.y + triggerBox.height).toBeLessThanOrEqual(viewportSize.height);
      console.log("Trigger bottom Y:", triggerBox.y + triggerBox.height, "Viewport height:", viewportSize.height);
    }

    // Take screenshot of open drawer showing unobscured bottom workspace bar
    const screenshotDrawerPath = "/home/msuhail1024b/.gemini/antigravity/brain/409207c5-aee5-4b97-a312-fb095b27a59f/scratch/mobile_sidebar_unobscured.png";
    await page.screenshot({ path: screenshotDrawerPath });
    console.log("Drawer screenshot saved to:", screenshotDrawerPath);

    // Click Workspace Switcher trigger to expand options
    await switcherTrigger.click();

    // Verify upward options menu is visible
    await expect(page.getByText(/Workspaces \(/)).toBeVisible();
    await expect(page.getByText("Start Hub & Discovery")).toBeVisible();
    await expect(page.getByText("Create new workspace")).toBeVisible();
    await expect(page.getByTestId("sidebar-settings-button")).toBeVisible();

    // Take screenshot of expanded workspace switcher menu
    const screenshotExpandedPath = "/home/msuhail1024b/.gemini/antigravity/brain/409207c5-aee5-4b97-a312-fb095b27a59f/scratch/mobile_sidebar_expanded.png";
    await page.screenshot({ path: screenshotExpandedPath });
    console.log("Expanded menu screenshot saved to:", screenshotExpandedPath);
  });
});

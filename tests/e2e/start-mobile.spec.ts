import { test, expect, devices } from "@playwright/test";

test.use({
  ...devices["Pixel 7"],
});

test.describe("Start Launchpad Mobile View", () => {
  test("should render tabs in a single horizontal scrollable row with zero document overflow", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");

    // Login as useranon1 (Owner)
    await page.getByPlaceholder("name@company.com").fill("useranon1@cspace.com");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Verify redirected to /start
    await expect(page).toHaveURL(/\/start/);
    await expect(page.getByText("Welcome to CollabSpace")).toBeVisible();

    // Verify zero horizontal document overflow
    const overflowDiff = await page.evaluate(() => {
      return document.documentElement.scrollWidth - document.documentElement.clientWidth;
    });
    expect(overflowDiff).toBe(0);

    // Verify all 3 tabs are aligned on the exact same horizontal baseline (row)
    const tab1Box = await page.getByTestId("tab-my-workspaces").boundingBox();
    const tab2Box = await page.getByTestId("tab-discover-workspaces").boundingBox();
    const tab3Box = await page.getByTestId("tab-discover-users").boundingBox();

    expect(tab1Box).not.toBeNull();
    expect(tab2Box).not.toBeNull();
    expect(tab3Box).not.toBeNull();

    if (tab1Box && tab2Box && tab3Box) {
      // Y positions must be virtually identical (within 2px)
      expect(Math.abs(tab1Box.y - tab2Box.y)).toBeLessThanOrEqual(2);
      expect(Math.abs(tab1Box.y - tab3Box.y)).toBeLessThanOrEqual(2);
    }

    // Verify horizontal scrolling capability of tab container
    const isScrollable = await page.evaluate(() => {
      const tab1 = document.querySelector('[data-testid="tab-my-workspaces"]');
      const container = tab1?.parentElement;
      if (!container) return false;
      return container.scrollWidth > container.clientWidth;
    });
    expect(isScrollable).toBe(true);

    // Screenshot 1: Tab 1 (My Workspaces)
    await page.screenshot({
      path: "/home/msuhail1024b/.gemini/antigravity/brain/409207c5-aee5-4b97-a312-fb095b27a59f/scratch/mobile_start_tab1.png",
      fullPage: true,
    });

    // Test clicking Search Workspaces tab
    await page.getByTestId("tab-discover-workspaces").click();
    await expect(page.getByTestId("search-workspaces-input")).toBeVisible();
    await page.screenshot({
      path: "/home/msuhail1024b/.gemini/antigravity/brain/409207c5-aee5-4b97-a312-fb095b27a59f/scratch/mobile_start_tab2.png",
      fullPage: true,
    });

    // Test clicking Find People tab
    await page.getByTestId("tab-discover-users").click();
    await expect(page.getByTestId("search-users-input")).toBeVisible();
    await page.screenshot({
      path: "/home/msuhail1024b/.gemini/antigravity/brain/409207c5-aee5-4b97-a312-fb095b27a59f/scratch/mobile_start_tab3.png",
      fullPage: true,
    });

    // Test Create Workspace Modal
    await page.getByTestId("start-create-workspace-btn").click();
    await expect(page.getByTestId("create-workspace-modal")).toBeVisible();
    await page.screenshot({
      path: "/home/msuhail1024b/.gemini/antigravity/brain/409207c5-aee5-4b97-a312-fb095b27a59f/scratch/mobile_start_modal.png",
      fullPage: true,
    });
  });
});


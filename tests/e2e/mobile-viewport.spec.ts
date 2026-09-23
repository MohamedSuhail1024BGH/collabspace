import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Mobile Viewport & Safe-Area Handling (375x812)", () => {
  test.use({
    viewport: { width: 375, height: 812 },
  });

  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("drawer footer is fully visible and not clipped under bottom viewport edge", async ({
    page,
  }) => {
    // Open the mobile navigation drawer
    const menuButton = page.getByRole("button", { name: "Open mobile menu" });
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    // Verify sidebar drawer container is displayed
    const mobileDrawer = page.getByTestId("mobile-drawer");
    await expect(mobileDrawer).toBeVisible();

    const sidebar = mobileDrawer.getByTestId("primary-sidebar");
    await expect(sidebar).toBeVisible();

    // Verify footer container exists and is visible within the mobile drawer
    const footer = mobileDrawer.getByTestId("sidebar-footer");
    await expect(footer).toBeVisible();

    // Assert the footer is fully within the 812px viewport height (not clipped offscreen)
    const footerBox = await footer.boundingBox();
    expect(footerBox).not.toBeNull();
    expect(footerBox!.y).toBeGreaterThanOrEqual(0);
    expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(812);

    // Verify workspace switcher trigger button inside footer is visible and clickable
    const switcherTrigger = mobileDrawer.getByTestId("workspace-switcher-trigger");
    await expect(switcherTrigger).toBeVisible();
    const triggerBox = await switcherTrigger.boundingBox();
    expect(triggerBox).not.toBeNull();
    expect(triggerBox!.y + triggerBox!.height).toBeLessThanOrEqual(812);

    // Assert safe-area padding is applied on the footer
    const paddingBottom = await footer.evaluate((el) => {
      return window.getComputedStyle(el).paddingBottom;
    });
    // Padding bottom must be at least 10px (0.625rem = 10px) plus any env(safe-area-inset-bottom)
    const pbPixels = parseFloat(paddingBottom);
    expect(pbPixels).toBeGreaterThanOrEqual(10);
  });

  test("calendar month grid view fits within 375px viewport with zero horizontal overflow", async ({
    page,
  }) => {
    await page.goto("/calendar");

    // Ensure we are in Month View
    const monthBtn = page.getByTestId("calendar-view-month-btn");
    await expect(monthBtn).toBeVisible();
    await monthBtn.click();

    // Verify calendar grid is rendered
    const calendarGrid = page.getByTestId("calendar-grid-view");
    await expect(calendarGrid).toBeVisible();

    // Evaluate horizontal scroll width of the document and calendar container
    const overflowMetrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const calendarEl = document.querySelector('[data-testid="calendar-grid-view"]');

      return {
        docScrollWidth: doc.scrollWidth,
        docClientWidth: doc.clientWidth,
        bodyScrollWidth: body.scrollWidth,
        windowInnerWidth: window.innerWidth,
        calendarScrollWidth: calendarEl ? calendarEl.scrollWidth : 0,
        calendarClientWidth: calendarEl ? calendarEl.clientWidth : 0,
      };
    });

    // Assert that the page does not overflow horizontally
    expect(overflowMetrics.docScrollWidth).toBeLessThanOrEqual(overflowMetrics.windowInnerWidth);
    expect(overflowMetrics.docScrollWidth).toBeLessThanOrEqual(375);
    expect(overflowMetrics.bodyScrollWidth).toBeLessThanOrEqual(375);
    expect(overflowMetrics.calendarScrollWidth).toBeLessThanOrEqual(
      overflowMetrics.calendarClientWidth + 1 // allow 1px subpixel rounding tolerance
    );

    // Verify single-letter weekday labels are rendered on mobile (< sm) inside the grid
    const monLabel = calendarGrid.getByText("M", { exact: true });
    await expect(monLabel).toBeVisible();
    const wedLabel = calendarGrid.getByText("W", { exact: true });
    await expect(wedLabel).toBeVisible();
  });
});

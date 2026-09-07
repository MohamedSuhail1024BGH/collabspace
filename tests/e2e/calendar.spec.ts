import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Calendar & Events", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("should render calendar month view and create an event", async ({ page }) => {
    await page.goto("/calendar");

    // Verify calendar page heading
    await expect(page.getByRole("heading", { name: "Calendar" }).first()).toBeVisible();

    // Verify toolbar controls
    await expect(page.getByRole("button", { name: "Today" })).toBeVisible();

    // Open Add Event form
    await page.getByRole("button", { name: "Add event" }).click();

    // Fill form
    const eventTitle = `Sprint Kickoff ${Date.now()}`;
    const todayStr = new Date().toISOString().slice(0, 10);

    const titleInput = page.locator("form input").first();
    await titleInput.fill(eventTitle);

    const dateInput = page.locator('form input[type="date"]');
    await dateInput.fill(todayStr);

    const timeInput = page.locator('form input[type="time"]').first();
    await timeInput.fill("10:00");

    // Click Create
    await page.getByRole("button", { name: "Create" }).click();

    // Assert the event details appear
    await expect(page.getByText(eventTitle).first()).toBeVisible();
  });
});

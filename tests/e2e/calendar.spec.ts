import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Calendar & Events", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("should render calendar, switch views, create event with modal, edit event details, and safely delete event", async ({
    page,
  }) => {
    await page.goto("/calendar");

    // Verify calendar page heading
    await expect(page.getByRole("heading", { name: "Calendar" }).first()).toBeVisible();

    // Verify summary metrics banner
    await expect(page.getByTestId("calendar-metrics-banner")).toBeVisible();
    await expect(page.getByText("Events scheduled today")).toBeVisible();

    // Verify toolbar controls
    await expect(page.getByRole("button", { name: "Today" })).toBeVisible();

    // Verify view switching: Week, Agenda, Month
    const weekBtn = page.getByTestId("calendar-view-week-btn");
    const agendaBtn = page.getByTestId("calendar-view-agenda-btn");
    const monthBtn = page.getByTestId("calendar-view-month-btn");

    await expect(weekBtn).toBeVisible();
    await weekBtn.click();
    await expect(page.getByTestId("calendar-week-view")).toBeVisible();

    await expect(agendaBtn).toBeVisible();
    await agendaBtn.click();
    await expect(page.getByTestId("calendar-agenda-view")).toBeVisible();

    await expect(monthBtn).toBeVisible();
    await monthBtn.click();
    await expect(page.getByTestId("calendar-grid-view")).toBeVisible();

    // Open Add Event modal
    await page.getByTestId("calendar-add-event-btn").click();
    await expect(page.getByRole("heading", { name: "Schedule an event" })).toBeVisible();

    // Fill event form
    const eventTitle = `Sprint Planning ${Date.now()}`;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    await page.getByPlaceholder("Event title...").fill(eventTitle);
    await page.locator('input[type="date"]').fill(todayStr);
    await page.locator('input[type="time"]').first().fill("10:00");
    await page.locator('input[type="time"]').nth(1).fill("11:30");
    await page.getByPlaceholder("Notes, agenda, or video call links...").fill("Bi-weekly sprint sync notes.");

    // Submit form
    await page.getByRole("button", { name: /Create event/i }).click();

    // Assert the created event appears in the details panel
    await expect(page.getByText(eventTitle).first()).toBeVisible();

    // Edit event
    const editButton = page.getByTestId("event-edit-btn");
    await expect(editButton).toBeVisible();
    await editButton.click();

    await expect(page.getByRole("heading", { name: "Update event details" })).toBeVisible();
    const updatedTitle = `${eventTitle} - Updated`;
    await page.getByPlaceholder("Event title...").fill(updatedTitle);
    await page.getByRole("button", { name: /Save changes/i }).click();

    // Assert updated title is displayed
    await expect(page.getByText(updatedTitle).first()).toBeVisible();

    // Delete event
    const deleteButton = page.getByTestId("event-delete-btn");
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Assert confirmation modal opens
    const confirmModal = page.getByTestId("confirm-delete-event-modal");
    await expect(confirmModal).toBeVisible();
    await page.getByTestId("confirm-delete-event-btn").click();

    // Assert event is deleted
    await expect(page.getByText(updatedTitle)).not.toBeVisible();
  });
});

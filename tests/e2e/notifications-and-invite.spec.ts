import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Notifications and Member Invitation System", () => {
  test("shows notification bell, unread badge, and interactive popover in dashboard header", async ({ page }) => {
    await loginAs(page, "ava@acme.com", "password123");
    await page.goto("/");

    // Verify Notification bell is rendered in Header
    const bellBtn = page.getByTestId("notification-bell-btn");
    await expect(bellBtn).toBeVisible();

    // Verify unread badge is rendered with initial seeded notifications
    const badge = page.getByTestId("notification-badge");
    await expect(badge).toBeVisible();
    const countText = await badge.innerText();
    expect(parseInt(countText, 10)).toBeGreaterThan(0);

    // Open notifications popover
    await bellBtn.click();
    const popover = page.getByTestId("notification-popover");
    await expect(popover).toBeVisible();
    await expect(popover.getByText("Notifications")).toBeVisible();

    // Check filter tabs
    const allTab = page.getByTestId("tab-all-notifications");
    const unreadTab = page.getByTestId("tab-unread-notifications");
    await expect(allTab).toBeVisible();
    await expect(unreadTab).toBeVisible();

    // Verify seeded notification item exists
    const notifItem = page.getByTestId("notification-item-notif-seed-2");
    await expect(notifItem).toBeVisible();
    await expect(notifItem).toContainText("New Task Assigned");

    // Click Unread tab
    await unreadTab.click();
    await expect(notifItem).toBeVisible();

    // Click Mark All Read
    const markAllBtn = page.getByTestId("mark-all-read-btn");
    if (await markAllBtn.isVisible()) {
      await markAllBtn.click();
      // Badge should disappear once all are read
      await expect(badge).not.toBeVisible();
    }
  });

  test("shows notification bell on /start route", async ({ page }) => {
    await loginAs(page, "ava@acme.com", "password123");
    await page.goto("/start");
    await expect(page).toHaveURL(/\/start/);

    const bellBtn = page.getByTestId("notification-bell-btn");
    await expect(bellBtn).toBeVisible();

    // Can open popover on /start
    await bellBtn.click();
    await expect(page.getByTestId("notification-popover")).toBeVisible();
  });

  test("invites registered non-workspace user on /preferences and delivers notification with Accept option", async ({ page }) => {
    // 1. Ava logs in and visits /preferences
    await loginAs(page, "ava@acme.com", "password123");
    await page.goto("/preferences");
    await expect(page).toHaveURL(/\/preferences/);

    // Click Members tab
    const membersTab = page.getByRole("button", { name: "Members & Roles" });
    await membersTab.click();

    // Search for a user not yet in Acme Corporation (anand)
    const searchInput = page.getByPlaceholder("Search users by name, username, or email...");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("anand");

    // Verify anand appears in the search dropdown results
    const addBtn = page.getByRole("button", { name: /add as/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 5000 });

    // Click to add member
    await addBtn.click();

    // Member should now appear in the workspace roster with Pending status
    await expect(page.locator("table").getByText("Anand Verma")).toBeVisible({ timeout: 5000 });

    // 2. Clear context / cookies and log in as anand
    await page.context().clearCookies();
    await loginAs(page, "anand@cspace.com", "password123");

    await page.goto("/start");
    await expect(page).toHaveURL(/\/start/);

    // Verify anand received the invite notification
    const bellBtn = page.getByTestId("notification-bell-btn");
    await expect(bellBtn).toBeVisible();
    await bellBtn.click();

    const popover = page.getByTestId("notification-popover");
    await expect(popover).toBeVisible();
    await expect(popover.getByText(/added to|invited to/i).first()).toBeVisible();

    // Verify the 3 action options are present: Accept, Decline, and Notify later (10s)
    const acceptBtn = popover.getByRole("button", { name: "Accept" }).first();
    const declineBtn = popover.getByRole("button", { name: "Decline" }).first();
    const notifyLaterBtn = popover.getByRole("button", { name: /notify later/i }).first();

    await expect(acceptBtn).toBeVisible();
    await expect(declineBtn).toBeVisible();
    await expect(notifyLaterBtn).toBeVisible();

    // Anand clicks Accept
    await acceptBtn.click();
    await expect(popover.getByText(/Invitation Accepted/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("snoozes invitation with 'Notify later (10s)' and presents floating reminder card", async ({ page }) => {
    // 1. Ava invites another user (userview1) from /preferences
    await loginAs(page, "ava@acme.com", "password123");
    await page.goto("/preferences");
    await page.getByRole("button", { name: "Members & Roles" }).click();

    const searchInput = page.getByPlaceholder("Search users by name, username, or email...");
    await searchInput.fill("userview1");
    const addBtn = page.getByRole("button", { name: /add as/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();
    await expect(page.locator("table").getByText("USER_VIEW_1")).toBeVisible({ timeout: 5000 });

    // 2. Log in as userview1
    await page.context().clearCookies();
    await loginAs(page, "userview1@cspace.com", "password123");
    await page.goto("/start");

    // Open notification popover
    const bellBtn = page.getByTestId("notification-bell-btn");
    await expect(bellBtn).toBeVisible();
    await bellBtn.click();

    const popover = page.getByTestId("notification-popover");
    await expect(popover).toBeVisible();

    // Click 'Notify later (10s)'
    const notifyLaterBtn = popover.getByRole("button", { name: /notify later/i }).first();
    await expect(notifyLaterBtn).toBeVisible();
    await notifyLaterBtn.click();

    // Popover closes and feedback toast appears
    await expect(popover).not.toBeVisible();
    await expect(page.getByTestId("notification-toast")).toContainText(/10 seconds/i);

    // After 10s, floating reminder banner appears
    const reminderBanner = page.getByTestId("invite-reminder-banner");
    await expect(reminderBanner).toBeVisible({ timeout: 14000 });
    await expect(reminderBanner.getByText(/Reminder: Workspace Invitation/i)).toBeVisible();
    await expect(page.getByTestId("reminder-accept-btn")).toBeVisible();
    await expect(page.getByTestId("reminder-decline-btn")).toBeVisible();

    // Dismiss or accept directly from the reminder banner
    await page.getByTestId("reminder-accept-btn").click();
    await expect(reminderBanner).not.toBeVisible();
  });
});

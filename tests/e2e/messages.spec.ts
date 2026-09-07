import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Messages & Chat Threads", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("should select conversation, send a message, and verify persistence in chat history", async ({ page }) => {
    await page.goto("/messages");

    // Verify messages page heading
    await expect(page.getByRole("heading", { name: "Messages" }).first()).toBeVisible();

    // Select Engineering conversation
    const engineeringChannel = page.getByText("Engineering").first();
    await expect(engineeringChannel).toBeVisible();
    await engineeringChannel.click();

    // Verify composer is present
    const composer = page.getByPlaceholder("Write a message...");
    await expect(composer).toBeVisible();

    // Send a message
    const testMessage = `Automated E2E message ${Date.now()}`;
    await composer.fill(testMessage);
    await page.getByRole("button", { name: "Send" }).click();

    // Assert the message renders in chat
    await expect(page.getByText(testMessage).first()).toBeVisible();

    // Reload page to verify SQLite database persistence
    await page.reload();
    await engineeringChannel.click();
    await expect(page.getByText(testMessage).first()).toBeVisible();
  });
});

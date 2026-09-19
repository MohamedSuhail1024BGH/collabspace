import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Keyboard Shortcuts & Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("should toggle Command Palette with Ctrl+K and close with Escape", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Welcome to Acme Corporation" })).toBeVisible();

    // Verify Command Palette is not visible initially
    await expect(page.getByPlaceholder("Type a command or search workspace...")).not.toBeVisible();

    // Trigger Ctrl+K
    await page.keyboard.press("Control+k");
    await expect(page.getByPlaceholder("Type a command or search workspace...")).toBeVisible();

    // Press Escape to dismiss
    await page.keyboard.press("Escape");
    await expect(page.getByPlaceholder("Type a command or search workspace...")).not.toBeVisible();

    // Trigger Ctrl+K again to re-open
    await page.keyboard.press("Control+k");
    await expect(page.getByPlaceholder("Type a command or search workspace...")).toBeVisible();

    // Press Ctrl+K again to toggle closed
    await page.keyboard.press("Control+k");
    await expect(page.getByPlaceholder("Type a command or search workspace...")).not.toBeVisible();
  });

  test("should navigate using G chords (G T for tasks, G M for messages, G P for projects)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Welcome to Acme Corporation" })).toBeVisible();

    // Press G followed by T
    await page.keyboard.press("g");
    await page.keyboard.press("t");
    await page.waitForURL("**/tasks");
    await expect(page).toHaveURL(/\/tasks/);

    // Press G followed by M
    await page.keyboard.press("g");
    await page.keyboard.press("m");
    await page.waitForURL("**/messages");
    await expect(page).toHaveURL(/\/messages/);

    // Press G followed by P
    await page.keyboard.press("g");
    await page.keyboard.press("p");
    await page.waitForURL("**/projects");
    await expect(page).toHaveURL(/\/projects/);

    // Press G followed by O to return to overview
    await page.keyboard.press("g");
    await page.keyboard.press("o");
    await page.waitForURL("**/");
    await expect(page).toHaveURL(/\/$/);
  });

  test("should focus message filter input with F key and blur on Escape", async ({ page }) => {
    await page.goto("/messages");
    await expect(page.getByPlaceholder("Filter channels, peers...")).toBeVisible();

    // Press F key while not in input
    await page.keyboard.press("f");
    await expect(page.getByPlaceholder("Filter channels, peers...")).toBeFocused();

    // Press Escape to blur
    await page.keyboard.press("Escape");
    await expect(page.getByPlaceholder("Filter channels, peers...")).not.toBeFocused();
  });
});


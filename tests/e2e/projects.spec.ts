import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Projects Portfolio & Details", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("should render project portfolio, allow selection, and navigate to project detail page", async ({ page }) => {
    await page.goto("/projects");

    // Verify projects page heading
    await expect(page.getByRole("heading", { name: "Project portfolio" })).toBeVisible();

    // Verify seeded projects exist
    await expect(page.getByText("Brand refresh").first()).toBeVisible();
    await expect(page.getByText("Customer portal").first()).toBeVisible();

    // Click Brand refresh project card to select
    await page.getByText("Brand refresh").first().click();

    // Verify details panel shows selected project
    await expect(page.getByRole("heading", { name: "Brand refresh" })).toBeVisible();

    // Click "Open details" link
    const openDetailsLink = page.getByRole("link", { name: "Open details" }).first();
    await openDetailsLink.click();

    // Assert URL is /projects/brand-refresh
    await expect(page).toHaveURL(/\/projects\/brand-refresh/);

    // Verify detail page elements
    await expect(page.getByRole("heading", { name: "Brand refresh" })).toBeVisible();
    await expect(page.getByText("Team members")).toBeVisible();
  });
});


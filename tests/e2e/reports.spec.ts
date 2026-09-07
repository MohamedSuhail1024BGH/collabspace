import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Reports Page", () => {
  test("loads live workspace reports and switches filters", async ({ page }) => {
    await loginAs(page);
    await page.goto("/reports");

    // Header & live metrics banner
    await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
    await expect(page.getByText("Live Workspace Metrics")).toBeVisible();

    // Summary cards
    await expect(page.getByText("Completion rate")).toBeVisible();
    await expect(page.getByText("Total projects")).toBeVisible();
    await expect(page.getByText("Open tasks")).toBeVisible();
    await expect(page.getByText("Team members")).toBeVisible();

    // Verify category select dropdown
    const categorySelect = page.locator("select").filter({ hasText: "Overview" });
    await categorySelect.selectOption("Projects");
    await expect(page.getByText("Project performance")).toBeVisible();

    await categorySelect.selectOption("Tasks");
    await expect(page.getByText("Task analytics")).toBeVisible();

    await categorySelect.selectOption("Team");
    await expect(page.getByText("Team performance")).toBeVisible();

    // Switch time periods
    await page.getByRole("button", { name: "This month" }).click();
    await page.getByRole("button", { name: "This quarter" }).click();
    await page.getByRole("button", { name: "This week" }).click();

    // Ensure mock note is not present
    await expect(page.getByText("deterministic mock data")).not.toBeVisible();
  });
});


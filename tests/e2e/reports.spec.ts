import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Reports Page", () => {
  test("loads live workspace reports, switches filters, verifies activity labels and project links", async ({ page }) => {
    await loginAs(page);
    await page.goto("/reports");

    // Header & live metrics banner
    await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
    await expect(page.getByText("Live Workspace Metrics")).toBeVisible();

    // Summary cards
    await expect(page.getByText("Completion rate", { exact: true })).toBeVisible();
    await expect(page.getByText("Total projects", { exact: true })).toBeVisible();
    await expect(page.getByText("Open tasks", { exact: true })).toBeVisible();
    await expect(page.getByText("Team members", { exact: true })).toBeVisible();

    // Verify activity chart labels on "This week"
    await expect(page.getByText("Mon", { exact: true })).toBeVisible();
    await expect(page.getByText("Fri", { exact: true })).toBeVisible();

    // Switch time periods and verify labels
    await page.getByRole("button", { name: "This month" }).click();
    await expect(page.getByText("W1", { exact: true })).toBeVisible();
    await expect(page.getByText("W4", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "This quarter" }).click();
    await expect(page.getByText("Month 1", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "This week" }).click();

    // Verify category select dropdown
    const categorySelect = page.locator("select").filter({ hasText: "Overview" });
    await categorySelect.selectOption("Projects");
    await expect(page.getByText("Project performance")).toBeVisible();

    // Verify project performance has clickable link to project detail page
    const projectLink = page.getByRole("link", { name: /Brand refresh/i }).first();
    await expect(projectLink).toBeVisible();
    await expect(projectLink).toHaveAttribute("href", /\/projects\//);

    await categorySelect.selectOption("Tasks");
    await expect(page.getByText("Task analytics")).toBeVisible();

    await categorySelect.selectOption("Team");
    await expect(page.getByText("Team performance")).toBeVisible();

    // Reset to Overview
    await categorySelect.selectOption("Overview");

    // Verify Export report button exists and is clickable
    const exportBtn = page.getByTestId("export-report-btn");
    await expect(exportBtn).toBeVisible();

    // Ensure mock note is not present
    await expect(page.getByText("deterministic mock data")).not.toBeVisible();
  });
});

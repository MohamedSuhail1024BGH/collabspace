import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Tasks Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("should create, filter, and manage tasks with database persistence", async ({ page }) => {
    await page.goto("/tasks");

    // Verify task page header
    await expect(page.getByRole("heading", { name: "Task queue" })).toBeVisible();

    // Open Create Task Form
    await page.getByRole("button", { name: "New task" }).click();
    await expect(page.getByRole("heading", { name: "Create a task" })).toBeVisible();

    // Fill in task draft
    const taskTitle = `E2E Playwright Task ${Date.now()}`;
    await page.getByPlaceholder("Task title").fill(taskTitle);
    await page.getByPlaceholder("Add context, blockers, or notes").fill("Tested via automated Playwright headless browser.");
    await page.getByRole("button", { name: "Create task" }).click();

    // Assert the new task appears in the task list
    await expect(page.getByText(taskTitle)).toBeVisible();

    // Test Search Filter
    const searchInput = page.getByPlaceholder("Search tasks by title or assignee");
    await searchInput.fill(taskTitle);
    await expect(page.getByText(taskTitle)).toBeVisible();

    // Clear search
    await page.getByRole("button", { name: "Clear" }).click();

    // Verify task survives page reload (SQLite persistence)
    await page.reload();
    await expect(page.getByText(taskTitle)).toBeVisible();

    // Clean up: delete task
    const taskRow = page.locator("div").filter({ hasText: taskTitle }).last();
    const deleteButton = taskRow.getByRole("button", { name: "Delete" });
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await expect(page.getByText(taskTitle)).not.toBeVisible();
    }
  });
});

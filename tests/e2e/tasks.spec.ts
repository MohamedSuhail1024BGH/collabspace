import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

test.describe("Tasks Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
  });

  test("should verify no global new task button on /tasks, create task via project associated tasks, and manage in task queue", async ({ page }) => {
    // 1. Visit /tasks and verify "New task" button is removed
    await page.goto("/tasks");
    await expect(page.getByRole("heading", { name: "Task queue" })).toBeVisible();
    await expect(page.getByRole("button", { name: "New task" })).not.toBeVisible();

    // 2. Navigate to project details to add task via Associated tasks card
    await page.goto("/projects/brand-refresh");
    await expect(page.getByRole("heading", { name: "Brand refresh" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Associated tasks" })).toBeVisible();

    // 3. Open Add task modal
    const addTaskButton = page.getByTestId("project-add-task-btn");
    await expect(addTaskButton).toBeVisible();
    await addTaskButton.click();

    // Verify task modal interface matches standard TaskForm
    await expect(page.getByRole("heading", { name: "Create a task" })).toBeVisible();

    // Fill in task draft
    const taskTitle = `E2E Playwright Task ${Date.now()}`;
    await page.getByPlaceholder("Task title").fill(taskTitle);
    await page.getByPlaceholder("Add context, blockers, or notes").fill("Tested via automated Playwright headless browser.");
    await page.getByRole("button", { name: "Create task" }).click();

    // Assert the new task appears in project's Associated tasks list
    await expect(page.getByText(taskTitle)).toBeVisible();

    // 4. Navigate back to /tasks and assert task is listed in Task queue
    await page.goto("/tasks");
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

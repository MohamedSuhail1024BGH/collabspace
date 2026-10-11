import { test, expect } from "@playwright/test";
import { dismissStatusNotice } from "./helpers/auth";

test.describe("Authentication & Workspace Onboarding", () => {
  test("should redirect unauthenticated users to /login when accessing protected routes", async ({ page }) => {
    // Clear cookies by context
    await page.context().clearCookies();

    await page.goto("/tasks");
    await expect(page).toHaveURL(/\/login/);
    await dismissStatusNotice(page);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

    await page.goto("/projects");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/messages");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/calendar");
    await expect(page).toHaveURL(/\/login/);
  });

  test("should allow signing up with a new user and custom workspace, then redirect to login, sign in, and log out", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/signup");
    await dismissStatusNotice(page);

    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();

    const testId = Date.now();
    const testEmail = `founder_${testId}@venturelab.io`;
    const testName = `Founder ${testId}`;
    const testUsername = `founder${testId}`;
    const testWorkspace = `Venture Lab ${testId}`;

    await page.getByPlaceholder("e.g. Alex Morgan").fill(testName);
    await page.getByPlaceholder("alex@company.com").fill(testEmail);
    const passwordInput = page.getByPlaceholder("At least 6 characters");
    await passwordInput.fill("securePass123!");
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Test Show Password toggle on registration form
    const showPasswordCheckbox = page.getByTestId("signup-show-password");
    await showPasswordCheckbox.check();
    await expect(passwordInput).toHaveAttribute("type", "text");
    await showPasswordCheckbox.uncheck();
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Fill username handle
    await page.getByPlaceholder("alexmorgan").fill(testUsername);

    await page.getByRole("button", { name: "Create Account" }).click();

    // Verify redirected to /login with registered=true and success banner visible
    await expect(page).toHaveURL(/\/login\?registered=true/);
    await expect(page.getByTestId("registered-success-banner")).toBeVisible();
    await expect(page.getByText("Account created successfully! Please sign in with your credentials.")).toBeVisible();

    // Sign in with the newly created credentials
    await page.getByPlaceholder("name@company.com").fill(testEmail);
    await page.getByPlaceholder("••••••••").fill("securePass123!");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Verify redirected to /start hub
    await expect(page).toHaveURL(/\/start/);
    await expect(page.getByRole("heading", { name: `Ready to collaborate, ${testName}?` })).toBeVisible();

    // Create a new workspace from /start hub
    await page.getByTestId("start-create-workspace-btn").click();
    await expect(page.getByTestId("create-workspace-modal")).toBeVisible();
    await page.getByTestId("new-workspace-name-input").fill(testWorkspace);
    await page.getByTestId("submit-create-workspace-btn").click();

    // Verify redirected to dashboard
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: `Welcome to ${testWorkspace}` })).toBeVisible();

    // Verify user profile in sidebar
    await expect(page.getByRole("complementary").getByText(testName)).toBeVisible();
    await expect(page.getByRole("complementary").getByText(testEmail)).toBeVisible();

    // Verify custom workspace is active in switcher
    await expect(page.getByText(testWorkspace).first()).toBeVisible();

    // Verify Overview empty state labels in newly created workspace
    await expect(page.getByTestId("no-featured-projects")).toBeVisible();
    await expect(page.getByText("No Featured Projects here")).toBeVisible();
    await expect(page.getByTestId("no-priority-tasks")).toBeVisible();
    await expect(page.getByText("No Priority Tasks here")).toBeVisible();
    await expect(page.getByTestId("no-activity")).toBeVisible();
    await expect(page.getByText("No Activity here")).toBeVisible();

    // Verify search bar has been removed from Header
    await expect(page.getByText("Search project...")).not.toBeVisible();

    // Test Logout via expandable sidebar switcher
    await page.getByTestId("workspace-switcher-trigger").click();
    const logoutBtn = page.getByTestId("logout-button");
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Verify redirected back to /login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("should allow logging in with credentials and switching workspaces", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await dismissStatusNotice(page);

    // Fill credentials manually
    await page.getByPlaceholder("name@company.com").fill("ava@acme.com");
    const loginPass = page.getByPlaceholder("••••••••");
    await loginPass.fill("password123");
    await expect(loginPass).toHaveAttribute("type", "password");

    // Test Show Password toggle on Login form
    const loginShowPass = page.getByTestId("login-show-password");
    await loginShowPass.check();
    await expect(loginPass).toHaveAttribute("type", "text");
    await loginShowPass.uncheck();
    await expect(loginPass).toHaveAttribute("type", "password");

    // Click Sign In
    await page.getByRole("button", { name: "Sign In" }).click();

    // Assert redirect to /start
    await expect(page).toHaveURL(/\/start/);
    await expect(page.getByRole("heading", { name: "Ready to collaborate, Ava Thompson?" })).toBeVisible();

    // Launch workspace from /start hub
    const launchBtn = page.getByTestId("launch-workspace-acme");
    await expect(launchBtn).toBeVisible();
    await launchBtn.click();

    // Assert redirect to dashboard
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("complementary").getByText("Ava Thompson")).toBeVisible();
    await expect(page.getByText("Acme Corporation").first()).toBeVisible();

    // Open sidebar workspace switcher and verify logout button
    await page.getByTestId("workspace-switcher-trigger").click();
    const logoutBtn = page.getByTestId("logout-button");
    await expect(logoutBtn).toBeVisible();
    await expect(logoutBtn).toHaveText(/Log out/);

    // Test logging out via sidebar
    await logoutBtn.click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("should allow deleting user account with confirmation and prevent subsequent login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/signup");
    await dismissStatusNotice(page);

    const testId = Date.now();
    const testEmail = `del_${testId}@testcorp.io`;
    const testPassword = "DeleteSecurePass123!";
    const testWorkspace = `Ephemeral Workspace ${testId}`;

    // Register user
    await page.getByPlaceholder("e.g. Alex Morgan").fill(`Delete Target ${testId}`);
    await page.getByPlaceholder("alex@company.com").fill(testEmail);
    await page.getByPlaceholder("At least 6 characters").fill(testPassword);
    await page.getByPlaceholder("alexmorgan").fill(`deltarget${testId}`);
    await page.getByRole("button", { name: "Create Account" }).click();

    // Verify redirected to /login
    await expect(page).toHaveURL(/\/login\?registered=true/);

    // Sign in with the registered account
    await page.getByPlaceholder("name@company.com").fill(testEmail);
    await page.getByPlaceholder("••••••••").fill(testPassword);
    await page.getByRole("button", { name: "Sign In" }).click();

    // Land on /start
    await expect(page).toHaveURL(/\/start/);

    // Create a workspace to launch into dashboard
    await page.getByTestId("start-create-workspace-btn").click();
    await expect(page.getByTestId("create-workspace-modal")).toBeVisible();
    await page.getByTestId("new-workspace-name-input").fill(testWorkspace);
    await page.getByTestId("submit-create-workspace-btn").click();

    // Verify dashboard reached
    await expect(page).toHaveURL("/");
    await expect(page.getByText(testWorkspace).first()).toBeVisible();

    // Open settings via workspace switcher
    await page.getByTestId("workspace-switcher-trigger").click();
    const settingsBtn = page.getByTestId("sidebar-settings-button");
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    // Switch to Danger Zone tab and click Delete Account
    const dangerTab = page.getByTestId("settings-danger-tab");
    await expect(dangerTab).toBeVisible();
    await dangerTab.click();

    const deleteBtn = page.getByTestId("settings-delete-account-button");
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Verify confirmation modal appears
    const modal = page.getByTestId("delete-account-modal");
    await expect(modal).toBeVisible();

    // Confirm deletion
    const confirmBtn = page.getByTestId("confirm-delete-account-button");
    await confirmBtn.click();

    // Verify redirected to /login with deleted=true
    await expect(page).toHaveURL(/\/login\?deleted=true/);
    await expect(page.getByTestId("deleted-success-banner")).toBeVisible();
    await expect(page.getByText("Your account has been successfully deleted.")).toBeVisible();

    // Verify the deleted user CANNOT log in anymore
    await page.getByPlaceholder("name@company.com").fill(testEmail);
    await page.getByPlaceholder("••••••••").fill(testPassword);
    await page.getByRole("button", { name: "Sign In" }).click();

    // Verify error displayed and still on /login
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});

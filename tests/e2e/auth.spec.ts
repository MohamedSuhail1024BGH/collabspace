import { test, expect } from "@playwright/test";

test.describe("Authentication & Workspace Onboarding", () => {
  test("should redirect unauthenticated users to /login when accessing protected routes", async ({ page }) => {
    // Clear cookies by context
    await page.context().clearCookies();

    await page.goto("/tasks");
    await expect(page).toHaveURL(/\/login/);
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

    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();

    const testId = Date.now();
    const testEmail = `founder_${testId}@venturelab.io`;
    const testName = `Founder ${testId}`;
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

    await page.getByPlaceholder("e.g. Acme Operations or My Team").fill(testWorkspace);

    await page.getByRole("button", { name: "Create Account & Workspace" }).click();

    // Verify redirected to /login with registered=true and success banner visible
    await expect(page).toHaveURL(/\/login\?registered=true/);
    await expect(page.getByTestId("registered-success-banner")).toBeVisible();
    await expect(page.getByText("Account created successfully! Please sign in with your credentials.")).toBeVisible();

    // Sign in with the newly created credentials
    await page.getByPlaceholder("name@company.com").fill(testEmail);
    await page.getByPlaceholder("••••••••").fill("securePass123!");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Verify redirected to dashboard
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Ship more, together." })).toBeVisible();

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

    // Test Logout
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

    // Assert redirect to dashboard
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("complementary").getByText("Ava Thompson")).toBeVisible();
    await expect(page.getByText("Acme Corporation").first()).toBeVisible();

    // Verify header user badge and logout button are visible
    const headerLogout = page.getByTestId("header-logout-button");
    await expect(headerLogout).toBeVisible();
    await expect(headerLogout).toHaveText(/Log out/);

    // Test logging out via header
    await headerLogout.click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("should allow deleting user account with confirmation and prevent subsequent login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/signup");

    const testId = Date.now();
    const testEmail = `del_${testId}@testcorp.io`;
    const testPassword = "DeleteSecurePass123!";
    const testWorkspace = `Ephemeral Workspace ${testId}`;

    // Register user
    await page.getByPlaceholder("e.g. Alex Morgan").fill(`Delete Target ${testId}`);
    await page.getByPlaceholder("alex@company.com").fill(testEmail);
    await page.getByPlaceholder("At least 6 characters").fill(testPassword);
    await page.getByPlaceholder("e.g. Acme Operations or My Team").fill(testWorkspace);
    await page.getByRole("button", { name: "Create Account & Workspace" }).click();

    // Verify redirected to /login
    await expect(page).toHaveURL(/\/login\?registered=true/);

    // Sign in with the registered account
    await page.getByPlaceholder("name@company.com").fill(testEmail);
    await page.getByPlaceholder("••••••••").fill(testPassword);
    await page.getByRole("button", { name: "Sign In" }).click();

    // Verify dashboard reached
    await expect(page).toHaveURL("/");
    await expect(page.getByText(testWorkspace).first()).toBeVisible();

    // Click Delete Account button in header
    const deleteBtn = page.getByTestId("header-delete-account-button");
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Verify confirmation modal appears
    const modal = page.getByTestId("delete-account-modal");
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("heading", { name: "Delete Account" })).toBeVisible();

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

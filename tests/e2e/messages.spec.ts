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

  test("should open new chat modal and start direct message with team colleague", async ({ page }) => {
    await page.goto("/messages");

    // Open New Chat modal
    const newChatBtn = page.getByTestId("new-chat-btn");
    await expect(newChatBtn).toBeVisible();
    await newChatBtn.click();

    // Verify modal is open
    const modal = page.getByTestId("new-chat-modal");
    await expect(modal).toBeVisible();
    await expect(page.getByText("Select Team Colleague")).toBeVisible();

    // Start direct message with Leo Martin
    const dmLeoBtn = page.getByTestId("start-dm-leomartin");
    await expect(dmLeoBtn).toBeVisible();
    await dmLeoBtn.click();

    // Modal should close and active conversation should be Leo Martin
    await expect(modal).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "Leo Martin" })).toBeVisible();

    // Send a direct message
    const dmText = `Direct hello to Leo ${Date.now()}`;
    const composer = page.getByPlaceholder("Write a message...");
    await composer.fill(dmText);
    await page.getByRole("button", { name: "Send" }).click();

    // Verify direct message is rendered
    await expect(page.getByText(dmText).first()).toBeVisible();
  });

  test("should display counterparty identity correctly across accounts (Ava sees Leo, Leo sees Ava)", async ({ page }) => {
    // 1. Ava is currently logged in. Navigate to messages.
    await page.goto("/messages");

    // Ava should see Leo Martin in the conversation list
    const leoConvItem = page.getByTestId("conversation-item-conv-dm-leo");
    await expect(leoConvItem).toBeVisible();
    await leoConvItem.click();

    // The chat header for Ava must show "Leo Martin"
    await expect(page.getByRole("heading", { name: "Leo Martin" })).toBeVisible();

    // Ava sends a message to Leo
    const avaMessage = `Hey Leo from Ava ${Date.now()}`;
    const composer = page.getByPlaceholder("Write a message...");
    await composer.fill(avaMessage);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(avaMessage).first()).toBeVisible();

    // 2. Clear cookies and log in as Leo Martin
    await page.context().clearCookies();
    await loginAs(page, "leo@starlight.com", "password123");

    // Ensure Leo switches to Acme Corporation if needed
    await page.goto("/messages");

    // The DM conversation item for Leo must show "Ava Thompson" (NOT "Leo Martin")
    const avaConvItem = page.getByTestId("conversation-item-conv-dm-leo");
    await expect(avaConvItem).toBeVisible();
    await expect(avaConvItem).toContainText("Ava Thompson");
    await avaConvItem.click();

    // The chat header for Leo must show "Ava Thompson" (NOT "Leo Martin")
    await expect(page.getByRole("heading", { name: "Ava Thompson" })).toBeVisible();

    // Leo should see Ava's message
    await expect(page.getByText(avaMessage).first()).toBeVisible();

    // Leo replies to Ava
    const leoReply = `Got your note Ava from Leo ${Date.now()}`;
    await composer.fill(leoReply);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(leoReply).first()).toBeVisible();

    // 3. Clear cookies and log back in as Ava
    await page.context().clearCookies();
    await loginAs(page, "ava@acme.com", "password123");
    await page.goto("/messages");

    // Ava clicks Leo Martin's conversation
    await leoConvItem.click();
    await expect(page.getByRole("heading", { name: "Leo Martin" })).toBeVisible();

    // Ava sees Leo's reply!
    await expect(page.getByText(leoReply).first()).toBeVisible();
  });

  test("should synchronize messages live in real time between two open browser sessions without manual reload", async ({ browser }) => {
    // Session 1: Ava Thompson
    const contextAva = await browser.newContext();
    const pageAva = await contextAva.newPage();
    await loginAs(pageAva, "ava@acme.com", "password123");
    await pageAva.goto("/messages");
    const avaLeoDm = pageAva.getByTestId("conversation-item-conv-dm-leo");
    await expect(avaLeoDm).toBeVisible();
    await avaLeoDm.click();
    await expect(pageAva.getByRole("heading", { name: "Leo Martin" })).toBeVisible();

    // Session 2: Leo Martin open concurrently in separate session
    const contextLeo = await browser.newContext();
    const pageLeo = await contextLeo.newPage();
    await loginAs(pageLeo, "leo@starlight.com", "password123");
    await pageLeo.goto("/messages");
    const leoAvaDm = pageLeo.getByTestId("conversation-item-conv-dm-leo");
    await expect(leoAvaDm).toBeVisible();
    await leoAvaDm.click();
    await expect(pageLeo.getByRole("heading", { name: "Ava Thompson" })).toBeVisible();

    // 1. Ava sends message to Leo
    const liveAvaMsg = `Live instant hello to Leo ${Date.now()}`;
    await pageAva.getByPlaceholder("Write a message...").fill(liveAvaMsg);
    await pageAva.getByRole("button", { name: "Send" }).click();
    await expect(pageAva.getByText(liveAvaMsg).first()).toBeVisible();

    // 2. Leo should receive Ava's message LIVE without reloading the page!
    await expect(pageLeo.getByText(liveAvaMsg).first()).toBeVisible({ timeout: 6000 });

    // 3. Leo replies to Ava
    const liveLeoReply = `Live instant response from Leo ${Date.now()}`;
    await pageLeo.getByPlaceholder("Write a message...").fill(liveLeoReply);
    await pageLeo.getByRole("button", { name: "Send" }).click();
    await expect(pageLeo.getByText(liveLeoReply).first()).toBeVisible();

    // 4. Ava should receive Leo's reply LIVE without reloading the page!
    await expect(pageAva.getByText(liveLeoReply).first()).toBeVisible({ timeout: 6000 });

    await contextAva.close();
    await contextLeo.close();
  });

  test("should enforce two-sided authentic presence in DMs (shows Offline when counterparty is inactive, live updates to Online when active, and vice-versa)", async ({ browser }) => {
    // Session 1: Ava opens /messages
    const contextAva = await browser.newContext();
    const pageAva = await contextAva.newPage();
    await loginAs(pageAva, "ava@acme.com", "password123");
    await pageAva.goto("/messages");

    // Select Leo Martin DM
    const avaLeoDm = pageAva.getByTestId("conversation-item-conv-dm-leo");
    await expect(avaLeoDm).toBeVisible();
    await avaLeoDm.click();

    // Since Leo is NOT logged in or active on /messages, ChatHeader must show "Offline"
    await expect(pageAva.getByRole("heading", { name: "Leo Martin" })).toBeVisible();
    await expect(pageAva.getByText("Offline").first()).toBeVisible();

    // Session 2: Leo opens /messages in a separate browser context
    const contextLeo = await browser.newContext();
    const pageLeo = await contextLeo.newPage();
    await loginAs(pageLeo, "leo@starlight.com", "password123");
    await pageLeo.goto("/messages");
    const leoAvaDm = pageLeo.getByTestId("conversation-item-conv-dm-leo");
    await expect(leoAvaDm).toBeVisible();
    await leoAvaDm.click();

    // In Leo's session: Ava is actively on /messages, so Leo sees Ava as "Online"
    await expect(pageLeo.getByRole("heading", { name: "Ava Thompson" })).toBeVisible();
    await expect(pageLeo.getByText("Online").first()).toBeVisible({ timeout: 8000 });

    // In Ava's session: Ava should now see Leo update to "Online" live via SSE without reloading!
    await expect(pageAva.getByText("Online").first()).toBeVisible({ timeout: 8000 });

    // Now Leo leaves / closes /messages
    await pageLeo.goto("/projects");
    // After grace period, Ava's session should see Leo update to "Offline"
    await expect(pageAva.getByText("Offline").first()).toBeVisible({ timeout: 10000 });

    await contextAva.close();
    await contextLeo.close();
  });
});


import fs from "fs";
import path from "path";
import { test, expect, APIRequestContext } from "@playwright/test";
import { loginAs } from "./helpers/auth";
import { sendMessageAction, createConversationAction, getLiveConversationsAction } from "@/app/actions-messages";
import { searchUsersAction } from "@/app/actions-search";
import { switchWorkspaceAction, joinWorkspaceAction } from "@/app/actions-workspaces";
import { db } from "@/lib/db";
import { workspaces, messages, projectMembers, conversations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function getActionId(actionName: string): string {
  const manifestPath = path.resolve(process.cwd(), ".next/server/server-reference-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  for (const [id, entry] of Object.entries(manifest.node as Record<string, { exportedName: string }>)) {
    if (entry.exportedName === actionName) {
      return id;
    }
  }
  throw new Error(`Action "${actionName}" not found in server-reference-manifest.json`);
}

function parseRscResponse<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    // Continue to parse RSC format
  }

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let targetId = "1";
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx !== -1 && line.slice(0, colonIdx) === "0") {
      const match = line.match(/"a":"\$@(\d+)"/);
      if (match) {
        targetId = match[1];
        break;
      }
    }
  }

  for (const line of lines) {
    const prefix = `${targetId}:`;
    if (line.startsWith(prefix)) {
      const payload = line.slice(prefix.length).trim();
      return JSON.parse(payload) as T;
    }
  }

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0 && colonIdx < 10) {
      const candidate = line.slice(colonIdx + 1).trim();
      try {
        const parsed = JSON.parse(candidate);
        if (parsed && typeof parsed === "object" && !("a" in parsed && "b" in parsed)) {
          return parsed as T;
        }
      } catch {
        // try next line
      }
    }
  }

  throw new Error(`Could not parse server action response: ${text}`);
}

async function callAction<T>(
  request: APIRequestContext,
  actionName: string,
  args: unknown[] = [],
  sessionCookie?: string
): Promise<T> {
  const actionId = getActionId(actionName);
  const headers: Record<string, string> = {
    "Next-Action": actionId,
    "Accept": "text/x-component",
    "Content-Type": "text/plain;charset=UTF-8",
  };
  if (sessionCookie) {
    headers["Cookie"] = `collabspace_session=${sessionCookie}`;
  }

  const response = await request.post("/", {
    headers,
    data: JSON.stringify(args),
  });

  const text = await response.text();
  return parseRscResponse<T>(text);
}

interface SseEventData {
  type?: string;
  conversationId?: string;
  message?: {
    id?: string;
    content?: string;
    sender?: string;
  };
}

function startSseCollector(url: string, sessionCookie: string) {
  const events: SseEventData[] = [];
  const controller = new AbortController();
  let resolveConnected: () => void;
  let rejectConnected: (err: Error) => void;
  const connectedPromise = new Promise<void>((resolve, reject) => {
    resolveConnected = resolve;
    rejectConnected = reject;
  });

  fetch(url, {
    headers: {
      Cookie: `collabspace_session=${sessionCookie}`,
    },
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        rejectConnected(new Error(`SSE connection failed with HTTP ${res.status}`));
        return;
      }
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            const lines = part.split("\n");
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(":")) {
                // Ignore comments like ": ping"
                continue;
              }
              if (trimmed.startsWith("data:")) {
                const dataStr = trimmed.slice(5).trim();
                try {
                  const parsed = JSON.parse(dataStr) as SseEventData;
                  if (parsed && parsed.type === "connected") {
                    resolveConnected();
                  } else {
                    events.push(parsed);
                  }
                } catch {
                  // Partial or malformed json
                }
              }
            }
          }
        }
      } catch {
        // Stream closed or aborted
      }
    })
    .catch((err) => {
      if (err?.name !== "AbortError") {
        rejectConnected(err instanceof Error ? err : new Error(String(err)));
      }
    });

  return {
    events,
    waitUntilConnected: () => connectedPromise,
    close: () => {
      controller.abort();
    },
  };
}

async function waitForEvent<T = SseEventData>(
  events: T[],
  predicate: (ev: T) => boolean,
  timeoutMs = 5000
): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const found = events.find(predicate);
    if (found) return found;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`Timed out waiting for SSE event after ${timeoutMs}ms`);
}

test.describe("Multi-Tenant Authorization & Security Hardening", () => {
  test.beforeAll(async () => {
    // Ensure a private workspace exists for testing invite-only enforcement
    const [existingPrivate] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, "ws-secret-vault"))
      .limit(1);

    if (!existingPrivate) {
      await db.insert(workspaces).values({
        id: "ws-secret-vault",
        name: "Secret Vault",
        slug: "secret-vault",
        plan: "Enterprise",
        isPublic: false,
        createdAt: new Date().toISOString(),
      });
    }

    // Ensure conv-general exists in ws-acme for channel broadcast tests
    const [existingGeneral] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, "conv-general"))
      .limit(1);

    if (!existingGeneral) {
      await db.insert(conversations).values({
        id: "conv-general",
        workspaceId: "ws-acme",
        name: "General",
        type: "channel",
        initials: "#",
        color: "bg-blue-500",
        role: "Channel",
        lastTimestamp: new Date().toISOString(),
      });
    }
  });

  // --- 1. Unauthenticated Access & SSE Route Invariants ---
  test("should deny unauthenticated requests across actions and return 401 on SSE", async ({ request }) => {
    // 1.1 Direct SSE connection without session cookie must return HTTP 401
    const sseResponse = await request.get("/api/messages/events?workspaceId=ws-acme");
    expect(sseResponse.status()).toBe(401);
    const bodyText = await sseResponse.text();
    expect(bodyText).toContain("Unauthorized");

    // 1.2 SSE connection missing workspaceId must return HTTP 400
    const missingWsResponse = await request.get("/api/messages/events");
    expect(missingWsResponse.status()).toBe(400);

    // 1.3 Actions invoked without session must return error
    const switchRes = await switchWorkspaceAction("ws-acme");
    expect(switchRes.success).toBe(false);
    expect(switchRes.error).toMatch(/Authentication required|not a member/i);

    const joinRes = await joinWorkspaceAction("ws-acme");
    expect(joinRes.success).toBe(false);
    expect(joinRes.error).toMatch(/Authentication required/i);

    const sendRes = await sendMessageAction("conv-general", "Hacker", "Hello");
    expect(sendRes.success).toBe(false);
    expect(sendRes.error).toMatch(/Authentication required/i);

    const convRes = await createConversationAction({ name: "Hacked Channel" });
    expect(convRes.success).toBe(false);
    expect(convRes.error).toMatch(/Authentication required/i);

    const liveRes = await getLiveConversationsAction("ws-acme");
    expect(liveRes.success).toBe(false);
    expect(liveRes.error).toMatch(/Authentication required/i);

    const searchRes = await searchUsersAction("admin");
    expect(searchRes).toEqual([]);
  });

  // --- 2. Cross-Tenant Isolation & SSE 403 Denial ---
  test("should return 403 when user attempts to subscribe to another workspace's events", async ({ page, request }) => {
    // Log in as useranon1 who only belongs to ws-collabspace (NOT ws-acme)
    await loginAs(page, "useranon1@cspace.com", "password123");

    // Extract cookies from page context to simulate authenticated request
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "collabspace_session");
    expect(sessionCookie).toBeDefined();

    // Make authenticated HTTP request to ws-acme SSE events
    const crossSseResponse = await request.get("/api/messages/events?workspaceId=ws-acme", {
      headers: {
        Cookie: `collabspace_session=${sessionCookie!.value}`,
      },
    });

    // Must be strictly HTTP 403 Forbidden before stream opening
    expect(crossSseResponse.status()).toBe(403);
    const body = await crossSseResponse.text();
    expect(body).toContain("Forbidden");
  });

  // --- 3. Workspace Switching & Private Workspace Invariants ---
  test("should reject workspace switching to unauthorized workspaces and self-joining private workspaces", async ({ page, request }) => {
    await loginAs(page, "useranon1@cspace.com", "password123");
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "collabspace_session")?.value;
    expect(sessionCookie).toBeDefined();

    // 3.1 Attempt switching to ws-acme (not a member)
    const switchRes = await callAction<{ success: boolean; error?: string }>(
      request,
      "switchWorkspaceAction",
      ["ws-acme"],
      sessionCookie
    );
    expect(switchRes.success).toBe(false);
    expect(switchRes.error).toBe("You are not a member of this workspace.");

    // 3.2 Attempt self-joining a private workspace
    const joinPrivateRes = await callAction<{ success: boolean; error?: string }>(
      request,
      "joinWorkspaceAction",
      ["ws-secret-vault"],
      sessionCookie
    );
    expect(joinPrivateRes.success).toBe(false);
    expect(joinPrivateRes.error).toBe("Private workspaces cannot be self-joined.");

    // 3.3 Missing or nonexistent workspace ID
    const joinNonexistentRes = await callAction<{ success: boolean; error?: string }>(
      request,
      "joinWorkspaceAction",
      ["ws-does-not-exist-999"],
      sessionCookie
    );
    expect(joinNonexistentRes.success).toBe(false);
    expect(joinNonexistentRes.error).toBe("Workspace not found.");
  });

  // --- 4. Cross-Tenant Project & Roster Invariants ---
  test("should prevent cross-tenant project roster manipulation and enforce single-lead invariants", async ({ page, request }) => {
    // Log in as Ava Thompson (Owner of ws-acme)
    await loginAs(page, "ava@acme.com", "password123");
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "collabspace_session")?.value;
    expect(sessionCookie).toBeDefined();

    // 4.1 Cannot assign a user from outside ws-acme (e.g. useranon1 who is only in ws-collabspace)
    const crossAssignRes = await callAction<{ success: boolean; error?: string }>(
      request,
      "assignProjectMemberAction",
      [{
        projectId: "brand-refresh",
        userId: "usr-useranon1",
        role: "contributor",
      }],
      sessionCookie
    );
    expect(crossAssignRes.success).toBe(false);
    expect(crossAssignRes.error).toBe("User is not a member of this workspace.");

    // 4.2 Cannot create a project with owner or members from outside the workspace
    const crossCreateRes = await callAction<{ success: boolean; error?: string }>(
      request,
      "createProjectAction",
      [{
        name: "Malicious Project",
        ownerUserId: "usr-useranon1",
      }],
      sessionCookie
    );
    expect(crossCreateRes.success).toBe(false);
    expect(crossCreateRes.error).toBe("Project lead must be a member of this workspace.");

    // 4.3 Cannot remove the project lead directly without reassigning
    const leadMember = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, "brand-refresh"))
      .limit(10);
    const lead = leadMember.find((m) => m.role === "lead");
    expect(lead).toBeDefined();

    const removeLeadRes = await callAction<{ success: boolean; error?: string }>(
      request,
      "removeProjectMemberAction",
      ["brand-refresh", lead!.id],
      sessionCookie
    );
    expect(removeLeadRes.success).toBe(false);
    expect(removeLeadRes.error).toBe("Cannot remove the project lead. Reassign the project lead before removing.");

    // 4.4 Cannot remove member using an ID from a different project
    const crossRemoveRes = await callAction<{ success: boolean; error?: string }>(
      request,
      "removeProjectMemberAction",
      ["brand-refresh", "pm-mobile-app-launch-0"],
      sessionCookie
    );
    expect(crossRemoveRes.success).toBe(false);
    expect(crossRemoveRes.error).toBe("Project member not found in this project.");
  });

  // --- 5. Direct Message Read Isolation & Sender Spoofing Prevention ---
  test("should enforce DM privacy from 3rd party workspace members and bind sender identity", async ({ page, request, browser }) => {
    // 5.1 Sender spoofing check: Log in as Ava Thompson, call sendMessageAction with sender "MaliciousSpoofer"
    await loginAs(page, "ava@acme.com", "password123");
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "collabspace_session")?.value;
    expect(sessionCookie).toBeDefined();

    const sendRes = await callAction<{ success: boolean; id?: string; sender?: string }>(
      request,
      "sendMessageAction",
      ["conv-dm-leo", "MaliciousSpoofer", "Real message from Ava"],
      sessionCookie
    );
    expect(sendRes.success).toBe(true);
    expect(sendRes.sender).toBe("Ava Thompson"); // Proves sender was bound to caller, NOT the argument!

    // Verify stored message in database
    const [storedMsg] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, sendRes.id!))
      .limit(1);
    expect(storedMsg.sender).toBe("Ava Thompson");

    // 5.2 DM Read Isolation: Log in as Mia Chen (member of ws-acme, but NOT in conv-dm-leo)
    await page.context().clearCookies();
    await loginAs(page, "mia@acme.com", "password123");
    const miaCookies = await page.context().cookies();
    const miaCookie = miaCookies.find((c) => c.name === "collabspace_session")?.value;
    expect(miaCookie).toBeDefined();

    const liveConvsRes = await callAction<{ success: boolean; conversations?: { id: string }[] }>(
      request,
      "getLiveConversationsAction",
      ["ws-acme"],
      miaCookie
    );
    expect(liveConvsRes.success).toBe(true);
    if (!liveConvsRes.success || !liveConvsRes.conversations) throw new Error("Expected live conversations to succeed");
    const visibleDmIds = liveConvsRes.conversations.map((c) => c.id);
    expect(visibleDmIds).not.toContain("conv-dm-leo"); // Mia MUST NOT see Ava-Leo DM!

    // 5.3 Mia cannot send messages to Ava-Leo DM
    const miaSendRes = await callAction<{ success: boolean; error?: string }>(
      request,
      "sendMessageAction",
      ["conv-dm-leo", "Mia", "I should not be able to talk here"],
      miaCookie
    );
    expect(miaSendRes.success).toBe(false);
    expect(miaSendRes.error).toContain("Access denied");

    // 5.4 Self-DMs are strictly rejected
    const selfDmRes = await callAction<{ success: boolean; error?: string }>(
      request,
      "createConversationAction",
      [{
        name: "Mia Self DM",
        type: "direct",
        recipientId: "usr-mia",
      }],
      miaCookie
    );
    expect(selfDmRes.success).toBe(false);
    expect(selfDmRes.error).toBe("Cannot start a direct conversation with yourself.");

    // 5.5 Dual-participant SSE isolation proof
    // Leo and Mia open SSE streams to ws-acme.
    // Ava sends DM to Leo -> Leo receives event, Mia receives zero events.
    // Ava sends channel message to conv-general -> Both Leo and Mia receive event.
    const leoContext = await browser.newContext();
    const leoPage = await leoContext.newPage();
    await loginAs(leoPage, "leo@starlight.com", "password123");
    const leoCookies = await leoContext.cookies();
    const leoCookie = leoCookies.find((c) => c.name === "collabspace_session")?.value;
    expect(leoCookie).toBeDefined();

    const sseUrl = "http://127.0.0.1:3001/api/messages/events?workspaceId=ws-acme";
    const leoStream = startSseCollector(sseUrl, leoCookie!);
    const miaStream = startSseCollector(sseUrl, miaCookie!);

    try {
      await Promise.all([
        leoStream.waitUntilConnected(),
        miaStream.waitUntilConnected(),
      ]);

      // 5.5.1 Ava sends DM to Leo
      const uniqueDmText = `Secret DM Ava-Leo ${Date.now()}`;
      const sendDmRes = await callAction<{ success: boolean; id?: string }>(
        request,
        "sendMessageAction",
        ["conv-dm-leo", "Ava Thompson", uniqueDmText],
        sessionCookie
      );
      expect(sendDmRes.success).toBe(true);

      // Verify Leo receives the DM
      const leoDmEvent = await waitForEvent(
        leoStream.events,
        (ev) => ev.conversationId === "conv-dm-leo" && ev.message?.content === uniqueDmText,
        5000
      );
      expect(leoDmEvent).toBeDefined();

      // Give time for any errant event to propagate, then verify Mia received ZERO events for this DM
      await new Promise((r) => setTimeout(r, 600));
      const miaDmEvent = miaStream.events.find(
        (ev) => ev.conversationId === "conv-dm-leo" && ev.message?.content === uniqueDmText
      );
      expect(miaDmEvent).toBeUndefined();

      // 5.5.2 Ava sends channel message to conv-general
      const channelText = `Public channel broadcast ${Date.now()}`;
      const sendChannelRes = await callAction<{ success: boolean; id?: string }>(
        request,
        "sendMessageAction",
        ["conv-general", "Ava Thompson", channelText],
        sessionCookie
      );
      expect(sendChannelRes.success).toBe(true);

      // Both Leo and Mia receive the channel message
      const leoChannelEvent = await waitForEvent(
        leoStream.events,
        (ev) => ev.conversationId === "conv-general" && ev.message?.content === channelText,
        5000
      );
      expect(leoChannelEvent).toBeDefined();

      const miaChannelEvent = await waitForEvent(
        miaStream.events,
        (ev) => ev.conversationId === "conv-general" && ev.message?.content === channelText,
        5000
      );
      expect(miaChannelEvent).toBeDefined();
    } finally {
      leoStream.close();
      miaStream.close();
      await leoContext.close();
    }
  });

  // --- 6. Role Boundaries & Viewer Restrictions ---
  test("should block viewers from creating conversations, sending messages, and creating projects", async ({ page, request }) => {
    // Log in as user viewing CollabSpace: userview1 (role: viewer in ws-collabspace)
    await loginAs(page, "userview1@cspace.com", "password123");
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "collabspace_session")?.value;
    expect(sessionCookie).toBeDefined();

    // 6.1 Viewer cannot create channels
    const createChannelRes = await callAction<{ success: boolean; error?: string }>(
      request,
      "createConversationAction",
      [{
        workspaceId: "ws-collabspace",
        name: "Viewer Channel",
        type: "channel",
      }],
      sessionCookie
    );
    expect(createChannelRes.success).toBe(false);
    expect(createChannelRes.error).toMatch(/Insufficient permissions/i);

    // 6.2 Viewer cannot create projects
    const createProjectRes = await callAction<{ success: boolean; error?: string }>(
      request,
      "createProjectAction",
      [{
        workspaceId: "ws-collabspace",
        name: "Viewer Project",
      }],
      sessionCookie
    );
    expect(createProjectRes.success).toBe(false);
    expect(createProjectRes.error).toMatch(/Insufficient permissions|Viewers cannot create projects/i);
  });

  // --- 7. Scoped User Search & Tampered Cookie Protection ---
  test("should scope user search to workspace and reject tampered workspace context", async ({ page, request }) => {
    await loginAs(page, "useranon1@cspace.com", "password123");
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "collabspace_session")?.value;
    expect(sessionCookie).toBeDefined();

    // 7.1 Search within user's active workspace (ws-collabspace)
    const results = await callAction<{ id: string }[]>(
      request,
      "searchUsersAction",
      ["admin", "ws-collabspace"],
      sessionCookie
    );
    expect(results.length).toBeGreaterThan(0);
    // Ensure all returned members are indeed from ws-collabspace
    expect(results.every((u) => u.id.startsWith("usr-user"))).toBe(true);

    // 7.2 Attempt search with tampered workspaceId the user does not belong to
    const tamperedResults = await callAction<{ id: string }[]>(
      request,
      "searchUsersAction",
      ["admin", "ws-acme"],
      sessionCookie
    );
    expect(tamperedResults).toEqual([]);
  });
});

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

vi.mock("next/headers", async () => {
  const { cookiesMock, headersMock } = await import("./helpers/next-mocks");
  return { cookies: cookiesMock, headers: headersMock };
});
vi.mock("next/cache", async () => {
  const { revalidatePathMock, revalidateTagMock } = await import("./helpers/next-mocks");
  return { revalidatePath: revalidatePathMock, revalidateTag: revalidateTagMock };
});

import { testAuthStorage } from "@/lib/db/auth";
import {
  createCalendarEventAction,
  updateCalendarEventAction,
  deleteCalendarEventAction,
} from "@/app/actions-calendar";
import {
  acceptWorkspaceInviteAction,
  declineWorkspaceInviteAction,
} from "@/app/actions-notifications";
import {
  searchUsersAction,
  searchUsersForInviteAction,
  searchWorkspacesAction,
} from "@/app/actions-search";
import { sendMessageAction } from "@/app/actions-messages";
import {
  createTestDatabase,
  destroyTestDatabase,
  type UnitTestDatabase,
} from "./helpers/test-db";

const now = new Date().toISOString();

let testDb: UnitTestDatabase;

async function seed() {
  const users: [string, string, string][] = [
    ["u_owner", "owner@wsa.test", "Olive Owner"],
    ["u_member", "member@wsa.test", "Manny Member"],
    ["u_viewer", "viewer@wsa.test", "Vera Viewer"],
    ["u_admin", "admin@wsa.test", "Adam Admin"],
    ["u_bmember", "bmember@wsb.test", "Bree Bmember"],
    ["u_jordan", "jordan@wsa.test", "Jordan Alpha"],
    ["u_jonathan", "jonathan@wsb.test", "Jonathan Beta"],
  ];
  for (const [id, email, name] of users) {
    await testDb
      .prepare(
        "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)"
      )
      .run(id, email, name, "hash", now);
  }

  // wsB is private: excluded from workspace discovery
  await testDb
    .prepare(
      "INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run("wsA", "Workspace Alpha", "ws-alpha", "Pro", true, now);
  await testDb
    .prepare(
      "INSERT INTO workspaces (id, name, slug, plan, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run("wsB", "Workspace Bravo", "ws-bravo", "Pro", false, now);

  const members: [string, string, string, string][] = [
    ["wm_a_owner", "wsA", "u_owner", "owner"],
    ["wm_a_member", "wsA", "u_member", "member"],
    ["wm_a_viewer", "wsA", "u_viewer", "viewer"],
    ["wm_a_admin", "wsA", "u_admin", "admin"],
    ["wm_a_jordan", "wsA", "u_jordan", "member"],
    ["wm_b_member", "wsB", "u_bmember", "member"],
    ["wm_b_jonathan", "wsB", "u_jonathan", "member"],
    // Pending invite memberships (u_bmember is invited into wsA; u_jordan into wsB)
    ["wm_a_pending_bree", "wsA", "u_bmember", "member"],
    ["wm_b_pending_jordan", "wsB", "u_jordan", "member"],
  ];
  for (const [id, wsId, userId, role] of members) {
    const status = id.includes("_pending") ? "pending" : "active";
    await testDb
      .prepare(
        "INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at, status) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(id, wsId, userId, role, now, status);
  }

  await testDb
    .prepare(
      `INSERT INTO conversations (id, workspace_id, type, participant_ids, name, initials, color, role, last_message, last_timestamp, unread)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run("conv_a_channel", "wsA", "channel", "[]", "General A", "GA", "bg-blue-500", "Channel", "", now, 0);
  await testDb
    .prepare(
      `INSERT INTO conversations (id, workspace_id, type, participant_ids, name, initials, color, role, last_message, last_timestamp, unread)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run("conv_b_channel", "wsB", "channel", "[]", "General B", "GB", "bg-red-500", "Channel", "", now, 0);

  await testDb
    .prepare(
      "INSERT INTO calendar_events (id, workspace_id, title, date, start_time, category, attendees) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run("ev_a1", "wsA", "Sprint Review", "2026-10-20", "10:00", "meeting", "[]");

  const invites: [string, string, string, string][] = [
    ["n_inv_bree", "u_bmember", "invite", "wsA"],
    ["n_inv_jordan", "u_jordan", "invite", "wsB"],
    ["n_sys_bree", "u_bmember", "system", "wsA"],
  ];
  for (const [id, userId, type, wsId] of invites) {
    const wsName = wsId === "wsA" ? "Workspace Alpha" : "Workspace Bravo";
    await testDb
      .prepare(
        "INSERT INTO notifications (id, user_id, workspace_id, type, title, message, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        id,
        userId,
        wsId,
        type,
        `Invite to ${wsName}`,
        "You have been invited",
        JSON.stringify({ workspaceId: wsId, role: "member", workspaceName: wsName }),
        now
      );
  }
}

beforeAll(async () => {
  testDb = await createTestDatabase();
  await seed();
});

afterAll(async () => {
  await destroyTestDatabase(testDb);
});

describe("calendar event authorization", () => {
  it("workspace members can create events", async () => {
    await testAuthStorage!.run({ userId: "u_member" }, async () => {
      const res = await createCalendarEventAction({
        workspaceId: "wsA",
        title: "Member Created",
        date: "2026-10-21",
        startTime: "11:00",
        category: "meeting",
      });
      expect(res.success).toBe(true);

      const row = await testDb
        .prepare("SELECT id, title FROM calendar_events WHERE id = ?")
        .get(res.id!);
      expect(row?.title).toBe("Member Created");
    });
  });

  it("viewers cannot create events", async () => {
    await testAuthStorage!.run({ userId: "u_viewer" }, async () => {
      const res = await createCalendarEventAction({
        workspaceId: "wsA",
        title: "Viewer Created",
        date: "2026-10-21",
        startTime: "11:00",
        category: "meeting",
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain("Viewers cannot create calendar events.");
    });
  });

  it("non-members cannot create events in foreign workspaces", async () => {
    // u_jonathan has no membership row in wsA at all (u_bmember has a pending one)
    await testAuthStorage!.run({ userId: "u_jonathan" }, async () => {
      const res = await createCalendarEventAction({
        workspaceId: "wsA",
        title: "Intruder Created",
        date: "2026-10-21",
        startTime: "11:00",
        category: "meeting",
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain("Viewers cannot create calendar events.");
    });
  });

  it("viewers and non-members cannot update events; members can", async () => {
    await testAuthStorage!.run({ userId: "u_viewer" }, async () => {
      const res = await updateCalendarEventAction("ev_a1", { title: "Hijacked", date: "2026-10-20", startTime: "10:00", category: "meeting" });
      expect(res.success).toBe(false);
      expect(res.error).toContain("Viewers cannot edit calendar events.");
    });

    await testAuthStorage!.run({ userId: "u_jonathan" }, async () => {
      const res = await updateCalendarEventAction("ev_a1", { title: "Hijacked", date: "2026-10-20", startTime: "10:00", category: "meeting" });
      expect(res.success).toBe(false);
      expect(res.error).toContain("Viewers cannot edit calendar events.");
    });

    await testAuthStorage!.run({ userId: "u_member" }, async () => {
      const res = await updateCalendarEventAction("ev_a1", {
        title: "Sprint Review (Renamed)",
        date: "2026-10-20",
        startTime: "10:00",
        category: "meeting",
      });
      expect(res.success).toBe(true);

      const row = await testDb
        .prepare("SELECT title FROM calendar_events WHERE id = 'ev_a1'")
        .get();
      expect(row?.title).toBe("Sprint Review (Renamed)");
    });
  });

  it("viewers and non-members cannot delete events; members can", async () => {
    await testAuthStorage!.run({ userId: "u_viewer" }, async () => {
      const res = await deleteCalendarEventAction("ev_a1");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Viewers cannot delete calendar events.");
    });

    await testAuthStorage!.run({ userId: "u_jonathan" }, async () => {
      const res = await deleteCalendarEventAction("ev_a1");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Viewers cannot delete calendar events.");
    });

    // Event must still exist after all denied attempts
    const stillThere = await testDb
      .prepare("SELECT id FROM calendar_events WHERE id = 'ev_a1'")
      .get();
    expect(Boolean(stillThere)).toBe(true);

    await testAuthStorage!.run({ userId: "u_member" }, async () => {
      const res = await deleteCalendarEventAction("ev_a1");
      expect(res.success).toBe(true);
    });

    const gone = await testDb
      .prepare("SELECT id FROM calendar_events WHERE id = 'ev_a1'")
      .get();
    expect(!gone).toBe(true);
  });
});

describe("workspace invite lifecycle", () => {
  it("invite notifications are scoped to their recipient", async () => {
    await testAuthStorage!.run({ userId: "u_owner" }, async () => {
      const res = await acceptWorkspaceInviteAction("n_inv_bree");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Notification not found.");
    });
  });

  it("accepting an invite activates the pending membership", async () => {
    await testAuthStorage!.run({ userId: "u_bmember" }, async () => {
      const res = await acceptWorkspaceInviteAction("n_inv_bree");
      expect(res.success).toBe(true);
      expect(res.workspaceId).toBe("wsA");

      const membership = (await testDb
        .prepare(
          "SELECT status FROM workspace_members WHERE workspace_id = 'wsA' AND user_id = 'u_bmember'"
        )
        .get()) as { status: string };
      expect(membership.status).toBe("active");

      const notif = (await testDb
        .prepare("SELECT is_read, data FROM notifications WHERE id = 'n_inv_bree'")
        .get()) as { is_read: boolean; data: string };
      expect(notif.is_read).toBe(true);
      expect(JSON.parse(notif.data).status).toBe("accepted");
    });
  });

  it("declining an invite removes the pending membership", async () => {
    await testAuthStorage!.run({ userId: "u_jordan" }, async () => {
      const res = await declineWorkspaceInviteAction("n_inv_jordan");
      expect(res.success).toBe(true);

      // The pending wsB membership is removed; the active wsA membership is untouched
      const pending = await testDb
        .prepare(
          "SELECT id FROM workspace_members WHERE workspace_id = 'wsB' AND user_id = 'u_jordan'"
        )
        .get();
      expect(!pending).toBe(true);

      const stillMember = await testDb
        .prepare(
          "SELECT id FROM workspace_members WHERE workspace_id = 'wsA' AND user_id = 'u_jordan'"
        )
        .get();
      expect(Boolean(stillMember)).toBe(true);

      const notif = (await testDb
        .prepare("SELECT is_read, data FROM notifications WHERE id = 'n_inv_jordan'")
        .get()) as { is_read: boolean; data: string };
      expect(notif.is_read).toBe(true);
      expect(JSON.parse(notif.data).status).toBe("declined");
    });
  });

  it("non-invite notifications cannot be accepted", async () => {
    await testAuthStorage!.run({ userId: "u_bmember" }, async () => {
      const res = await acceptWorkspaceInviteAction("n_sys_bree");
      expect(res.success).toBe(false);
      expect(res.error).toContain("This notification is not an invitation.");
    });
  });
});

describe("search tenant scoping", () => {
  it("user search only returns members of the target workspace", async () => {
    await testAuthStorage!.run({ userId: "u_member" }, async () => {
      const results = await searchUsersAction("jo", "wsA");
      const ids = results.map((u) => u.id);
      expect(ids).toContain("u_jordan");
      expect(ids).not.toContain("u_jonathan");
    });
  });

  it("user search rejects a workspace the caller does not belong to", async () => {
    await testAuthStorage!.run({ userId: "u_member" }, async () => {
      // u_member belongs to wsA only; wsB is tampered into the argument
      const results = await searchUsersAction("jo", "wsB");
      expect(results).toEqual([]);
    });
  });

  it("invite search requires owner or admin role", async () => {
    await testAuthStorage!.run({ userId: "u_member" }, async () => {
      const results = await searchUsersForInviteAction("jo", "wsA");
      expect(results).toEqual([]);
    });

    await testAuthStorage!.run({ userId: "u_admin" }, async () => {
      // Admin sees non-members matching the query (existing members excluded)
      const results = await searchUsersForInviteAction("jo", "wsA");
      const ids = results.map((u) => u.id);
      expect(ids).toContain("u_jonathan");
      expect(ids).not.toContain("u_jordan");
    });
  });

  it("workspace discovery only returns public workspaces", async () => {
    const results = await searchWorkspacesAction("workspace");
    const ids = results.map((w) => w.id);
    expect(ids).toContain("wsA");
    expect(ids).not.toContain("wsB");
  });
});

describe("cross-workspace messaging", () => {
  it("non-members cannot send to another workspace's channel", async () => {
    await testAuthStorage!.run({ userId: "u_member" }, async () => {
      const res = await sendMessageAction("conv_b_channel", "Spoofed", "Cross-tenant post");
      expect(res.success).toBe(false);
    });
  });

  it("viewers cannot send messages in their own workspace", async () => {
    await testAuthStorage!.run({ userId: "u_viewer" }, async () => {
      const res = await sendMessageAction("conv_a_channel", "Spoofed", "Viewer post");
      expect(res.success).toBe(false);
    });
  });

  it("member sends succeed and the sender identity is bound to the session user", async () => {
    await testAuthStorage!.run({ userId: "u_member" }, async () => {
      const res = await sendMessageAction("conv_a_channel", "Spoofed Name", "Legit post");
      expect(res.success).toBe(true);

      const msg = (await testDb
        .prepare(
          "SELECT sender, content FROM messages WHERE conversation_id = 'conv_a_channel' ORDER BY timestamp DESC LIMIT 1"
        )
        .get()) as { sender: string; content: string };
      // Never trusts the client-supplied sender argument
      expect(msg.sender).toBe("Manny Member");
      expect(msg.content).toBe("Legit post");

      const conv = (await testDb
        .prepare("SELECT last_message FROM conversations WHERE id = 'conv_a_channel'")
        .get()) as { last_message: string };
      expect(conv.last_message).toBe("Legit post");
    });
  });
});

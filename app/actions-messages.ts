"use server";

import { safeRevalidatePath } from "./actions-shared";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getConversations } from "@/lib/db/queries";
import { messageBus } from "@/lib/events/message-bus";
import { users, conversations, messages } from "@/lib/db/schema";
import { getActiveWorkspaceId } from "@/lib/db/workspace";
import { AuthError, requireUser, requireWorkspaceMember, requireWorkspaceRole, getTargetWorkspaceMembership } from "@/lib/db/auth";
import { classifyConversation, validateDirectConversation } from "@/lib/auth/dm-validator";
import { newId } from "@/lib/id";

// --- Messages Actions ---
export async function sendMessageAction(conversationId: string, _sender: string, content: string) {
  try {
    const currentUser = await requireUser();

    if (!conversationId || typeof conversationId !== "string") {
      return { success: false, error: "A valid conversation ID is required." };
    }

    if (!content || !content.trim()) {
      return { success: false, error: "Message content cannot be empty." };
    }

    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conv) {
      return { success: false, error: "Conversation not found." };
    }

    const classification = classifyConversation(conv);
    if (classification === "invalid") {
      return { success: false, error: "Invalid conversation type." };
    }

    // Viewers cannot send messages
    await requireWorkspaceRole(conv.workspaceId, ["owner", "admin", "member"]);

    // If DM, enforce shared canonical DM validation fail-closed
    if (classification === "direct") {
      const dmCheck = await validateDirectConversation(conv, currentUser.id);
      if (!dmCheck.valid) {
        return { success: false, error: "Access denied. You are not an authorized participant in this conversation." };
      }
    }

    // Sender identity is strictly bound to authenticated currentUser.name (never trust _sender)
    const effectiveSender = currentUser.name;
    const msgId = newId("m");
    const timestamp = new Date().toISOString();

    await db.insert(messages).values({
      id: msgId,
      conversationId,
      sender: effectiveSender,
      content: content.trim(),
      timestamp,
    });

    await db
      .update(conversations)
      .set({
        lastMessage: content.trim(),
        lastTimestamp: timestamp,
        unread: 0,
      })
      .where(eq(conversations.id, conversationId));

    // Broadcast real-time message event to connected workspace clients
    let pIds: string[] | undefined = undefined;
    if (conv.type === "direct") {
      try {
        const parsed = JSON.parse(conv.participantIds || "[]");
        if (Array.isArray(parsed)) pIds = parsed;
      } catch {}
    }

    messageBus.publishMessage({
      type: "new_message",
      workspaceId: conv.workspaceId,
      conversationId,
      message: {
        id: msgId,
        sender: effectiveSender,
        content: content.trim(),
        timestamp,
      },
      participantIds: pIds && pIds.length > 0 ? pIds : undefined,
    });

    safeRevalidatePath("/messages");
    return { success: true, id: msgId, sender: effectiveSender, timestamp };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: err instanceof Error ? err.message : "Failed to send message." };
  }
}

export async function getLiveConversationsAction(workspaceId?: string) {
  try {
    const currentUser = await requireUser();
    const wsId = workspaceId ?? (await getActiveWorkspaceId());
    if (!wsId) return { success: false, error: "No active workspace." };

    await requireWorkspaceMember(wsId);

    const convs = await getConversations(wsId, currentUser.id);
    return { success: true, conversations: convs };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: err instanceof Error ? err.message : "Failed to load conversations." };
  }
}

export async function createConversationAction(data: {
  workspaceId?: string;
  name: string;
  initialMessage?: string;
  role?: string;
  color?: string;
  type?: "channel" | "direct";
  recipientId?: string;
}) {
  try {
    const currentUser = await requireUser();
    const wsId = data.workspaceId ?? (await getActiveWorkspaceId());
    if (!wsId) return { success: false, error: "No active workspace." };

    // Viewers cannot create conversations (channels or DMs)
    await requireWorkspaceRole(wsId, ["owner", "admin", "member"]);

    const convType = data.type || (data.recipientId ? "direct" : "channel");
    if (convType !== "channel" && convType !== "direct") {
      return { success: false, error: "Invalid conversation type." };
    }

    const trimmedName = data.name?.trim() || "";

    if (convType === "channel") {
      if (data.recipientId) {
        return { success: false, error: "Channel conversations cannot specify a recipient." };
      }
      if (!trimmedName) {
        return { success: false, error: "Channel name is required." };
      }

      // Check if channel with this exact name already exists in this workspace
      const [existing] = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.workspaceId, wsId), eq(conversations.name, trimmedName)))
        .limit(1);

      if (existing) {
        if (data.initialMessage?.trim()) {
          await sendMessageAction(existing.id, currentUser.name, data.initialMessage.trim());
        }
        return { success: true, id: existing.id, isExisting: true };
      }

      const id = newId("conv");
      const now = new Date().toISOString();
      const initials = (trimmedName.split(" ")[0]?.[0] ?? "").toUpperCase() || "#";

      await db.insert(conversations).values({
        id,
        workspaceId: wsId,
        type: "channel",
        participantIds: "[]",
        name: trimmedName,
        initials,
        color: data.color || "bg-violet-500",
        role: data.role?.trim() || "Team Channel",
        online: false,
        lastMessage: data.initialMessage?.trim() || "",
        lastTimestamp: now,
        unread: 0,
      });

      if (data.initialMessage?.trim()) {
        await sendMessageAction(id, currentUser.name, data.initialMessage.trim());
      }

      safeRevalidatePath("/messages");
      return { success: true, id, isExisting: false };
    }

    // Direct Conversation
    if (!data.recipientId || typeof data.recipientId !== "string" || !data.recipientId.trim()) {
      return { success: false, error: "Direct conversations require a recipient." };
    }

    if (data.recipientId === currentUser.id) {
      return { success: false, error: "Cannot start a direct conversation with yourself." };
    }

    // Recipient must be an active member of this workspace
    const recipientMember = await getTargetWorkspaceMembership(wsId, data.recipientId);
    if (!recipientMember) {
      return { success: false, error: "Recipient is not a member of this workspace." };
    }

    const [recipientUser] = await db.select().from(users).where(eq(users.id, data.recipientId)).limit(1);
    if (!recipientUser) {
      return { success: false, error: "Recipient not found." };
    }

    // Canonical sorted participant array
    const canonicalParticipants = [currentUser.id, data.recipientId].sort();
    const participantsJson = JSON.stringify(canonicalParticipants);

    // Look for existing direct conversation between these exact two participants in wsId
    // Filter candidates through shared classifier and canonical validator
    const wsConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.workspaceId, wsId));

    let existingDm: typeof wsConversations[number] | undefined;
    for (const c of wsConversations) {
      const classification = classifyConversation(c);
      if (classification !== "direct") continue;

      const dmCheck = await validateDirectConversation(c, currentUser.id);
      if (!dmCheck.valid || !dmCheck.participantIds) continue;

      if (
        dmCheck.participantIds.length === 2 &&
        dmCheck.participantIds.includes(currentUser.id) &&
        dmCheck.participantIds.includes(data.recipientId!)
      ) {
        existingDm = c;
        break;
      }
    }

    if (existingDm) {
      if (data.initialMessage?.trim()) {
        await sendMessageAction(existingDm.id, currentUser.name, data.initialMessage.trim());
      }
      return { success: true, id: existingDm.id, isExisting: true };
    }

    const id = newId("conv");
    const now = new Date().toISOString();
    const displayName = recipientUser.name;
    const initials =
      (displayName.split(" ")[0]?.[0] ?? "") +
      (displayName.split(" ")[1]?.[0] ?? displayName[1] ?? "").toUpperCase();

    await db.insert(conversations).values({
      id,
      workspaceId: wsId,
      type: "direct",
      participantIds: participantsJson,
      name: displayName,
      initials: initials || "DM",
      color: recipientUser.avatar || "bg-cyan-500",
      role: recipientMember.role || "Direct Message",
      online: false,
      lastMessage: data.initialMessage?.trim() || "",
      lastTimestamp: now,
      unread: 0,
    });

    if (data.initialMessage?.trim()) {
      await sendMessageAction(id, currentUser.name, data.initialMessage.trim());
    }

    safeRevalidatePath("/messages");
    return { success: true, id, isExisting: false };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: err instanceof Error ? err.message : "Failed to create conversation." };
  }
}

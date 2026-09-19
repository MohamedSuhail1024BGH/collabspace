import { and, eq, inArray } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db";
import { workspaceMembers, type DbConversation } from "@/lib/db/schema";

export type ConversationClassification = "direct" | "channel" | "invalid";

/**
 * Shared canonical conversation classifier.
 * Tri-state: "direct" | "channel" | "invalid".
 *
 * Rules:
 * 1. Stored `type` takes strict precedence:
 *    - "direct" -> "direct"
 *    - "channel" -> "channel"
 * 2. Legacy ID prefix fallback ONLY when `type` is omitted/null/undefined/empty:
 *    - starts with "conv-dm-" -> "direct"
 *    - starts with "conv-channel-" -> "channel"
 * 3. Unknown, unexpected, or malformed types (e.g. "admin", "group", "foo")
 *    fail closed as "invalid".
 */
export function classifyConversation(conv: {
  type?: string | null;
  id?: string | null;
}): ConversationClassification {
  if (conv.type === "direct") return "direct";
  if (conv.type === "channel") return "channel";

  if (conv.type === null || conv.type === undefined || conv.type === "") {
    if (typeof conv.id === "string" && conv.id.startsWith("conv-dm-")) {
      return "direct";
    }
    if (typeof conv.id === "string" && conv.id.startsWith("conv-channel-")) {
      return "channel";
    }
  }

  return "invalid";
}

export function isDirectConversation(conv: {
  type?: string | null;
  id?: string | null;
}): boolean {
  return classifyConversation(conv) === "direct";
}

export type DirectConversationInput = Pick<
  DbConversation,
  "id" | "workspaceId" | "type" | "participantIds"
>;

export interface DMValidationSuccess {
  valid: true;
  participantIds: [string, string];
  otherUserId: string;
}

export interface DMValidationFailure {
  valid: false;
  reason: string;
}

export type DMValidationResult = DMValidationSuccess | DMValidationFailure;

/**
 * Shared canonical validator for direct conversations.
 * Used consistently across reads (getConversations), writes (sendMessageAction),
 * and live streaming subscriptions (SSE /api/messages/events).
 *
 * Requirements:
 * 1. Conversation must classify as "direct".
 * 2. participantIds must safely parse into an array of exactly 2 distinct non-empty string IDs.
 * 3. The caller (callerUserId) must be one of those two participants.
 * 4. Both participants must currently be confirmed members of conversation.workspaceId in the authoritative DB.
 * 5. Fails closed immediately on any violation or malformed data.
 */
export async function validateDirectConversation(
  conv: DirectConversationInput,
  callerUserId: string,
  customDb?: typeof defaultDb
): Promise<DMValidationResult> {
  const activeDb = customDb || defaultDb;

  if (classifyConversation(conv) !== "direct") {
    return { valid: false, reason: "Conversation is not a direct message." };
  }

  if (!conv.workspaceId) {
    return { valid: false, reason: "Conversation missing workspaceId." };
  }

  if (!callerUserId) {
    return { valid: false, reason: "Caller user ID is required." };
  }

  // Safely parse participantIds
  let parsed: unknown;
  try {
    parsed = JSON.parse(conv.participantIds || "[]");
  } catch {
    return { valid: false, reason: "Malformed participantIds JSON." };
  }

  // Must be an array of exactly 2 items
  if (!Array.isArray(parsed) || parsed.length !== 2) {
    return {
      valid: false,
      reason: "Direct conversation must contain exactly two participants.",
    };
  }

  const [u1, u2] = parsed;
  if (
    typeof u1 !== "string" ||
    typeof u2 !== "string" ||
    !u1.trim() ||
    !u2.trim()
  ) {
    return {
      valid: false,
      reason: "Participant IDs must be non-empty strings.",
    };
  }

  // Must be two distinct users (reject self-DMs or duplicates)
  if (u1 === u2) {
    return {
      valid: false,
      reason: "Direct conversation cannot have duplicate participants.",
    };
  }

  // Caller must be one of the two participants
  if (callerUserId !== u1 && callerUserId !== u2) {
    return {
      valid: false,
      reason: "Caller is not a participant in this direct conversation.",
    };
  }

  // Authoritative check against workspace_members in SQLite DB
  const memberRows = await activeDb
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, conv.workspaceId),
        inArray(workspaceMembers.userId, [u1, u2])
      )
    );

  if (memberRows.length !== 2) {
    return {
      valid: false,
      reason:
        "One or both participants are not active members of this workspace.",
    };
  }

  const otherUserId = callerUserId === u1 ? u2 : u1;
  const canonicalParticipants: [string, string] = [u1, u2];

  return {
    valid: true,
    participantIds: canonicalParticipants,
    otherUserId,
  };
}

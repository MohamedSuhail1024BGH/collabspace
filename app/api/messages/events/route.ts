import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/db/auth";
import { db } from "@/lib/db";
import { conversations, workspaceMembers } from "@/lib/db/schema";
import { messageBus, MessageEventPayload } from "@/lib/events/message-bus";
import { classifyConversation, validateDirectConversation } from "@/lib/auth/dm-validator";
import { presenceTracker } from "@/lib/events/presence";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId");

  if (!workspaceId || !workspaceId.trim()) {
    return new Response("Missing workspaceId", { status: 400 });
  }

  // 1. Authenticate caller
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Authorize workspace membership
  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, currentUser.id)
      )
    )
    .limit(1);

  if (!membership) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();

  let cleanup: (() => void) | null = null;
  let heartbeat: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Register presence for this active user
      presenceTracker.addConnection(workspaceId, currentUser.id);

      // Send initial connection confirmation
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
      );

      // Send initial presence snapshot for the workspace
      const onlineUserIds = presenceTracker.getOnlineUserIds(workspaceId);
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "presence_snapshot", onlineUserIds })}\n\n`
        )
      );

      // Subscribe to message & presence events for this workspace
      const unsubscribe = messageBus.subscribe(
        workspaceId,
        async (payload: MessageEventPayload) => {
          try {
            // Forward presence events directly to workspace members
            if (payload.type === "presence") {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
              );
              return;
            }

            if (!payload.conversationId) return;

            // Never trust event payload metadata alone; verify against authoritative DB
            const [conv] = await db
              .select()
              .from(conversations)
              .where(
                and(
                  eq(conversations.id, payload.conversationId),
                  eq(conversations.workspaceId, workspaceId)
                )
              )
              .limit(1);

            if (!conv) return;

            const classification = classifyConversation(conv);
            if (classification === "invalid") {
              // Unknown/malformed type -> drop event completely
              return;
            }

            // If direct message, validate via canonical DM validator
            if (classification === "direct") {
              const dmCheck = await validateDirectConversation(conv, currentUser.id);
              if (!dmCheck.valid) {
                // Not authorized or corrupt DM -> drop event completely
                return;
              }
            }

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
            );
          } catch {
            // Stream might be closed
          }
        }
      );

      // Keep connection alive with periodic comments and presence touch
      heartbeat = setInterval(() => {
        try {
          presenceTracker.touchPresence(workspaceId, currentUser.id);
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          // Stream might be closed
        }
      }, 15000);

      cleanup = () => {
        unsubscribe();
        if (heartbeat) clearInterval(heartbeat);
        presenceTracker.removeConnection(workspaceId, currentUser.id);
      };

      // Handle client disconnect
      req.signal.addEventListener("abort", () => {
        cleanup?.();
        try {
          controller.close();
        } catch {
          // Ignore
        }
      });
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

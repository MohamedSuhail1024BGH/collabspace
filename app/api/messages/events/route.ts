import { getCurrentUser } from "@/lib/db/auth";
import { messageBus, MessageEventPayload } from "@/lib/events/message-bus";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId");

  if (!workspaceId) {
    return new Response("Missing workspaceId", { status: 400 });
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  let cleanup: (() => void) | null = null;
  let heartbeat: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection confirmation
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
      );

      // Subscribe to message events for this workspace
      const unsubscribe = messageBus.subscribe(
        workspaceId,
        (payload: MessageEventPayload) => {
          try {
            // If the message is a private DM, only deliver if current user is a participant
            if (
              payload.participantIds &&
              payload.participantIds.length > 0 &&
              !payload.participantIds.includes(currentUser.id)
            ) {
              return;
            }

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
            );
          } catch {
            // Stream might be closed
          }
        }
      );

      // Keep connection alive with periodic comments
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          // Stream might be closed
        }
      }, 15000);

      cleanup = () => {
        unsubscribe();
        if (heartbeat) clearInterval(heartbeat);
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

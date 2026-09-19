import { EventEmitter } from "events";

export type RealtimeMessage = {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
};

export type MessageEventPayload = {
  type: "new_message";
  workspaceId: string;
  conversationId: string;
  message: RealtimeMessage;
  participantIds?: string[];
};

class MessageBus {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100);
  }

  publishMessage(payload: MessageEventPayload) {
    this.emitter.emit(`workspace:${payload.workspaceId}`, payload);
  }

  subscribe(
    workspaceId: string,
    listener: (payload: MessageEventPayload) => void
  ): () => void {
    const eventName = `workspace:${workspaceId}`;
    this.emitter.on(eventName, listener);
    return () => {
      this.emitter.off(eventName, listener);
    };
  }
}

// Attach to globalThis to preserve singleton across Next.js bundles and HMR/Turbopack reloads
const globalForBus = globalThis as unknown as {
  __messageBus?: MessageBus;
};

if (!globalForBus.__messageBus) {
  globalForBus.__messageBus = new MessageBus();
}

export const messageBus = globalForBus.__messageBus;


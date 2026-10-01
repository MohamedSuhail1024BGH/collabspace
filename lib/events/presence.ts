import { messageBus } from "./message-bus";

interface UserPresenceState {
  connections: number;
  lastActiveAt: number;
  disconnectTimer?: NodeJS.Timeout;
}

class PresenceTracker {
  // workspaceId -> Map<userId, UserPresenceState>
  private workspaces = new Map<string, Map<string, UserPresenceState>>();

  private getWorkspaceMap(workspaceId: string): Map<string, UserPresenceState> {
    let ws = this.workspaces.get(workspaceId);
    if (!ws) {
      ws = new Map();
      this.workspaces.set(workspaceId, ws);
    }
    return ws;
  }

  /**
   * Registers an active connection for a user in a workspace.
   * Cancels any pending disconnect grace timer.
   * If the user was offline, broadcasts online: true via messageBus.
   */
  addConnection(workspaceId: string, userId: string): void {
    if (!workspaceId || !userId) return;
    const wsMap = this.getWorkspaceMap(workspaceId);
    const existing = wsMap.get(userId);

    if (existing?.disconnectTimer) {
      clearTimeout(existing.disconnectTimer);
      existing.disconnectTimer = undefined;
    }

    const wasOnline = Boolean(existing && existing.connections > 0);

    if (existing) {
      existing.connections += 1;
      existing.lastActiveAt = Date.now();
    } else {
      wsMap.set(userId, {
        connections: 1,
        lastActiveAt: Date.now(),
      });
    }

    if (!wasOnline) {
      messageBus.publishMessage({
        type: "presence",
        workspaceId,
        userId,
        online: true,
      });
    }
  }

  /**
   * Removes a connection for a user in a workspace.
   * Uses a 2500ms grace period to prevent flickering during tab refresh or route transitions.
   * If all connections drop, broadcasts online: false via messageBus.
   */
  removeConnection(workspaceId: string, userId: string): void {
    if (!workspaceId || !userId) return;
    const wsMap = this.getWorkspaceMap(workspaceId);
    const existing = wsMap.get(userId);
    if (!existing) return;

    existing.connections = Math.max(0, existing.connections - 1);
    existing.lastActiveAt = Date.now();

    if (existing.connections === 0) {
      if (existing.disconnectTimer) {
        clearTimeout(existing.disconnectTimer);
      }

      existing.disconnectTimer = setTimeout(() => {
        const current = wsMap.get(userId);
        if (current && current.connections === 0) {
          wsMap.delete(userId);
          messageBus.publishMessage({
            type: "presence",
            workspaceId,
            userId,
            online: false,
          });
        }
      }, 2500);
    }
  }

  /**
   * Checks whether a specific user is currently active/online in a workspace.
   */
  isUserOnline(workspaceId?: string, userId?: string): boolean {
    if (!workspaceId || !userId) return false;
    const wsMap = this.workspaces.get(workspaceId);
    if (!wsMap) return false;
    const state = wsMap.get(userId);
    if (!state) return false;
    return state.connections > 0;
  }

  /**
   * Returns a list of user IDs currently active/online in a workspace.
   */
  getOnlineUserIds(workspaceId?: string): string[] {
    if (!workspaceId) return [];
    const wsMap = this.workspaces.get(workspaceId);
    if (!wsMap) return [];
    const result: string[] = [];
    for (const [userId, state] of wsMap.entries()) {
      if (state.connections > 0) {
        result.push(userId);
      }
    }
    return result;
  }

  /**
   * Keep-alive touch for heartbeat calls.
   */
  touchPresence(workspaceId: string, userId: string): void {
    if (!workspaceId || !userId) return;
    const wsMap = this.getWorkspaceMap(workspaceId);
    const existing = wsMap.get(userId);
    if (existing) {
      existing.lastActiveAt = Date.now();
    } else {
      this.addConnection(workspaceId, userId);
    }
  }

  /**
   * Clears all presence state. Intended for testing.
   */
  clearAllForTesting(): void {
    for (const wsMap of this.workspaces.values()) {
      for (const state of wsMap.values()) {
        if (state.disconnectTimer) {
          clearTimeout(state.disconnectTimer);
        }
      }
      wsMap.clear();
    }
    this.workspaces.clear();
  }
}

// Attach to globalThis to preserve singleton across Next.js bundles and fast refresh
const globalForPresence = globalThis as unknown as {
  __presenceTracker?: PresenceTracker;
};

if (!globalForPresence.__presenceTracker) {
  globalForPresence.__presenceTracker = new PresenceTracker();
}

export const presenceTracker = globalForPresence.__presenceTracker;

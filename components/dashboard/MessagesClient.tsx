"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  sendMessageAction,
  createConversationAction,
  getLiveConversationsAction,
} from "@/app/actions";
import ChatHeader from "@/components/dashboard/ChatHeader";
import ConversationItem from "@/components/dashboard/ConversationItem";
import MessageComposer from "@/components/dashboard/MessageComposer";
import MessageList from "@/components/dashboard/MessageList";
import type { Conversation, Message } from "@/data/mock-data";
import type { FullConversation } from "@/lib/db/queries";
import type { WorkspaceMemberItem } from "@/components/dashboard/EventForm";

function toConversation(c: FullConversation): Conversation {
  let parsedParticipantIds: string[] = [];
  try {
    parsedParticipantIds = JSON.parse(c.participantIds || "[]");
  } catch {
    parsedParticipantIds = [];
  }

  return {
    id: c.id,
    type: (c.type as "channel" | "direct") || "channel",
    participantIds: parsedParticipantIds,
    name: c.name,
    initials: c.initials,
    color: c.color,
    role: c.role,
    online: c.online,
    lastMessage: c.lastMessage,
    lastTimestamp: c.lastTimestamp,
    unread: c.unread,
    messages: c.messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      content: m.content,
      timestamp: m.timestamp,
    })),
  };
}

export function MessagesClient({
  initialConversations,
  currentUser,
  workspaceMembers = [],
  workspaceId,
}: {
  initialConversations: FullConversation[];
  currentUser?: { id: string; name: string; email: string };
  workspaceMembers?: WorkspaceMemberItem[];
  workspaceId?: string;
}) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    initialConversations.map(toConversation),
  );
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(
    () => initialConversations[0]?.id ?? null,
  );
  const [filterType, setFilterType] = useState<"all" | "channels" | "direct">("all");
  const [showListOnMobile, setShowListOnMobile] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatTab, setNewChatTab] = useState<"direct" | "channel">("direct");
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDescription, setNewChannelDescription] = useState("");
  const [newChannelInitialMessage, setNewChannelInitialMessage] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [, startTransition] = useTransition();

  // Keep activeIdRef in sync to avoid tearing down EventSource on conversation selection changes
  const activeIdRef = useRef(activeId);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // Sync state when initialConversations changes
  useEffect(() => {
    setConversations(initialConversations.map(toConversation));
  }, [initialConversations]);

  // Real-time message streaming via Server-Sent Events (SSE) + fallback polling heartbeat
  useEffect(() => {
    if (!workspaceId) return;
    let isMounted = true;

    // Helper to fetch live conversations
    const syncLiveConversations = async () => {
      try {
        const res = await getLiveConversationsAction(workspaceId);
        if (res.success && res.conversations && isMounted) {
          setConversations((prev) => {
            return res.conversations.map((liveConv) => {
              const mapped = toConversation(liveConv);
              // Preserve unread status = 0 if it's currently active in the UI
              if (mapped.id === activeIdRef.current) {
                return { ...mapped, unread: 0 };
              }
              return mapped;
            });
          });
        }
      } catch {
        // Ignore background sync errors
      }
    };

    // 1. Establish Server-Sent Events (SSE) stream
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(
        `/api/messages/events?workspaceId=${encodeURIComponent(workspaceId)}`
      );

      eventSource.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === "new_message" && data.message) {
            const incomingMsg: Message = data.message;
            const targetConvId: string = data.conversationId;

            setConversations((prev) =>
              prev.map((c) => {
                if (c.id !== targetConvId) return c;
                // Avoid duplicates if message was already added optimistically
                if (c.messages.some((m) => m.id === incomingMsg.id)) {
                  return c;
                }
                const isCurrentlyActive = c.id === activeIdRef.current;
                return {
                  ...c,
                  messages: [...c.messages, incomingMsg],
                  lastMessage: incomingMsg.content,
                  lastTimestamp: incomingMsg.timestamp,
                  unread: isCurrentlyActive ? 0 : c.unread + 1,
                };
              })
            );
          } else if (data.type === "refresh") {
            syncLiveConversations();
          }
        } catch {
          // Ignore keepalive comments or non-JSON payloads
        }
      };

      eventSource.onerror = () => {
        // If SSE disconnects or errors, fallback polling guarantees delivery
      };
    } catch {
      // If EventSource is not supported, fallback polling handles it
    }

    // 2. Heartbeat background poll every 2.5 seconds when tab is visible
    const pollTimer = setInterval(() => {
      if (document.visibilityState === "visible") {
        syncLiveConversations();
      }
    }, 2500);

    // 3. Instant sync on window focus and tab visibility change
    const onFocusOrVisible = () => {
      if (document.visibilityState === "visible" && isMounted) {
        syncLiveConversations();
      }
    };
    window.addEventListener("focus", onFocusOrVisible);
    window.addEventListener("visibilitychange", onFocusOrVisible);

    return () => {
      isMounted = false;
      eventSource?.close();
      clearInterval(pollTimer);
      window.removeEventListener("focus", onFocusOrVisible);
      window.removeEventListener("visibilitychange", onFocusOrVisible);
    };
  }, [workspaceId]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? conversations[0],
    [conversations, activeId],
  );

  const isChannel = (c: Conversation) => {
    if (c.type === "channel") return true;
    if (c.type === "direct") return false;
    return (
      c.id.startsWith("conv-design") ||
      c.id.startsWith("conv-product") ||
      c.id.startsWith("conv-eng") ||
      c.id.startsWith("conv-ops") ||
      c.name.startsWith("#") ||
      c.role.toLowerCase().includes("channel")
    );
  };

  const filtered = useMemo(() => {
    let list = conversations;

    if (filterType === "channels") {
      list = list.filter(isChannel);
    } else if (filterType === "direct") {
      list = list.filter((c) => !isChannel(c));
    }

    const q = search.trim().toLowerCase();
    if (!q) return list;

    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q),
    );
  }, [conversations, filterType, search]);

  function selectConversation(id: string) {
    setActiveId(id);
    setShowListOnMobile(false);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
  }

  function sendMessage(text: string) {
    if (!activeId) return;
    const senderName = currentUser?.name || "Me";
    const tempId = `m-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const msg: Message = {
      id: tempId,
      sender: senderName,
      content: text,
      timestamp,
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeId) return c;
        return {
          ...c,
          messages: [...c.messages, msg],
          lastMessage: msg.content,
          lastTimestamp: msg.timestamp,
        };
      }),
    );

    const targetConvId = activeId;
    startTransition(async () => {
      await sendMessageAction(targetConvId, senderName, text);
      router.refresh();
    });
  }

  // Start Direct Message with selected workspace member
  const handleStartDirectMessage = async (member: WorkspaceMemberItem) => {
    setIsCreatingChat(true);

    // Check if DM conversation with this user already exists in state
    const existing = conversations.find(
      (c) =>
        !isChannel(c) &&
        (c.participantIds?.includes(member.user.id) ||
          c.name.toLowerCase() === member.user.name.toLowerCase()),
    );

    if (existing) {
      setActiveId(existing.id);
      setShowNewChatModal(false);
      setIsCreatingChat(false);
      setShowListOnMobile(false);
      return;
    }

    const res = await createConversationAction({
      workspaceId,
      name: member.user.name,
      role: member.role === "owner" ? "Owner" : member.role === "admin" ? "Admin" : "Team Member",
      color: "bg-cyan-500",
      type: "direct",
      recipientId: member.user.id,
    });

    if (res.success && res.id) {
      const alreadyInList = conversations.find((c) => c.id === res.id);
      if (alreadyInList) {
        setActiveId(res.id);
        setShowNewChatModal(false);
        setShowListOnMobile(false);
        setIsCreatingChat(false);
        return;
      }

      const nameParts = member.user.name.trim().split(/\s+/);
      const initials = (
        (nameParts[0]?.[0] ?? "") +
        (nameParts[1]?.[0] ?? nameParts[0]?.[1] ?? "")
      ).toUpperCase();

      const newConv: Conversation = {
        id: res.id,
        type: "direct",
        participantIds: currentUser?.id ? [currentUser.id, member.user.id] : [member.user.id],
        name: member.user.name,
        initials,
        color: "bg-cyan-500",
        role: member.role === "owner" ? "Owner" : member.role === "admin" ? "Admin" : "Team Member",
        online: true,
        lastMessage: "Conversation started.",
        lastTimestamp: new Date().toISOString(),
        unread: 0,
        messages: [],
      };

      setConversations((prev) => [newConv, ...prev]);
      setActiveId(res.id);
      setShowNewChatModal(false);
      setShowListOnMobile(false);
      router.refresh();
    }

    setIsCreatingChat(false);
  };

  // Create Channel
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    setIsCreatingChat(true);
    const formattedName = newChannelName.startsWith("#")
      ? newChannelName.trim()
      : `#${newChannelName.trim()}`;

    const res = await createConversationAction({
      workspaceId,
      name: formattedName,
      role: newChannelDescription.trim() || "Team Channel",
      color: "bg-violet-500",
      type: "channel",
      initialMessage: newChannelInitialMessage.trim() || undefined,
    });

    if (res.success && res.id) {
      const now = new Date().toISOString();
      const newConv: Conversation = {
        id: res.id,
        type: "channel",
        participantIds: [],
        name: formattedName,
        initials: "#",
        color: "bg-violet-500",
        role: newChannelDescription.trim() || "Team Channel",
        online: true,
        lastMessage: newChannelInitialMessage.trim() || "Channel created.",
        lastTimestamp: now,
        unread: 0,
        messages: newChannelInitialMessage.trim()
          ? [
              {
                id: `m-${Date.now()}`,
                sender: currentUser?.name || "Me",
                content: newChannelInitialMessage.trim(),
                timestamp: now,
              },
            ]
          : [],
      };

      setConversations((prev) => [newConv, ...prev]);
      setActiveId(res.id);
      setShowNewChatModal(false);
      setNewChannelName("");
      setNewChannelDescription("");
      setNewChannelInitialMessage("");
      setShowListOnMobile(false);
      router.refresh();
    }

    setIsCreatingChat(false);
  };

  return (
    <>
      <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/20">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Messages</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Collaborate in team channels and direct messages with colleagues.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full sm:w-60 rounded-2xl border border-white/10 bg-slate-950/60 px-3.5 py-2 text-xs text-slate-200 placeholder:text-slate-500 theme-input-focus"
            />
            <button
              type="button"
              data-testid="new-chat-btn"
              onClick={() => setShowNewChatModal(true)}
              className="theme-btn-primary shrink-0 rounded-2xl px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:opacity-90"
            >
              + New chat
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="mb-4 flex items-center gap-1.5 border-b border-white/5 pb-3">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`rounded-xl px-3 py-1 text-xs font-semibold transition ${
              filterType === "all"
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All ({conversations.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("channels")}
            className={`rounded-xl px-3 py-1 text-xs font-semibold transition ${
              filterType === "channels"
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Channels ({conversations.filter(isChannel).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("direct")}
            className={`rounded-xl px-3 py-1 text-xs font-semibold transition ${
              filterType === "direct"
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Direct Messages ({conversations.filter((c) => !isChannel(c)).length})
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Conversation list */}
          <aside
            className={`col-span-1 max-h-[70vh] overflow-y-auto rounded-2xl border border-white/5 bg-slate-950/40 p-2 lg:block ${
              showListOnMobile ? "block" : "hidden"
            }`}
          >
            <div className="space-y-1.5">
              {filtered.map((c) => (
                <ConversationItem
                  key={c.id}
                  conversation={c}
                  selected={c.id === activeId}
                  onSelect={selectConversation}
                />
              ))}

              {filtered.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-500">
                  No conversations match your search.
                </div>
              )}
            </div>
          </aside>

          {/* Chat area */}
          <div className="col-span-1 lg:col-span-2 flex flex-col">
            {activeConversation ? (
              <div className="flex h-[70vh] flex-1 flex-col overflow-hidden rounded-2xl border border-white/5 bg-slate-950/30">
                <ChatHeader
                  conversation={activeConversation}
                  onBack={() => setShowListOnMobile(true)}
                />

                <MessageList
                  messages={activeConversation.messages}
                  currentUserName={currentUser?.name}
                  currentUserEmail={currentUser?.email}
                />

                <MessageComposer onSend={sendMessage} />
              </div>
            ) : (
              <div className="flex h-[70vh] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-8 text-center text-slate-400">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400 mb-3">
                  💬
                </div>
                <h4 className="text-base font-semibold text-white">No conversation selected</h4>
                <p className="mt-1 text-xs text-slate-400 max-w-sm">
                  Select a channel or colleague from the left panel, or click &quot;+ New chat&quot; to begin a new thread.
                </p>
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(true)}
                  className="mt-4 rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-850"
                >
                  Start a conversation
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div
          data-testid="new-chat-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Start a Conversation</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Message a team member or create a new channel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="rounded-xl p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="mb-4 flex rounded-xl border border-white/10 bg-slate-950/60 p-1">
              <button
                type="button"
                onClick={() => setNewChatTab("direct")}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                  newChatTab === "direct"
                    ? "bg-violet-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Direct Message
              </button>
              <button
                type="button"
                onClick={() => setNewChatTab("channel")}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                  newChatTab === "channel"
                    ? "bg-violet-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Create Channel
              </button>
            </div>

            {newChatTab === "direct" ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Select Team Colleague
                </p>
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {workspaceMembers
                    .filter((m) => m.user.id !== currentUser?.id)
                    .map((m) => (
                      <button
                        key={m.user.id}
                        type="button"
                        data-testid={`start-dm-${m.user.username || m.user.id}`}
                        disabled={isCreatingChat}
                        onClick={() => handleStartDirectMessage(m)}
                        className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-slate-950/50 p-2.5 text-left transition hover:border-violet-500/40 hover:bg-slate-850"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-bold text-white">
                            {m.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white">{m.user.name}</p>
                            <p className="text-[11px] text-slate-400">@{m.user.username || "user"}</p>
                          </div>
                        </div>
                        <span className="rounded-lg border border-white/10 px-2 py-0.5 text-[10px] text-slate-300">
                          {m.role}
                        </span>
                      </button>
                    ))}

                  {workspaceMembers.filter((m) => m.user.id !== currentUser?.id).length === 0 && (
                    <p className="py-4 text-center text-xs text-slate-500">
                      No other members in this workspace yet. Invite colleagues in Settings!
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateChannel} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Channel Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. #marketing-sync"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white theme-input-focus"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Topic / Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cross-functional campaign coordination"
                    value={newChannelDescription}
                    onChange={(e) => setNewChannelDescription(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white theme-input-focus"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Initial Message (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Welcome team! Use this channel to coordinate..."
                    value={newChannelInitialMessage}
                    onChange={(e) => setNewChannelInitialMessage(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2 text-xs text-white theme-input-focus resize-none"
                  />
                </div>

                <div className="mt-4 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewChatModal(false)}
                    className="rounded-xl px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingChat || !newChannelName.trim()}
                    className="theme-btn-primary rounded-xl px-4 py-2 text-xs font-semibold text-white shadow transition hover:opacity-90 disabled:opacity-50"
                  >
                    {isCreatingChat ? "Creating..." : "Create Channel"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

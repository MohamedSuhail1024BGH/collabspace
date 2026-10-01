"use client";

import { useEffect, useMemo, useRef, useState, useTransition, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
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
import { UserAvatar } from "@/components/ui/UserAvatar";
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
    avatar: (c as unknown as { avatar?: string | null }).avatar || null,
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

const emptySubscribe = () => () => {};

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
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
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

  const activeIdRef = useRef(activeId);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    if (!showListOnMobile) {
      document.body.setAttribute("data-in-chat", "true");
    } else {
      document.body.removeAttribute("data-in-chat");
    }
    return () => {
      document.body.removeAttribute("data-in-chat");
    };
  }, [showListOnMobile]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          target.getAttribute("role") === "textbox");

      if (!isTyping && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key.toLowerCase() === "f") {
          e.preventDefault();
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const [prevInitialConversations, setPrevInitialConversations] = useState(initialConversations);
  if (initialConversations !== prevInitialConversations) {
    setPrevInitialConversations(initialConversations);
    setConversations(initialConversations.map(toConversation));
  }

  // Real-time message streaming via Server-Sent Events (SSE) + fallback polling heartbeat
  useEffect(() => {
    if (!workspaceId) return;
    let isMounted = true;

    const syncLiveConversations = async () => {
      try {
        const res = await getLiveConversationsAction(workspaceId);
        if (res.success && res.conversations && isMounted) {
          setConversations((prev) => {
            return res.conversations.map((liveConv) => {
              const mapped = toConversation(liveConv);
              if (mapped.id === activeIdRef.current) {
                return { ...mapped, unread: 0 };
              }
              const existing = prev.find((p) => p.id === mapped.id);
              if (existing && existing.unread > mapped.unread) {
                return { ...mapped, unread: existing.unread };
              }
              return mapped;
            });
          });
        }
      } catch {
        // Soft fallback
      }
    };

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/messages/events?workspaceId=${workspaceId}`);
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "new_message" && data.conversationId && data.message) {
            setConversations((prev) =>
              prev.map((c) => {
                if (c.id !== data.conversationId) return c;
                const alreadyExists = c.messages.some((m) => m.id === data.message.id);
                if (alreadyExists) return c;
                const isCurrentActive = activeIdRef.current === c.id;
                return {
                  ...c,
                  messages: [...c.messages, data.message],
                  lastMessage: data.message.content,
                  lastTimestamp: data.message.timestamp,
                  unread: isCurrentActive ? 0 : c.unread + 1,
                };
              }),
            );
          } else if (data.type === "new_conversation" && data.conversation) {
            const mapped = toConversation(data.conversation);
            setConversations((prev) => {
              if (prev.some((c) => c.id === mapped.id)) return prev;
              return [mapped, ...prev];
            });
          } else if (data.type === "presence_snapshot" && Array.isArray(data.onlineUserIds)) {
            const onlineSet = new Set<string>(data.onlineUserIds);
            setConversations((prev) =>
              prev.map((c) => {
                if (c.type === "direct") {
                  const counterpartyId =
                    c.participantIds?.find((id) => id !== currentUser?.id) ||
                    c.participantIds?.[0];
                  if (counterpartyId) {
                    return { ...c, online: onlineSet.has(counterpartyId) };
                  }
                }
                return c;
              })
            );
          } else if (data.type === "presence" && data.userId) {
            const isUserOnline = Boolean(data.online);
            setConversations((prev) =>
              prev.map((c) => {
                if (c.type === "direct") {
                  const counterpartyId =
                    c.participantIds?.find((id) => id !== currentUser?.id) ||
                    c.participantIds?.[0];
                  if (counterpartyId === data.userId) {
                    return { ...c, online: isUserOnline };
                  }
                }
                return c;
              })
            );
          }
        } catch {
          // ignore malformed SSE frames
        }
      };
      eventSource.onerror = () => {
        // SSE disconnected, fallback polling active
      };
    } catch {
      // EventSource unsupported
    }

    const interval = setInterval(syncLiveConversations, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [workspaceId, currentUser?.id]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? conversations[0] ?? null,
    [conversations, activeId],
  );

  const isChannel = (c: Conversation) => {
    return (
      c.type === "channel" ||
      (c.type !== "direct" &&
        (c.id.startsWith("conv-design") ||
          c.id.startsWith("conv-product") ||
          c.id.startsWith("conv-eng") ||
          c.id.startsWith("conv-ops") ||
          c.name.startsWith("#")))
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

  const channelsList = useMemo(() => filtered.filter(isChannel), [filtered]);
  const directList = useMemo(() => filtered.filter((c) => !isChannel(c)), [filtered]);

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

  const handleStartDirectMessage = async (member: WorkspaceMemberItem) => {
    setIsCreatingChat(true);

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
      color: "bg-primary",
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
        color: "bg-primary",
        role: member.role === "owner" ? "Owner" : member.role === "admin" ? "Admin" : "Team Member",
        online: false,
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
      color: "bg-secondary",
      type: "channel",
      initialMessage: newChannelInitialMessage.trim() || undefined,
    });

    if (res.success && res.id) {
      const newChannelConv: Conversation = {
        id: res.id,
        type: "channel",
        participantIds: [],
        name: formattedName,
        initials: "#",
        color: "bg-secondary",
        role: newChannelDescription.trim() || "Team Channel",
        online: false,
        lastMessage: newChannelInitialMessage.trim() || "Channel created.",
        lastTimestamp: new Date().toISOString(),
        unread: 0,
        messages: newChannelInitialMessage.trim()
          ? [
              {
                id: `m-init-${Date.now()}`,
                sender: currentUser?.name || "System",
                content: newChannelInitialMessage.trim(),
                timestamp: new Date().toISOString(),
              },
            ]
          : [],
      };

      setConversations((prev) => [newChannelConv, ...prev]);
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
    <div className="h-full w-full flex overflow-hidden bg-surface">
      {/* Left Sub-Pane: Channels & Peers Navigation (Telegram Desktop Sidebar) */}
      <aside
        className={`w-full md:w-80 lg:w-84 xl:w-88 flex-shrink-0 flex flex-col bg-surface-container-low border-r border-outline/15 select-none pb-0 ${
          showListOnMobile ? "flex" : "hidden md:flex"
        }`}
      >
        {/* Telegram Desktop Top Bar: Title Landmark & Compose Trigger */}
        <div className="h-14 px-3.5 border-b border-outline/15 flex items-center justify-between bg-surface-container-low shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-on-surface font-headline-sm tracking-tight truncate">
              Messages
            </h1>
          </div>

          <button
            type="button"
            data-testid="new-chat-btn"
            onClick={() => setShowNewChatModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-2.5 py-1.5 text-xs font-medium shadow-xs transition-colors shrink-0"
            title="Create channel or conversation"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New chat</span>
          </button>
        </div>

        {/* Channel Search & Quick Filters */}
        <div className="p-3 border-b border-outline/10 space-y-2.5 bg-surface-container-low shrink-0">
          {/* Filter Search Input */}
          <div className="relative flex items-center rounded-lg bg-surface-container-lowest border border-outline/20 px-2.5 py-1.5 text-xs text-on-surface focus-within:border-primary">
            <svg className="h-3.5 w-3.5 text-on-surface-variant shrink-0 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.currentTarget.blur();
                }
              }}
              placeholder="Filter channels, peers..."
              className="w-full bg-transparent border-none outline-none font-body-sm text-xs text-on-surface placeholder:text-on-surface-variant/50"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="p-0.5 text-on-surface-variant hover:text-on-surface rounded transition-colors"
                aria-label="Clear search"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : (
              <kbd className="font-mono text-[9px] bg-surface-container-high text-on-surface-variant px-1 rounded">
                F
              </kbd>
            )}
          </div>

          {/* Filter Pill Tabs */}
          <div className="flex items-center gap-1 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`flex-1 py-1 rounded text-center transition-colors ${
                filterType === "all"
                  ? "bg-surface-container-highest text-on-surface font-semibold"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              }`}
            >
              All ({conversations.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("channels")}
              className={`flex-1 py-1 rounded text-center transition-colors ${
                filterType === "channels"
                  ? "bg-surface-container-highest text-on-surface font-semibold"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              }`}
            >
              Channels ({conversations.filter(isChannel).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("direct")}
              className={`flex-1 py-1 rounded text-center transition-colors ${
                filterType === "direct"
                  ? "bg-surface-container-highest text-on-surface font-semibold"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              }`}
            >
              DMs ({conversations.filter((c) => !isChannel(c)).length})
            </button>
          </div>
        </div>

        {/* Navigation Tree (Channels & Direct Messages) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
          {/* 1. Channels Section */}
          {(filterType === "all" || filterType === "channels") && (
            <div>
              <div className="flex items-center justify-between px-2 py-1 text-on-surface-variant">
                <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">
                  Channels
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNewChatTab("channel");
                    setShowNewChatModal(true);
                  }}
                  className="hover:text-on-surface text-xs p-0.5"
                  title="New channel"
                >
                  +
                </button>
              </div>
              <div className="space-y-0.5 mt-1">
                {channelsList.map((c) => (
                  <ConversationItem
                    key={c.id}
                    conversation={c}
                    selected={c.id === activeId}
                    onSelect={selectConversation}
                  />
                ))}
                {channelsList.length === 0 && (
                  <p className="px-2 py-1.5 text-[11px] font-mono text-on-surface-variant/60">
                    No channels found
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 2. Direct Messages Section */}
          {(filterType === "all" || filterType === "direct") && (
            <div>
              <div className="flex items-center justify-between px-2 py-1 text-on-surface-variant">
                <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">
                  Direct Messages
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNewChatTab("direct");
                    setShowNewChatModal(true);
                  }}
                  className="hover:text-on-surface text-xs p-0.5"
                  title="New direct message"
                >
                  +
                </button>
              </div>
              <div className="space-y-0.5 mt-1">
                {directList.map((c) => (
                  <ConversationItem
                    key={c.id}
                    conversation={c}
                    selected={c.id === activeId}
                    onSelect={selectConversation}
                  />
                ))}
                {directList.length === 0 && (
                  <p className="px-2 py-1.5 text-[11px] font-mono text-on-surface-variant/60">
                    No direct messages
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Right Active Message Stream & Composer (Telegram Desktop Chat View) */}
      <main
        className={`flex-1 flex flex-col min-w-0 bg-surface overflow-hidden ${
          !showListOnMobile ? "flex" : "hidden md:flex"
        }`}
      >
        {activeConversation ? (
          <div className="flex flex-1 flex-col h-full overflow-hidden">
            <ChatHeader
              conversation={activeConversation}
              onBack={() => setShowListOnMobile(true)}
              memberCount={workspaceMembers.length || 8}
            />

            <MessageList
              messages={activeConversation.messages}
              currentUserName={currentUser?.name}
              currentUserEmail={currentUser?.email}
            />

            <MessageComposer
              onSend={sendMessage}
              channelName={activeConversation.name}
            />
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-on-surface-variant">
            <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary mb-3 border border-outline/15 shadow-sm">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-on-surface">No conversation selected</h3>
            <p className="mt-1 text-xs font-mono text-on-surface-variant max-w-sm">
              Select a channel or colleague from the left panel, or click &quot;+ New chat&quot; to begin a new thread.
            </p>
            <button
              type="button"
              onClick={() => setShowNewChatModal(true)}
              className="mt-4 rounded bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-3.5 py-1.5 text-xs font-medium transition shadow-xs"
            >
              Start a conversation
            </button>
          </div>
        )}
      </main>

      {/* New Chat Modal with Portaled Root Backdrop */}
      {showNewChatModal && mounted && createPortal(
        <div
          data-testid="new-chat-modal"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setShowNewChatModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-surface-container-high border border-outline/20 p-5 shadow-2xl max-h-[90dvh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between pb-2 border-b border-outline/10">
              <div>
                <h2 className="text-base font-bold text-on-surface font-headline-sm">Start a Conversation</h2>
                <p className="text-[11px] font-mono text-on-surface-variant mt-0.5">
                  Message a team member or create a new team channel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="mb-4 flex rounded bg-surface-container-lowest border border-outline/20 p-0.5">
              <button
                type="button"
                onClick={() => setNewChatTab("direct")}
                className={`flex-1 rounded py-1.5 text-xs font-medium transition ${
                  newChatTab === "direct"
                    ? "bg-surface-container-highest text-on-surface font-semibold shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Direct Message
              </button>
              <button
                type="button"
                onClick={() => setNewChatTab("channel")}
                className={`flex-1 rounded py-1.5 text-xs font-medium transition ${
                  newChatTab === "channel"
                    ? "bg-surface-container-highest text-on-surface font-semibold shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Create Channel
              </button>
            </div>

            {newChatTab === "direct" ? (
              <div className="space-y-2.5">
                <p className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
                  Select Team Colleague
                </p>
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {workspaceMembers
                    .filter((m) => m.user.id !== currentUser?.id)
                    .map((m) => (
                      <button
                        key={m.user.id}
                        type="button"
                        data-testid={`start-dm-${m.user.username?.toLowerCase() || m.user.id}`}
                        disabled={isCreatingChat}
                        onClick={() => handleStartDirectMessage(m)}
                        className="flex w-full items-center justify-between rounded bg-surface-container-lowest border border-outline/20 p-2.5 text-left transition hover:bg-surface-container-high group"
                      >
                        <div className="flex items-center gap-2.5">
                          <UserAvatar avatar={m.user.avatar} name={m.user.name} size="sm" />
                          <div>
                            <p className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors">
                              {m.user.name}
                            </p>
                            <p className="text-[11px] font-mono text-on-surface-variant">
                              @{m.user.username || "user"}
                            </p>
                          </div>
                        </div>
                        <span className="rounded bg-surface-container px-2 py-0.5 text-[10px] font-mono text-on-surface-variant">
                          {m.role}
                        </span>
                      </button>
                    ))}

                  {workspaceMembers.filter((m) => m.user.id !== currentUser?.id).length === 0 && (
                    <p className="py-4 text-center text-xs font-mono text-on-surface-variant">
                      No other members in this workspace yet. Invite colleagues in Settings!
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateChannel} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-on-surface-variant mb-1">
                    Channel Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. #marketing-sync"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="w-full rounded bg-surface-container-lowest border border-outline/20 px-3 py-1.5 text-xs text-on-surface focus:border-primary focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-on-surface-variant mb-1">
                    Topic / Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cross-functional campaign coordination"
                    value={newChannelDescription}
                    onChange={(e) => setNewChannelDescription(e.target.value)}
                    className="w-full rounded bg-surface-container-lowest border border-outline/20 px-3 py-1.5 text-xs text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-on-surface-variant mb-1">
                    Initial Message (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Welcome team! Use this channel to coordinate..."
                    value={newChannelInitialMessage}
                    onChange={(e) => setNewChannelInitialMessage(e.target.value)}
                    className="w-full rounded bg-surface-container-lowest border border-outline/20 px-3 py-1.5 text-xs text-on-surface focus:border-primary focus:outline-none resize-none"
                  />
                </div>

                <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-outline/10">
                  <button
                    type="button"
                    onClick={() => setShowNewChatModal(false)}
                    className="rounded bg-surface-container-high px-3 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-container-highest transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingChat || !newChannelName.trim()}
                    className="rounded bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-3.5 py-1.5 text-xs font-medium shadow-sm transition disabled:opacity-50"
                  >
                    {isCreatingChat ? "Creating..." : "Create Channel"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

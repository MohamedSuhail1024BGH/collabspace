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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Plus,
  MessageSquare,
  Hash,
  Users,
  X,
  MessageCircle,
} from "lucide-react";
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
        avatar: member.user.avatar || null,
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
    <div className="h-full w-full flex overflow-hidden bg-background">
      {/* Left Sub-Pane: Channels & Peers Navigation */}
      <aside
        className={`w-full md:w-80 lg:w-84 xl:w-88 flex-shrink-0 flex flex-col bg-card border-r border-border/60 select-none pb-0 ${
          showListOnMobile ? "flex" : "hidden md:flex"
        }`}
      >
        {/* Top Header */}
        <div className="h-14 px-4 border-b border-border/60 flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare className="size-4 text-primary" />
            <h1 className="text-sm sm:text-base font-bold text-foreground tracking-tight truncate">
              Messages
            </h1>
          </div>

          <Button
            size="sm"
            data-testid="new-chat-btn"
            onClick={() => setShowNewChatModal(true)}
            className="h-8 px-2.5 text-xs font-medium shrink-0 cursor-pointer"
            title="Create channel or conversation"
          >
            <Plus className="size-3.5 mr-1" />
            <span>New chat</span>
          </Button>
        </div>

        {/* Channel Search & Quick Filters */}
        <div className="p-3 border-b border-border/40 space-y-2.5 bg-card/80 shrink-0">
          {/* Filter Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.currentTarget.blur();
                }
              }}
              placeholder="Filter channels, peers..."
              className="pl-8 pr-7 h-8 text-xs"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground rounded"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            ) : (
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] bg-muted text-muted-foreground px-1 py-0.5 rounded border border-border/40 pointer-events-none">
                F
              </kbd>
            )}
          </div>

          {/* Filter Pill Tabs */}
          <div className="flex items-center gap-1 text-[11px] font-mono bg-muted/40 p-0.5 rounded-lg border border-border/30">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`flex-1 py-1 rounded text-center transition-all cursor-pointer ${
                filterType === "all"
                  ? "bg-background text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({conversations.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("channels")}
              className={`flex-1 py-1 rounded text-center transition-all cursor-pointer ${
                filterType === "channels"
                  ? "bg-background text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Channels ({conversations.filter(isChannel).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("direct")}
              className={`flex-1 py-1 rounded text-center transition-all cursor-pointer ${
                filterType === "direct"
                  ? "bg-background text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              DMs ({conversations.filter((c) => !isChannel(c)).length})
            </button>
          </div>
        </div>

        {/* Navigation Tree (Channels & Direct Messages) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* 1. Channels Section */}
          {(filterType === "all" || filterType === "channels") && (
            <div>
              <div className="flex items-center justify-between px-2 py-1 text-muted-foreground">
                <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">
                  Channels
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNewChatTab("channel");
                    setShowNewChatModal(true);
                  }}
                  className="hover:text-foreground text-xs p-0.5"
                  title="New channel"
                >
                  <Plus className="size-3" />
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
                  <p className="px-2 py-2 text-[11px] font-mono text-muted-foreground/60">
                    No channels found
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 2. Direct Messages Section */}
          {(filterType === "all" || filterType === "direct") && (
            <div>
              <div className="flex items-center justify-between px-2 py-1 text-muted-foreground">
                <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">
                  Direct Messages
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNewChatTab("direct");
                    setShowNewChatModal(true);
                  }}
                  className="hover:text-foreground text-xs p-0.5"
                  title="New direct message"
                >
                  <Plus className="size-3" />
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
                  <p className="px-2 py-2 text-[11px] font-mono text-muted-foreground/60">
                    No direct messages
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Right Active Message Stream & Composer */}
      <main
        className={`flex-1 flex flex-col min-w-0 bg-background overflow-hidden ${
          !showListOnMobile ? "flex" : "hidden md:flex"
        }`}
      >
        {activeConversation ? (
          <div className="flex flex-1 flex-col h-full overflow-hidden">
            <ChatHeader
              conversation={activeConversation}
              onBack={() => setShowListOnMobile(true)}
              memberCount={workspaceMembers.length || 1}
            />

            <MessageList
              messages={activeConversation.messages}
              currentUserName={currentUser?.name}
              currentUserEmail={currentUser?.email}
              senderAvatar={activeConversation.avatar}
              workspaceMembers={workspaceMembers}
            />

            <MessageComposer
              onSend={sendMessage}
              channelName={activeConversation.name}
            />
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <div className="w-12 h-12 rounded-xl bg-muted/40 flex items-center justify-center text-primary mb-3 border border-border/40 shadow-xs">
              <MessageCircle className="size-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">No conversation selected</h3>
            <p className="mt-1 text-xs font-mono text-muted-foreground max-w-sm">
              Select a channel or colleague from the left panel, or click &quot;New chat&quot; to begin a new thread.
            </p>
            <Button
              size="sm"
              onClick={() => setShowNewChatModal(true)}
              className="mt-4 h-8 text-xs font-medium"
            >
              Start a conversation
            </Button>
          </div>
        )}
      </main>

      {/* New Chat Modal with Portaled Root Backdrop */}
      {showNewChatModal && mounted && createPortal(
        <div
          data-testid="new-chat-modal"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowNewChatModal(false)}
        >
          <Card
            className="w-full max-w-md p-5 shadow-2xl max-h-[90dvh] overflow-y-auto border-border/80"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h2 className="text-base font-bold text-foreground">Start a Conversation</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Message a team member or create a new team channel.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNewChatModal(false)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                aria-label="Close modal"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Modal Tabs */}
            <div className="mb-4 flex rounded-lg bg-muted/40 border border-border/40 p-1">
              <button
                type="button"
                onClick={() => setNewChatTab("direct")}
                className={`flex-1 rounded py-1.5 text-xs font-medium transition cursor-pointer ${
                  newChatTab === "direct"
                    ? "bg-background text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Direct Message
              </button>
              <button
                type="button"
                onClick={() => setNewChatTab("channel")}
                className={`flex-1 rounded py-1.5 text-xs font-medium transition cursor-pointer ${
                  newChatTab === "channel"
                    ? "bg-background text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Create Channel
              </button>
            </div>

            {newChatTab === "direct" ? (
              <div className="space-y-2.5">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Select Team Colleague
                </p>
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {workspaceMembers
                    .filter((m) => m.user.id !== currentUser?.id)
                    .map((m) => (
                      <button
                        key={m.user.id}
                        type="button"
                        data-testid={`start-dm-${m.user.username?.toLowerCase() || m.user.id}`}
                        disabled={isCreatingChat}
                        onClick={() => handleStartDirectMessage(m)}
                        className="flex w-full items-center justify-between rounded-lg bg-muted/20 border border-border/40 p-2.5 text-left transition hover:bg-muted/40 group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <UserAvatar avatar={m.user.avatar} name={m.user.name} size="sm" />
                          <div>
                            <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                              {m.user.name}
                            </p>
                            <p className="text-[11px] font-mono text-muted-foreground">
                              @{m.user.username || "user"}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono bg-muted/40">
                          {m.role}
                        </Badge>
                      </button>
                    ))}

                  {workspaceMembers.filter((m) => m.user.id !== currentUser?.id).length === 0 && (
                    <p className="py-6 text-center text-xs font-mono text-muted-foreground">
                      No other members in this workspace yet. Invite colleagues in Settings!
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateChannel} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-muted-foreground mb-1">
                    Channel Name
                  </label>
                  <Input
                    required
                    placeholder="e.g. #marketing-sync"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-muted-foreground mb-1">
                    Topic / Description
                  </label>
                  <Input
                    placeholder="e.g. Cross-functional campaign coordination"
                    value={newChannelDescription}
                    onChange={(e) => setNewChannelDescription(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-muted-foreground mb-1">
                    Initial Message (Optional)
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Welcome team! Use this channel to coordinate..."
                    value={newChannelInitialMessage}
                    onChange={(e) => setNewChannelInitialMessage(e.target.value)}
                    className="text-xs resize-none"
                  />
                </div>

                <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-border/50">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewChatModal(false)}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isCreatingChat || !newChannelName.trim()}
                    className="h-8 text-xs font-medium"
                  >
                    {isCreatingChat ? "Creating..." : "Create Channel"}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>,
        document.body
      )}
    </div>
  );
}

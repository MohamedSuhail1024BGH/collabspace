"use client";

import { useMemo, useState } from "react";
import { conversations as mockConversations, type Conversation, type Message } from "@/data/mock-data";
import ConversationItem from "@/components/dashboard/ConversationItem";
import ChatHeader from "@/components/dashboard/ChatHeader";
import MessageList from "@/components/dashboard/MessageList";
import MessageComposer from "@/components/dashboard/MessageComposer";

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>(() => mockConversations);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(() => mockConversations[0]?.id ?? null);
  const [showListOnMobile, setShowListOnMobile] = useState(true);

  const activeConversation = useMemo(() => conversations.find((c) => c.id === activeId) ?? conversations[0], [conversations, activeId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.name.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q));
  }, [conversations, search]);

  function selectConversation(id: string) {
    setActiveId(id);
    setShowListOnMobile(false);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
  }

  function sendMessage(text: string) {
    if (!activeId) return;
    const msg: Message = {
      id: `m-${Date.now()}`,
      sender: "Me",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeId) return c;
        const updated = { ...c, messages: [...c.messages, msg], lastMessage: msg.content, lastTimestamp: msg.timestamp };
        return updated;
      })
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/20">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Messages</h3>
        <div className="hidden items-center gap-2 sm:flex">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
            className="rounded-2xl border border-white/5 bg-slate-950/60 px-3 py-2 text-sm text-slate-300 placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Conversation list */}
        <aside className={`col-span-1 max-h-[65vh] overflow-y-auto rounded-2xl border border-white/5 bg-slate-950/40 p-3 sm:block ${showListOnMobile ? "block" : "hidden"}`}>
          <div className="mb-3 flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full rounded-2xl border border-white/5 bg-slate-900/40 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 sm:hidden"
            />
            <button
              type="button"
              onClick={() => setConversations((prev) => [...prev])}
              className="hidden rounded-2xl bg-violet-500 px-3 py-1 text-sm font-medium text-white sm:inline"
            >
              New chat
            </button>
          </div>

          <div className="space-y-2">
            {filtered.map((c) => (
              <ConversationItem key={c.id} conversation={c} selected={c.id === activeId} onSelect={selectConversation} />
            ))}
            {filtered.length === 0 ? <p className="py-4 text-center text-sm text-slate-400">No conversations</p> : null}
          </div>
        </aside>

        {/* Chat area */}
        <div className="col-span-1 sm:col-span-2 flex flex-col">
          {activeConversation ? (
            <div className="flex h-[65vh] flex-1 flex-col overflow-hidden rounded-2xl border border-white/5 bg-slate-950/30">
              <div className="px-4 py-3">
                <ChatHeader conversation={activeConversation} onBack={() => setShowListOnMobile(true)} />
              </div>

              <MessageList messages={activeConversation.messages} />

              <MessageComposer onSend={sendMessage} />
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-slate-400">No conversation selected</div>
          )}
        </div>
      </div>
    </section>
  );
}

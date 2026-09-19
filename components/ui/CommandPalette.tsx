"use client";

import { useEffect, useState, useRef, useMemo, useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

type CommandItem = {
  id: string;
  category: "Navigation" | "Quick Actions" | "Settings";
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
};

type CommandPaletteProps = {
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
};

const emptySubscribe = () => () => {};

export function CommandPalette({
  isOpen: externalIsOpen,
  onOpen: externalOnOpen,
  onClose: externalOnClose,
}: CommandPaletteProps) {
  const router = useRouter();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [prevSearch, setPrevSearch] = useState(search);
  if (prevSearch !== search) {
    setPrevSearch(search);
    setSelectedIndex(0);
  }
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const inputRef = useRef<HTMLInputElement>(null);
  const chordRef = useRef<string | null>(null);
  const chordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const openPalette = useCallback(() => {
    if (externalOnOpen) {
      externalOnOpen();
    } else {
      setInternalIsOpen(true);
    }
  }, [externalOnOpen]);

  const closePalette = useCallback(() => {
    if (externalOnClose) {
      externalOnClose();
    } else {
      setInternalIsOpen(false);
    }
    setSearch("");
    setSelectedIndex(0);
  }, [externalOnClose]);

  const togglePalette = useCallback(() => {
    if (isOpen) {
      closePalette();
    } else {
      openPalette();
    }
  }, [isOpen, closePalette, openPalette]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Global Command Palette Toggle: Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        togglePalette();
        return;
      }

      // 2. Escape: dismiss Command Palette if open
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        closePalette();
        return;
      }

      // If Command Palette is currently open, do not trigger background chords
      if (isOpen) return;

      // 3. Ignore typing in active form inputs, textareas, selects, or rich text editors
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          target.getAttribute("role") === "textbox");

      if (isTyping) return;

      // Ignore modifier combinations (Ctrl, Alt, Meta) for chords and single-letter hotkeys
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // 4. Quick Help / Palette Trigger: '?' or '/'
      if (e.key === "?" || (!chordRef.current && e.key === "/")) {
        e.preventDefault();
        openPalette();
        return;
      }

      // 5. Two-Key "G" Chord Navigation (e.g. G O, G P, G T, G M, G C, G R, G S)
      if (chordRef.current === "g") {
        if (chordTimeoutRef.current) clearTimeout(chordTimeoutRef.current);
        chordRef.current = null;

        switch (key) {
          case "o":
            e.preventDefault();
            router.push("/");
            return;
          case "p":
            e.preventDefault();
            router.push("/projects");
            return;
          case "t":
            e.preventDefault();
            router.push("/tasks");
            return;
          case "m":
            e.preventDefault();
            router.push("/messages");
            return;
          case "c":
            e.preventDefault();
            router.push("/calendar");
            return;
          case "r":
            e.preventDefault();
            router.push("/reports");
            return;
          case "s":
            e.preventDefault();
            router.push("/start");
            return;
          default:
            break;
        }
      }

      // Start "G" chord listener with 1.5s timeout window
      if (key === "g") {
        if (chordTimeoutRef.current) clearTimeout(chordTimeoutRef.current);
        chordRef.current = "g";
        chordTimeoutRef.current = setTimeout(() => {
          chordRef.current = null;
        }, 1500);
        return;
      }

      // 6. Contextual 'C' hotkey for Quick Issue / Task queue navigation
      if (key === "c") {
        e.preventDefault();
        router.push("/tasks");
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (chordTimeoutRef.current) clearTimeout(chordTimeoutRef.current);
    };
  }, [isOpen, togglePalette, closePalette, openPalette, router]);

  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isOpen]);

  const commands: CommandItem[] = useMemo(() => [
    {
      id: "nav-overview",
      category: "Navigation",
      title: "Overview",
      subtitle: "Workspace metrics and active stream",
      icon: (
        <svg className="h-4 w-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
        </svg>
      ),
      shortcut: "G O",
      action: () => { router.push("/"); closePalette(); },
    },
    {
      id: "nav-projects",
      category: "Navigation",
      title: "Projects",
      subtitle: "Project portfolio & milestone roadmap",
      icon: (
        <svg className="h-4 w-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
      shortcut: "G P",
      action: () => { router.push("/projects"); closePalette(); },
    },
    {
      id: "nav-tasks",
      category: "Navigation",
      title: "Tasks & Execution Queue",
      subtitle: "Sprint tasks, backlog, and Kanban board",
      icon: (
        <svg className="h-4 w-4 text-secondary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      shortcut: "G T",
      action: () => { router.push("/tasks"); closePalette(); },
    },
    {
      id: "nav-messages",
      category: "Navigation",
      title: "Messages",
      subtitle: "Team channels, direct chats, and threads",
      icon: (
        <svg className="h-4 w-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      shortcut: "G M",
      action: () => { router.push("/messages"); closePalette(); },
    },
    {
      id: "nav-calendar",
      category: "Navigation",
      title: "Calendar",
      subtitle: "Sprint deadlines, meetings, and reviews",
      icon: (
        <svg className="h-4 w-4 text-tertiary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      shortcut: "G C",
      action: () => { router.push("/calendar"); closePalette(); },
    },
    {
      id: "nav-reports",
      category: "Navigation",
      title: "Reports & Workload",
      subtitle: "Engineering velocity and resource allocation",
      icon: (
        <svg className="h-4 w-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      shortcut: "G R",
      action: () => { router.push("/reports"); closePalette(); },
    },
    {
      id: "nav-start",
      category: "Navigation",
      title: "Smart Hub & Discovery",
      subtitle: "Switch organization or explore workspaces",
      icon: (
        <svg className="h-4 w-4 text-secondary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      shortcut: "G S",
      action: () => { router.push("/start"); closePalette(); },
    },
    {
      id: "act-create-task",
      category: "Quick Actions",
      title: "Create New Task",
      subtitle: "Add an issue or story to the execution queue",
      icon: (
        <svg className="h-4 w-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
        </svg>
      ),
      action: () => { router.push("/tasks"); closePalette(); },
    },
    {
      id: "act-new-chat",
      category: "Quick Actions",
      title: "Start Direct Message or Channel",
      subtitle: "Open real-time communication modal",
      icon: (
        <svg className="h-4 w-4 text-secondary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      action: () => { router.push("/messages"); closePalette(); },
    },
    {
      id: "set-preferences",
      category: "Settings",
      title: "Workspace Preferences",
      subtitle: "Customize themes, density, and notification policies",
      icon: (
        <svg className="h-4 w-4 text-on-surface-variant shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      action: () => { router.push("/preferences"); closePalette(); },
    },
  ], [router, closePalette]);

  const filteredCommands = useMemo(() => {
    if (!search.trim()) return commands;
    const q = search.toLowerCase();
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.subtitle?.toLowerCase().includes(q)
    );
  }, [commands, search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filteredCommands[selectedIndex];
      if (target) {
        target.action();
      }
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center bg-black/75 p-4 pt-16 sm:pt-24 backdrop-blur-md animate-in fade-in duration-150 select-none outline-none"
      onClick={closePalette}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-surface-container border border-outline-variant/30 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Command Search Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 bg-surface-container border-b border-outline-variant/20">
          <svg className="h-5 w-5 text-on-surface-variant shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search workspace... (↑↓ to navigate, ↵ to run)"
            className="w-full bg-transparent border-none outline-none font-body-md text-sm text-on-surface placeholder:text-on-surface-variant/50"
          />
          <kbd className="stitch-kbd shrink-0">ESC</kbd>
        </div>

        {/* Command Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant font-mono text-xs">
              No matching commands or routes found for &quot;{search}&quot;
            </div>
          ) : (
            filteredCommands.map((cmd, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                    isSelected
                      ? "bg-surface-container-high text-on-surface border-l-2 border-primary shadow-xs"
                      : "text-on-surface-variant hover:bg-surface-container-high/50 hover:text-on-surface"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-lg bg-surface-lowest border border-outline-variant/20 shrink-0 flex items-center justify-center">
                      {cmd.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-xs font-semibold truncate ${isSelected ? "text-primary" : "text-on-surface"}`}>
                        {cmd.title}
                      </span>
                      {cmd.subtitle && (
                        <span className="text-[11px] font-mono text-on-surface-variant/80 truncate">
                          {cmd.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-container-lowest text-on-surface-variant/70 border border-outline-variant/15">
                      {cmd.category}
                    </span>
                    {cmd.shortcut && (
                      <kbd className="stitch-kbd">{cmd.shortcut}</kbd>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hotkeys Guide */}
        <div className="px-4 py-2 bg-surface-container-lowest border-t border-outline-variant/15 flex items-center justify-between text-[10px] font-mono text-on-surface-variant select-none">
          <div className="flex items-center gap-2">
            <span>Navigation:</span>
            <kbd className="stitch-kbd">↑</kbd>
            <kbd className="stitch-kbd">↓</kbd>
            <span>Select:</span>
            <kbd className="stitch-kbd">↵</kbd>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span>Enterprise Palette</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}


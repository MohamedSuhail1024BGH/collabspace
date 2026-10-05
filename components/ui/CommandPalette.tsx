"use client";

import { useEffect, useState, useRef, useMemo, useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  FolderKanban,
  CheckSquare,
  MessageSquare,
  Calendar,
  BarChart3,
  Compass,
  Plus,
  Settings,
} from "lucide-react";

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

      // 4. Two-Key Navigation Sequences ("G then ...")
      const key = e.key.toLowerCase();
      if (!chordRef.current && key === "g") {
        chordRef.current = "g";
        if (chordTimeoutRef.current) clearTimeout(chordTimeoutRef.current);
        chordTimeoutRef.current = setTimeout(() => {
          chordRef.current = null;
        }, 1200);
        return;
      }

      if (chordRef.current === "g") {
        chordRef.current = null;
        if (chordTimeoutRef.current) clearTimeout(chordTimeoutRef.current);

        switch (key) {
          case "h":
          case "o":
            e.preventDefault();
            router.push("/");
            break;
          case "p":
            e.preventDefault();
            router.push("/projects");
            break;
          case "t":
            e.preventDefault();
            router.push("/tasks");
            break;
          case "m":
            e.preventDefault();
            router.push("/messages");
            break;
          case "c":
            e.preventDefault();
            router.push("/calendar");
            break;
          case "r":
            e.preventDefault();
            router.push("/reports");
            break;
          case "s":
            e.preventDefault();
            router.push("/start");
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (chordTimeoutRef.current) clearTimeout(chordTimeoutRef.current);
    };
  }, [isOpen, togglePalette, closePalette, router]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const commands: CommandItem[] = useMemo(() => [
    {
      id: "nav-overview",
      category: "Navigation",
      title: "Overview Dashboard",
      subtitle: "Workspace metrics, sprint progress, and workload",
      icon: <FolderKanban className="size-4 text-primary shrink-0" />,
      shortcut: "G H",
      action: () => { router.push("/"); closePalette(); },
    },
    {
      id: "nav-projects",
      category: "Navigation",
      title: "Projects",
      subtitle: "Project portfolio & milestone roadmap",
      icon: <FolderKanban className="size-4 text-primary shrink-0" />,
      shortcut: "G P",
      action: () => { router.push("/projects"); closePalette(); },
    },
    {
      id: "nav-tasks",
      category: "Navigation",
      title: "Tasks & Execution Queue",
      subtitle: "Sprint tasks, backlog, and Kanban board",
      icon: <CheckSquare className="size-4 text-secondary-foreground shrink-0" />,
      shortcut: "G T",
      action: () => { router.push("/tasks"); closePalette(); },
    },
    {
      id: "nav-messages",
      category: "Navigation",
      title: "Messages",
      subtitle: "Team channels, direct chats, and threads",
      icon: <MessageSquare className="size-4 text-primary shrink-0" />,
      shortcut: "G M",
      action: () => { router.push("/messages"); closePalette(); },
    },
    {
      id: "nav-calendar",
      category: "Navigation",
      title: "Calendar",
      subtitle: "Sprint deadlines, meetings, and reviews",
      icon: <Calendar className="size-4 text-primary shrink-0" />,
      shortcut: "G C",
      action: () => { router.push("/calendar"); closePalette(); },
    },
    {
      id: "nav-reports",
      category: "Navigation",
      title: "Reports & Workload",
      subtitle: "Engineering velocity and resource allocation",
      icon: <BarChart3 className="size-4 text-primary shrink-0" />,
      shortcut: "G R",
      action: () => { router.push("/reports"); closePalette(); },
    },
    {
      id: "nav-start",
      category: "Navigation",
      title: "Smart Hub & Discovery",
      subtitle: "Switch organization or explore workspaces",
      icon: <Compass className="size-4 text-primary shrink-0" />,
      shortcut: "G S",
      action: () => { router.push("/start"); closePalette(); },
    },
    {
      id: "act-create-task",
      category: "Quick Actions",
      title: "Create New Task",
      subtitle: "Add an issue or story to the execution queue",
      icon: <Plus className="size-4 text-primary shrink-0" />,
      action: () => { router.push("/tasks"); closePalette(); },
    },
    {
      id: "act-new-chat",
      category: "Quick Actions",
      title: "Start Direct Message or Channel",
      subtitle: "Open real-time communication modal",
      icon: <MessageSquare className="size-4 text-secondary-foreground shrink-0" />,
      action: () => { router.push("/messages"); closePalette(); },
    },
    {
      id: "set-preferences",
      category: "Settings",
      title: "Workspace Preferences",
      subtitle: "Customize themes, density, and notification policies",
      icon: <Settings className="size-4 text-muted-foreground shrink-0" />,
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
      className="fixed inset-0 z-[120] flex items-start justify-center bg-black/60 p-4 pt-16 sm:pt-24 backdrop-blur-sm animate-in fade-in duration-150 select-none outline-none"
      onClick={closePalette}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <Card
        className="w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col border-border/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Command Search Bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border/60">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search workspace... (↑↓ to navigate, ↵ to run)"
            className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-foreground placeholder:text-muted-foreground"
          />
          <kbd className="font-mono text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border/40 shrink-0">
            ESC
          </kbd>
        </div>

        {/* Command Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground font-mono text-xs">
              No matching commands found for &quot;{search}&quot;
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
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-accent text-accent-foreground border-l-2 border-primary shadow-xs"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-md bg-muted/40 border border-border/40 shrink-0 flex items-center justify-center">
                      {cmd.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-xs font-semibold truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {cmd.title}
                      </span>
                      {cmd.subtitle && (
                        <span className="text-[11px] font-mono text-muted-foreground truncate">
                          {cmd.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[9px] font-mono uppercase bg-background">
                      {cmd.category}
                    </Badge>
                    {cmd.shortcut && (
                      <kbd className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border/40 text-muted-foreground">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hotkeys Guide */}
        <div className="px-4 py-2 bg-muted/20 border-t border-border/60 flex items-center justify-between text-[10px] font-mono text-muted-foreground select-none">
          <div className="flex items-center gap-2">
            <span>Navigation:</span>
            <kbd className="font-mono bg-muted px-1 py-0.5 rounded border border-border/40">↑</kbd>
            <kbd className="font-mono bg-muted px-1 py-0.5 rounded border border-border/40">↓</kbd>
            <span>Select:</span>
            <kbd className="font-mono bg-muted px-1 py-0.5 rounded border border-border/40">↵</kbd>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>CollabSpace Command</span>
          </div>
        </div>
      </Card>
    </div>,
    document.body
  );
}

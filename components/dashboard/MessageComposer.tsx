"use client";

import { useCallback, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Paperclip,
  Smile,
  Send,
  Bold,
  Italic,
  Code,
  Link2,
} from "lucide-react";

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
  channelName?: string;
};

export default function MessageComposer({ onSend, disabled = false }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, onSend, disabled]);

  const insertFormatting = (prefix: string, suffix: string = "") => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = text.slice(start, end);
    const replacement = `${prefix}${selected || "text"}${suffix}`;
    const newText = text.slice(0, start) + replacement + text.slice(end);
    setText(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : 4));
    }, 10);
  };

  return (
    <div className="p-2 sm:p-3 bg-card border-t border-border shrink-0 select-none pb-[max(env(safe-area-inset-bottom,0px),0.5rem)]">
      <div className="flex flex-col rounded-xl bg-secondary/40 border border-input p-2 shadow-xs focus-within:border-primary/50 focus-within:bg-card transition-all">
        {/* Main Input Row */}
        <div className="flex items-end gap-1.5 sm:gap-2">
          {/* Attachment Paperclip Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Attach file"
            onClick={() => insertFormatting("[file](", ")")}
            className="size-8 text-muted-foreground hover:text-foreground shrink-0 mb-0.5"
          >
            <Paperclip className="size-4" />
          </Button>

          {/* Text Input */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={text}
              disabled={disabled}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Write a message..."
              rows={1}
              className="w-full resize-none border-none bg-transparent px-1 py-1.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 leading-relaxed max-h-36"
            />
          </div>

          {/* Emoji Shortcut */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Add emoji"
            onClick={() => setText((prev) => prev + " 😊 ")}
            className="size-8 text-muted-foreground hover:text-foreground shrink-0 mb-0.5"
            aria-label="Add emoji"
          >
            <Smile className="size-4" />
          </Button>

          {/* Send Action */}
          <Button
            type="button"
            data-testid="send-message-btn"
            disabled={disabled || !text.trim()}
            onClick={handleSend}
            size="sm"
            className="gap-1.5 h-8 px-3 shrink-0 mb-0.5"
          >
            <span className="hidden sm:inline">Send</span>
            <Send className="size-3.5" />
          </Button>
        </div>

        {/* Formatting Shortcuts */}
        <div className="hidden sm:flex items-center justify-between pt-1.5 mt-1 border-t border-border/40 px-1">
          <div className="flex items-center gap-0.5 text-muted-foreground">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => insertFormatting("**", "**")}
              title="Bold (**text**)"
              className="size-6 text-[11px] font-bold"
            >
              <Bold className="size-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => insertFormatting("*", "*")}
              title="Italic (*text*)"
              className="size-6 text-[11px] italic"
            >
              <Italic className="size-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => insertFormatting("`", "`")}
              title="Inline Code (`code`)"
              className="size-6 text-[11px]"
            >
              <Code className="size-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => insertFormatting("[", "](url)")}
              title="Link [title](url)"
              className="size-6 text-[11px]"
              aria-label="Insert link"
            >
              <Link2 className="size-3" />
            </Button>

            <div className="w-px h-3 bg-border mx-1 hidden sm:block" />

            <button
              type="button"
              onClick={() => setText((prev) => prev + "@")}
              title="Mention someone (@)"
              className="px-1 py-0.5 rounded hover:text-foreground hover:bg-secondary transition-colors text-xs font-mono hidden sm:inline-block"
            >
              @
            </button>
            <button
              type="button"
              onClick={() => setText((prev) => prev + " 🚀 ")}
              title="Add rocket emoji"
              className="px-1 py-0.5 rounded hover:text-foreground hover:bg-secondary transition-colors text-xs"
            >
              🚀
            </button>
            <button
              type="button"
              onClick={() => setText((prev) => prev + " 👍 ")}
              title="Add thumbs up emoji"
              className="px-1 py-0.5 rounded hover:text-foreground hover:bg-secondary transition-colors text-xs"
            >
              👍
            </button>
          </div>

          <span className="text-[10px] font-mono text-muted-foreground/70 hidden md:inline">
            Return ↵ to send • Shift+Return for new line
          </span>
        </div>
      </div>
    </div>
  );
}

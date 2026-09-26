"use client";

import { useCallback, useState, useRef } from "react";

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
    <div className="p-2 sm:p-3 bg-surface-container-low border-t border-outline/15 shrink-0 select-none pb-[max(env(safe-area-inset-bottom,0px),0.5rem)]">
      <div className="flex flex-col rounded-2xl bg-surface-container-lowest border border-outline/20 p-2 shadow-md focus-within:border-primary/50 focus-within:bg-surface-container-lowest transition-all">
        {/* Main Input Row: Attachment clip + Textarea + Emoji + Send Button */}
        <div className="flex items-end gap-1.5 sm:gap-2">
          {/* Attachment Paperclip Button */}
          <button
            type="button"
            title="Attach file"
            onClick={() => insertFormatting("[file](", ")")}
            className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors shrink-0 mb-0.5 active:scale-95 cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

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
              className="w-full resize-none border-none bg-transparent px-1 py-1.5 text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none disabled:opacity-50 font-body-md leading-relaxed max-h-36"
            />
          </div>

          {/* Emoji Shortcut */}
          <button
            type="button"
            title="Add emoji"
            onClick={() => setText((prev) => prev + " 😊 ")}
            className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors shrink-0 mb-0.5 active:scale-95 cursor-pointer"
            aria-label="Add emoji"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Send Action */}
          <button
            type="button"
            data-testid="send-message-btn"
            disabled={disabled || !text.trim()}
            onClick={handleSend}
            className="flex items-center gap-1 rounded-xl bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-3 py-1.5 text-xs font-medium shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 mb-0.5 active:scale-95 cursor-pointer"
          >
            <span className="hidden sm:inline">Send</span>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>

        {/* Formatting Shortcuts Sub-bar (hidden on narrow mobile screens) */}
        <div className="hidden sm:flex items-center justify-between pt-1.5 mt-1 border-t border-outline/10 px-1">
          <div className="flex items-center gap-0.5 text-on-surface-variant">
            <button
              type="button"
              onClick={() => insertFormatting("**", "**")}
              title="Bold (**text**)"
              className="p-1 rounded hover:text-on-surface hover:bg-surface-container transition-colors text-[11px] font-bold font-mono"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("*", "*")}
              title="Italic (*text*)"
              className="p-1 rounded hover:text-on-surface hover:bg-surface-container transition-colors text-[11px] italic font-serif"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("`", "`")}
              title="Inline Code (`code`)"
              className="p-1 rounded hover:text-on-surface hover:bg-surface-container transition-colors text-[11px] font-mono"
            >
              &lt;/&gt;
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("[", "](url)")}
              title="Link [title](url)"
              className="p-1 rounded hover:text-on-surface hover:bg-surface-container transition-colors text-xs flex items-center justify-center"
              aria-label="Insert link"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>

            <div className="w-px h-3 bg-outline/20 mx-1 hidden sm:block" />

            <button
              type="button"
              onClick={() => setText((prev) => prev + "@")}
              title="Mention someone (@)"
              className="p-1 rounded hover:text-on-surface hover:bg-surface-container transition-colors text-xs font-mono hidden sm:inline-block"
            >
              @
            </button>
            <button
              type="button"
              onClick={() => setText((prev) => prev + " 🚀 ")}
              title="Add rocket emoji"
              className="p-1 rounded hover:text-on-surface hover:bg-surface-container transition-colors text-xs"
            >
              🚀
            </button>
            <button
              type="button"
              onClick={() => setText((prev) => prev + " 👍 ")}
              title="Add thumbs up emoji"
              className="p-1 rounded hover:text-on-surface hover:bg-surface-container transition-colors text-xs"
            >
              👍
            </button>
          </div>

          <span className="text-[10px] font-mono text-on-surface-variant/50 hidden md:inline">
            Return ↵ to send • Shift+Return for new line
          </span>
        </div>
      </div>
    </div>
  );
}

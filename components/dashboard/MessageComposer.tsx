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
  X,
  FileText,
} from "lucide-react";

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
  channelName?: string;
};

type FileAttachment = {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  isImage: boolean;
};

const QUICK_EMOJIS = ["👍", "❤️", "🔥", "😂", "🎉", "🚀", "👀", "👏", "💯", "😊", "✨", "🙏", "🙌", "💡", "⚡", "🤝", "💪", "✅"];

export default function MessageComposer({ onSend, disabled = false }: Props) {
  const [text, setText] = useState("");
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [attachment, setAttachment] = useState<FileAttachment | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if ((!trimmed && !attachment) || disabled) return;

    let finalMessage = trimmed;
    if (attachment) {
      if (attachment.isImage) {
        finalMessage = finalMessage
          ? `${finalMessage}\n\n![${attachment.name}](${attachment.dataUrl})`
          : `![${attachment.name}](${attachment.dataUrl})`;
      } else {
        finalMessage = finalMessage
          ? `${finalMessage}\n\n📎 [${attachment.name}](${attachment.dataUrl})`
          : `📎 [${attachment.name}](${attachment.dataUrl})`;
      }
    }

    onSend(finalMessage);
    setText("");
    setAttachment(null);
    setShowEmojiBar(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, attachment, onSend, disabled]);

  const handleInsertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      setText((prev) => prev + emoji);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newText = text.slice(0, start) + emoji + text.slice(end);
    setText(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 10);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAttachment({
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: reader.result,
          isImage: file.type.startsWith("image/"),
        });
      }
    };
    reader.readAsDataURL(file);
    // Reset file input so same file can be selected again if needed
    e.target.value = "";
  };

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
    <div className="bg-card border-t border-border/80 shrink-0 select-none px-2 sm:px-4 py-2 pb-[max(env(safe-area-inset-bottom,0px),0.5rem)]">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.txt"
      />

      {/* Emoji Picker / Reaction Palette Bar */}
      {showEmojiBar && (
        <div
          data-testid="chat-emoji-palette"
          className="mb-2 p-2 rounded-xl bg-card border border-border/80 shadow-md flex items-center gap-1.5 overflow-x-auto scrollbar-none animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <span className="text-[11px] font-mono text-muted-foreground mr-1 shrink-0 pl-1">
            Reactions:
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleInsertEmoji(emoji)}
                className="size-8 flex items-center justify-center rounded-lg hover:bg-muted text-base active:scale-95 transition-transform cursor-pointer"
                aria-label={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowEmojiBar(false)}
            className="ml-auto size-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 cursor-pointer"
            aria-label="Close emoji bar"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Attachment Preview Chip */}
      {attachment && (
        <div className="mb-2 flex items-center gap-2.5 p-2 rounded-xl bg-secondary/70 border border-border/80 max-w-sm animate-in fade-in">
          {attachment.isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attachment.dataUrl}
              alt={attachment.name}
              className="size-10 rounded-lg object-cover border border-border shrink-0"
            />
          ) : (
            <div className="size-10 rounded-lg bg-card border border-border flex items-center justify-center text-primary shrink-0">
              <FileText className="size-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">{attachment.name}</p>
            <p className="text-[10px] font-mono text-muted-foreground">
              {(attachment.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            className="size-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-card shrink-0 cursor-pointer"
            aria-label="Remove attachment"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Main Composer Box */}
      <div className="flex flex-col rounded-2xl bg-secondary/30 border border-border/80 p-2 focus-within:border-ring focus-within:bg-card transition-all">
        {/* Main Input Row */}
        <div className="flex items-end gap-1 sm:gap-2">
          {/* Attachment Paperclip Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Attach image or file"
            onClick={() => fileInputRef.current?.click()}
            className="size-9 text-muted-foreground hover:text-foreground shrink-0 mb-0.5 cursor-pointer rounded-full"
            aria-label="Attach file or image"
          >
            <Paperclip className="size-4" />
          </Button>

          {/* Text Input */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={text}
              disabled={disabled}
              onChange={(e) => {
                setText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
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
              className="w-full resize-none border-none bg-transparent px-2 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 leading-relaxed max-h-32"
            />
          </div>

          {/* Emoji Toggle Shortcut */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title="Add emoji or reaction"
            onClick={() => setShowEmojiBar((prev) => !prev)}
            className={`size-9 text-muted-foreground hover:text-foreground shrink-0 mb-0.5 cursor-pointer rounded-full ${
              showEmojiBar ? "bg-muted text-foreground" : ""
            }`}
            aria-label="Toggle emoji picker"
          >
            <Smile className="size-4" />
          </Button>

          {/* Send Action */}
          <Button
            type="button"
            data-testid="send-message-btn"
            disabled={disabled || (!text.trim() && !attachment)}
            onClick={handleSend}
            size="sm"
            className="gap-1.5 h-9 px-3.5 rounded-full shrink-0 mb-0.5 shadow-xs cursor-pointer"
            aria-label="Send message"
          >
            <span className="hidden sm:inline">Send</span>
            <Send className="size-3.5" />
          </Button>
        </div>

        {/* Desktop Formatting Shortcuts */}
        <div className="hidden sm:flex items-center justify-between pt-1.5 mt-1 border-t border-border/40 px-1">
          <div className="flex items-center gap-0.5 text-muted-foreground">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => insertFormatting("**", "**")}
              title="Bold (**text**)"
              className="size-7 text-[11px] font-bold"
              aria-label="Bold format"
            >
              <Bold className="size-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => insertFormatting("*", "*")}
              title="Italic (*text*)"
              className="size-7 text-[11px] italic"
              aria-label="Italic format"
            >
              <Italic className="size-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => insertFormatting("`", "`")}
              title="Inline Code (`code`)"
              className="size-7 text-[11px]"
              aria-label="Inline code format"
            >
              <Code className="size-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => insertFormatting("[", "](url)")}
              title="Link [title](url)"
              className="size-7 text-[11px]"
              aria-label="Insert link"
            >
              <Link2 className="size-3" />
            </Button>

            <div className="w-px h-3 bg-border mx-1" />

            <button
              type="button"
              onClick={() => insertFormatting("@", "")}
              title="Mention someone (@)"
              className="px-1.5 py-0.5 rounded hover:text-foreground hover:bg-secondary transition-colors text-xs font-mono"
            >
              @
            </button>
            <button
              type="button"
              onClick={() => handleInsertEmoji("🚀")}
              title="Add rocket"
              className="px-1.5 py-0.5 rounded hover:text-foreground hover:bg-secondary transition-colors text-xs"
            >
              🚀
            </button>
            <button
              type="button"
              onClick={() => handleInsertEmoji("👍")}
              title="Add thumbs up"
              className="px-1.5 py-0.5 rounded hover:text-foreground hover:bg-secondary transition-colors text-xs"
            >
              👍
            </button>
          </div>

          <span className="text-[10px] font-mono text-muted-foreground/70">
            Return ↵ to send • Shift+Return for new line
          </span>
        </div>
      </div>
    </div>
  );
}

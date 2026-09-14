"use client";

import { useCallback, useState } from "react";

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
};

export default function MessageComposer({ onSend, disabled = false }: Props) {
  const [text, setText] = useState("");

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  }, [text, onSend, disabled]);

  return (
    <div className="border-t border-white/10 bg-slate-950/40 p-3">
      <div className="flex items-end gap-3">
        <textarea
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Write a message..."
          rows={2}
          className="w-full resize-none rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 theme-input-focus disabled:opacity-50"
        />
        <button
          type="button"
          data-testid="send-message-btn"
          disabled={disabled || !text.trim()}
          onClick={handleSend}
          className="theme-btn-primary shrink-0 rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

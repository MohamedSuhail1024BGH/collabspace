import { messageThreads } from "@/data/mock-data";

export default function MessagesPage() {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Inbox</h3>
        <button type="button" className="text-sm text-violet-300 hover:text-violet-200">
          Compose
        </button>
      </div>

      <div className="space-y-3">
        {messageThreads.map((thread) => (
          <div key={thread.name} className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="font-medium text-white">{thread.name}</p>
                <span className="text-xs text-slate-400">{thread.time}</span>
              </div>
              <p className="text-sm text-slate-300">{thread.preview}</p>
            </div>
            {thread.unread > 0 ? (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-violet-500 px-2 text-xs font-medium text-white">
                {thread.unread}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

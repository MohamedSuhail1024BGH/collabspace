type ActivityItemProps = {
  item: string;
  index?: number;
  time?: string;
};

const relativeTimes = ["2m ago", "18m ago", "1h ago", "3h ago", "Yesterday"];

export function ActivityItem({ item, index = 0, time }: ActivityItemProps) {
  const isApproval = item.toLowerCase().includes("approved") || item.toLowerCase().includes("closed");
  const isShipment = item.toLowerCase().includes("shipped") || item.toLowerCase().includes("commit");
  const displayTime = time || relativeTimes[index % relativeTimes.length];

  return (
    <div className="flex items-start gap-2.5 p-1.5 sm:p-2 rounded-lg hover:bg-surface-container transition-colors group">
      <div
        className={`mt-0.5 p-1 rounded-md flex-shrink-0 flex items-center justify-center ${
          isApproval
            ? "bg-secondary/15 text-secondary border border-secondary/30"
            : isShipment
            ? "bg-primary/15 text-primary border border-primary/30"
            : "bg-tertiary/15 text-tertiary border border-tertiary/30"
        }`}
      >
        {isApproval ? (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : isShipment ? (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-on-surface leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {item}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono text-on-surface-variant">
          <span>{displayTime}</span>
          <span>·</span>
          <span className="text-on-surface-variant/70">Audit Log</span>
        </div>
      </div>
    </div>
  );
}

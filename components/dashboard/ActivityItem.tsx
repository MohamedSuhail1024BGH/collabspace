import { CheckCircle2, Zap, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type ActivityItemProps = {
  item: string;
  index?: number;
  time?: string;
};

export function ActivityItem({ item, time }: ActivityItemProps) {
  const isApproval = item.toLowerCase().includes("approved") || item.toLowerCase().includes("closed");
  const isShipment = item.toLowerCase().includes("shipped") || item.toLowerCase().includes("commit");
  const displayTime = time || "Recently";

  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/40 transition-colors group">
      <div
        className={cn(
          "mt-0.5 size-7 rounded-lg shrink-0 flex items-center justify-center transition-transform group-hover:scale-105",
          isApproval
            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
            : isShipment
            ? "bg-primary/10 text-primary border border-primary/20"
            : "bg-secondary text-muted-foreground border border-border"
        )}
      >
        {isApproval ? (
          <CheckCircle2 className="size-4" />
        ) : isShipment ? (
          <Zap className="size-4" />
        ) : (
          <Clock className="size-4" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors font-medium">
          {item}
        </p>
        <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-muted-foreground">
          <span>{displayTime}</span>
          <span>·</span>
          <span>Audit Log</span>
        </div>
      </div>
    </div>
  );
}

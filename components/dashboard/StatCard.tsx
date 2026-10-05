import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  change: string;
};

export function StatCard({ label, value, change }: StatCardProps) {
  const isPositive = change.startsWith("+");
  const isNeutral = !change.startsWith("+") && !change.startsWith("-");

  return (
    <Card className="rounded-2xl border border-border/80 bg-card hover:border-muted-foreground/30 transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:pt-5 sm:px-5">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
          {label}
        </span>
        <Badge
          variant={isPositive ? "success" : isNeutral ? "secondary" : "destructive"}
          className="text-[11px] font-mono px-2 py-0.5 gap-1 shrink-0 rounded-full"
        >
          {isPositive ? (
            <TrendingUp className="size-3" />
          ) : isNeutral ? (
            <Minus className="size-3" />
          ) : (
            <TrendingDown className="size-3" />
          )}
          <span>{change}</span>
        </Badge>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

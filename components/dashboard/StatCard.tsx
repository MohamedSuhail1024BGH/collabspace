import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  change: string;
};

export function StatCard({ label, value, change }: StatCardProps) {
  const isPositive = change.startsWith("+");
  const isNeutral = !change.startsWith("+") && !change.startsWith("-");

  return (
    <Card className="hover:border-primary/40 hover:shadow-md transition-all duration-200 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 sm:pt-5 sm:px-5">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
          {label}
        </span>
        <Badge
          variant={isPositive ? "success" : isNeutral ? "secondary" : "destructive"}
          className="text-[11px] font-mono px-2 py-0.5 gap-1 shrink-0"
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

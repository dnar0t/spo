import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  delta?: { value: string; positive: boolean };
  icon: LucideIcon;
  accent?: "primary" | "success" | "warning" | "info";
}

const accentMap: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
};

export function KpiCard({ label, value, unit, delta, icon: Icon, accent = "primary" }: KpiCardProps) {
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 shadow-card hover:shadow-elevated transition-shadow">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">
            {label}
          </p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-semibold text-foreground num-tabular leading-none">{value}</span>
            {unit && <span className="text-[11px] text-muted-foreground leading-tight truncate">{unit}</span>}
          </div>
          {delta && (
            <div
              className={cn(
                "flex items-center gap-1 text-[11px] font-medium mt-0.5",
                delta.positive ? "text-success" : "text-destructive"
              )}
            >
              {delta.positive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{delta.value}</span>
              <span className="text-muted-foreground font-normal">к прошлому периоду</span>
            </div>
          )}
        </div>
        <div className={cn("rounded-md p-1.5 shrink-0", accentMap[accent])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

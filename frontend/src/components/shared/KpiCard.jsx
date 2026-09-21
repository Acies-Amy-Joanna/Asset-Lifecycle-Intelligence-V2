import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { fmtDelta } from "@/lib/format";

// KPI card with value, description, optional change indicator, clickable
export const KpiCard = ({
  label, value, description, change, changeInvert = false, icon: Icon,
  tone = "default", onClick, testId,
}) => {
  const toneRing = {
    default: "",
    risk: "border-l-4 border-l-rose-400",
    warning: "border-l-4 border-l-amber-400",
    positive: "border-l-4 border-l-emerald-400",
    opportunity: "border-l-4 border-l-indigo-400",
  }[tone];

  let deltaTone = "neutral";
  if (change != null && change !== 0) {
    const positive = changeInvert ? change < 0 : change > 0;
    deltaTone = positive ? "positive" : "negative";
  }
  const DeltaIcon = change == null || change === 0 ? Minus : change > 0 ? TrendingUp : TrendingDown;

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      disabled={!onClick}
      className={cn(
        "group text-left bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3 transition-all duration-200",
        onClick ? "hover:border-slate-300 hover:shadow-md cursor-pointer" : "cursor-default",
        toneRing
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        {Icon && (
          <span className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-slate-600 transition-colors">
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="font-display text-2xl lg:text-[28px] font-bold text-slate-900 leading-none">{value}</div>
      <div className="flex items-center gap-2 flex-wrap">
        {change != null && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-semibold",
              deltaTone === "positive" ? "text-emerald-600" : deltaTone === "negative" ? "text-rose-600" : "text-slate-400"
            )}
          >
            <DeltaIcon className="h-3.5 w-3.5" />
            {typeof change === "number" ? fmtDelta(change) : change}
          </span>
        )}
        {description && <span className="text-xs text-slate-400">{description}</span>}
      </div>
    </button>
  );
};

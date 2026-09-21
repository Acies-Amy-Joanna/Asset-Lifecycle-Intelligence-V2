import { cn } from "@/lib/utils";
import { TONE_TEXT } from "@/lib/status";

// A compact grid of evidence data points (label + value with tone)
export const EvidenceList = ({ items, columns = 2, className }) => (
  <div
    className={cn("grid gap-2", className)}
    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
  >
    {items.map((e, i) => (
      <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
        <span className="text-xs text-slate-500 truncate">{e.label}</span>
        <span className={cn("text-sm font-semibold font-mono", TONE_TEXT[e.tone] || "text-slate-700")}>{e.value}</span>
      </div>
    ))}
  </div>
);

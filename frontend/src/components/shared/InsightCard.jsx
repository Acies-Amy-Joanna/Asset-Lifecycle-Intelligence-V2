import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ArrowRight, AlertTriangle, TrendingUp, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { TypeBadge, PriorityBadge } from "./Badges";
import { EvidenceList } from "./EvidenceList";
import { fmtCurrency } from "@/lib/format";

const ICONS = { Risk: AlertTriangle, Opportunity: TrendingUp, Adoption: Layers };

// Expandable insight card: What happened → Why → Evidence → (Impact) → drill-down
export const InsightCard = ({ insight, defaultOpen = false, testId }) => {
  const [open, setOpen] = useState(defaultOpen);
  const navigate = useNavigate();
  const Icon = ICONS[insight.type] || Layers;
  const accent = insight.type === "Risk" ? "text-rose-500 bg-rose-50" : insight.type === "Opportunity" ? "text-indigo-500 bg-indigo-50" : "text-amber-500 bg-amber-50";

  return (
    <div
      data-testid={testId}
      className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors"
    >
      <div className="flex items-start gap-3 p-4">
        <span className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", accent)}>
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <TypeBadge type={insight.type} />
            <PriorityBadge priority={insight.priority} />
            <span className="text-xs text-slate-400">·</span>
            <button
              className="text-xs font-medium text-blue-600 hover:underline"
              onClick={() => navigate(`/customer360/${insight.customerId}`)}
              data-testid={`insight-customer-link-${insight.customerId}`}
            >
              {insight.customerName}
            </button>
          </div>
          <p className="text-sm font-medium text-slate-800 leading-snug">{insight.insight}</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed"><span className="font-semibold text-slate-600">Why:</span> {insight.why}</p>

          {open && (
            <div className="mt-3 space-y-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Evidence</div>
                <EvidenceList items={insight.evidence} columns={2} />
              </div>
              <button
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:gap-2.5 transition-all"
                onClick={() => navigate(`/customer360/${insight.customerId}`)}
                data-testid={`insight-drilldown-${insight.customerId}`}
              >
                Open Customer 360 <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          data-testid={`insight-expand-${insight.id}`}
          className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ChevronDown className={cn("h-5 w-5 transition-transform", open && "rotate-180")} />
        </button>
      </div>
    </div>
  );
};

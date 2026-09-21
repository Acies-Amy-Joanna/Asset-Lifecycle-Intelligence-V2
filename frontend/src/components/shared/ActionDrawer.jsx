import { useNavigate } from "react-router-dom";
import { ArrowRight, Lightbulb } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useData, effStatus, effOwner } from "@/context/DataContext";
import { PriorityBadge, TypeBadge } from "./Badges";
import { EvidenceList } from "./EvidenceList";
import { fmtCurrencyFull } from "@/lib/format";

const relatedRoute = (a) => {
  if (a.relatedType === "opportunity") return "/growth";
  if (a.relatedType === "adoption") return "/adoption";
  return "/health";
};

// Right-side detail drawer: Customer → Action → Why → Related → Evidence → Impact → Next Step
export const ActionDrawer = ({ action, open, onOpenChange }) => {
  const navigate = useNavigate();
  const { overrides, updateAction } = useData();
  if (!action) return null;
  const s = effStatus(action, overrides);
  const owner = effOwner(action, overrides);

  const Row = ({ label, children }) => (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{label}</div>
      {children}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto scrollbar-thin" data-testid="action-detail-drawer">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-2 mb-1">
            <TypeBadge type={action.type} />
            <PriorityBadge priority={action.priority} />
          </div>
          <SheetTitle className="font-display text-lg">{action.action}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <Row label="Customer">
            <button
              className="text-sm font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
              onClick={() => { onOpenChange(false); navigate(`/customer360/${action.customerId}`); }}
              data-testid="drawer-customer-link"
            >
              {action.customerName} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </Row>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Status</div>
              <button
                type="button"
                onClick={() => updateAction(action.id, { status: s === "Open" ? "Completed" : "Open" })}
                data-testid="drawer-status-toggle"
                className={`text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${s === "Open" ? "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100" : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"}`}
              >
                {s}
              </button>
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Owner</div>
              <Input value={owner} onChange={(e) => updateAction(action.id, { owner: e.target.value })} placeholder="Assign owner…" data-testid="drawer-owner-input" className="h-9" />
            </div>
          </div>

          <Row label="Why this action">
            <p className="text-sm text-slate-600 leading-relaxed">{action.why}</p>
          </Row>

          <Row label={action.impactType === "opportunity" ? "Related Opportunity" : "Related Risk"}>
            <button
              className="text-sm font-medium text-blue-600 hover:underline inline-flex items-center gap-1"
              onClick={() => { onOpenChange(false); navigate(relatedRoute(action)); }}
              data-testid="drawer-related-link"
            >
              View in {action.impactType === "opportunity" ? "Growth & Expansion" : action.relatedType === "adoption" ? "Adoption & Utilization" : "Health & Renewal"}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </Row>

          <Row label="Evidence">
            <EvidenceList items={action.evidence} columns={1} />
          </Row>

          <Row label="Business Impact">
            <div className={`rounded-lg border p-3 ${action.impactType === "opportunity" ? "bg-indigo-50 border-indigo-200" : "bg-rose-50 border-rose-200"}`}>
              <div className="text-xs text-slate-500">{action.impactType === "opportunity" ? "Opportunity Value" : "Revenue at Risk"}</div>
              <div className={`font-display text-xl font-bold ${action.impactType === "opportunity" ? "text-indigo-700" : "text-rose-700"}`}>
                {fmtCurrencyFull(action.impact)}
              </div>
            </div>
          </Row>

          <Row label="Recommended Next Step">
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3">
              <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-sm text-slate-700 leading-relaxed">{action.nextStep}</p>
            </div>
          </Row>

          <Button className="w-full" data-testid="drawer-open-customer-button"
            onClick={() => { onOpenChange(false); navigate(`/customer360/${action.customerId}`); }}>
            Open Customer 360
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

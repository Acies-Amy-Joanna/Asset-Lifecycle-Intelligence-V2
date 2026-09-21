import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import { CheckSquare, AlertTriangle, TrendingUp, ListTodo, Flame } from "lucide-react";
import { useData, effStatus, effOwner } from "@/context/DataContext";
import { KpiCard } from "@/components/shared/KpiCard";
import { KpiGrid } from "@/components/shared/Layout";
import { SectionCard } from "@/components/shared/SectionCard";
import { DataTable } from "@/components/shared/DataTable";
import { ActionDrawer } from "@/components/shared/ActionDrawer";
import { PriorityBadge, TypeBadge } from "@/components/shared/Badges";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fmtCurrency } from "@/lib/format";
import { CHART_TOOLTIP_STYLE } from "@/lib/intel";

const ACTION_TYPES = ["Risk", "Renewal", "Adoption", "Upsell", "Cross-sell", "License Expansion", "Whitespace"];

export default function Actions() {
  const [params] = useSearchParams();
  const [typeFilter, setTypeFilter] = useState(params.get("type") || "all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [active, setActive] = useState(null);
  const { actions: allActions, overrides, updateAction } = useData();

  useEffect(() => { const t = params.get("type"); if (t) setTypeFilter(t); }, [params]);

  const filtered = useMemo(() => allActions.filter((a) => {
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    if (statusFilter !== "all" && effStatus(a, overrides) !== statusFilter) return false;
    if (priorityFilter !== "all" && a.priority !== priorityFilter) return false;
    return true;
  }), [typeFilter, statusFilter, priorityFilter, overrides]);

  const open = allActions.filter((a) => effStatus(a, overrides) === "Open");
  const highPriority = open.filter((a) => a.priority === "High").length;
  const riskActions = open.filter((a) => a.type === "Risk" || a.type === "Renewal" || a.type === "Adoption").length;
  const oppActions = open.filter((a) => ["Upsell", "Cross-sell", "License Expansion", "Whitespace"].includes(a.type)).length;

  const typeBreakdown = ACTION_TYPES.map((t) => ({ type: t, count: allActions.filter((a) => a.type === t).length }));
  const priorityBreakdown = ["High", "Medium", "Low"].map((p) => ({ priority: p, count: allActions.filter((a) => a.priority === p).length }));

  const Pill = ({ value, current, onClick, label, testId }) => (
    <button onClick={onClick} data-testid={testId}
      className={cn("px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
        current === value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300")}>
      {label}
    </button>
  );

  return (
    <div className="space-y-6" data-testid="actions-page">
      <p className="text-sm text-slate-500">What should I do next based on the intelligence ALI has identified.</p>

      <KpiGrid className="xl:grid-cols-5">
        <KpiCard testId="act-kpi-pending" label="Actions Pending" value={open.length} icon={CheckSquare} tone="warning" />
        <KpiCard testId="act-kpi-high" label="High Priority" value={highPriority} icon={Flame} tone="risk" />
        <KpiCard testId="act-kpi-risk" label="Risk Actions" value={riskActions} icon={AlertTriangle} tone="risk" />
        <KpiCard testId="act-kpi-opp" label="Opportunity Actions" value={oppActions} icon={TrendingUp} tone="opportunity" />
        <KpiCard testId="act-kpi-open" label="Open Actions" value={open.length} icon={ListTodo} />
      </KpiGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Action Type Breakdown" className="lg:col-span-2" testId="act-type-breakdown-card">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={typeBreakdown} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="type" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Priority Breakdown" testId="act-priority-breakdown-card">
          <div className="space-y-3 pt-2">
            {priorityBreakdown.map((p) => {
              const max = Math.max(...priorityBreakdown.map((x) => x.count));
              const color = p.priority === "High" ? "#EF4444" : p.priority === "Medium" ? "#F59E0B" : "#94A3B8";
              return (
                <div key={p.priority}>
                  <div className="flex justify-between text-sm mb-1"><span className="text-slate-600">{p.priority}</span><span className="font-semibold text-slate-900">{p.count}</span></div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${p.count / max * 100}%`, background: color }} /></div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Recommended Actions" subtitle="Click an action for full detail"
        testId="act-table-card">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex flex-wrap gap-1.5">
            <Pill value="all" current={typeFilter} onClick={() => setTypeFilter("all")} label="All Types" testId="act-type-all" />
            {ACTION_TYPES.map((t) => <Pill key={t} value={t} current={typeFilter} onClick={() => setTypeFilter(t)} label={t} testId={`act-type-${t}`} />)}
          </div>
          <div className="flex gap-1.5 ml-auto">
            {["all", "Open", "Completed"].map((s) => <Pill key={s} value={s} current={statusFilter} onClick={() => setStatusFilter(s)} label={s === "all" ? "All Status" : s} testId={`act-status-${s}`} />)}
          </div>
          <div className="flex gap-1.5">
            {["all", "High", "Medium", "Low"].map((p) => <Pill key={p} value={p} current={priorityFilter} onClick={() => setPriorityFilter(p)} label={p === "all" ? "All Priority" : p} testId={`act-priority-${p}`} />)}
          </div>
        </div>
        <DataTable testId="actions-table" rows={filtered} pageSize={12}
          exportable
          exportFilename="ali-actions.csv"
          exportColumns={[
            { header: "Priority", value: (r) => r.priority },
            { header: "Customer", value: (r) => r.customerName },
            { header: "Action", value: (r) => r.action },
            { header: "Type", value: (r) => r.type },
            { header: "Reason", value: (r) => r.reason },
            { header: "Impact", value: (r) => r.impact },
            { header: "Owner", value: (r) => effOwner(r, overrides) },
            { header: "Status", value: (r) => effStatus(r, overrides) },
          ]}
          onRowClick={(r) => setActive(r)} rowTestId={(r) => `action-row-${r.id}`}
          columns={[
            { key: "priority", header: "Priority", render: (r) => <PriorityBadge priority={r.priority} /> },
            { key: "customerName", header: "Customer", sortable: true, render: (r) => <span className="font-medium text-slate-900">{r.customerName}</span> },
            { key: "action", header: "Action", render: (r) => <span className="text-slate-700">{r.action}</span> },
            { key: "type", header: "Type", render: (r) => <TypeBadge type={r.type} /> },
            { key: "reason", header: "Reason", render: (r) => <span className="text-slate-500 text-xs">{r.reason}</span> },
            { key: "impact", header: "Impact", sortable: true, align: "right", render: (r) => <span className={cn("font-semibold", r.impactType === "opportunity" ? "text-indigo-600" : "text-rose-600")}>{fmtCurrency(r.impact)}</span> },
            { key: "owner", header: "Owner", render: (r) => (
              <Input value={effOwner(r, overrides)} onChange={(e) => updateAction(r.id, { owner: e.target.value })} onClick={(e) => e.stopPropagation()} placeholder="Assign…" data-testid={`action-owner-input-${r.id}`} className="h-8 w-28 text-xs" />
            ) },
            { key: "status", header: "Status", render: (r) => {
              const s = effStatus(r, overrides);
              return (
                <button type="button" data-testid={`action-status-toggle-${r.id}`}
                  onClick={(e) => { e.stopPropagation(); updateAction(r.id, { status: s === "Open" ? "Completed" : "Open" }); }}
                  className={cn("text-xs font-medium px-2.5 py-1 rounded-full border transition-colors", s === "Open" ? "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100" : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100")}>
                  {s}
                </button>
              );
            } },
          ]} />
      </SectionCard>

      <ActionDrawer action={active} open={!!active} onOpenChange={(o) => !o && setActive(null)} />
    </div>
  );
}

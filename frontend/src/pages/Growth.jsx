import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, Target, Gauge, Sparkles, ArrowRight, Lightbulb } from "lucide-react";
import { useData } from "@/context/DataContext";
import { OPPORTUNITY_TYPES } from "@/lib/constants";
import { KpiCard } from "@/components/shared/KpiCard";
import { KpiGrid } from "@/components/shared/Layout";
import { SectionCard } from "@/components/shared/SectionCard";
import { DataTable } from "@/components/shared/DataTable";
import { EvidenceList } from "@/components/shared/EvidenceList";
import { TypeBadge, PriorityBadge, ReadinessBadge } from "@/components/shared/Badges";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtCurrency, fmtCurrencyFull, fmtPct } from "@/lib/format";
import { CHART_COLORS } from "@/lib/status";
import { CHART_TOOLTIP_STYLE } from "@/lib/intel";

export default function Growth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { portfolio, opportunities, expansionReadinessDistribution, customers } = useData();
  const [typeFilter, setTypeFilter] = useState(params.get("type") || "all");
  const [selected, setSelected] = useState(null);

  useEffect(() => { const t = params.get("type"); if (t) setTypeFilter(t); }, [params]);

  const filtered = useMemo(
    () => (typeFilter === "all" ? opportunities : opportunities.filter((o) => o.type === typeFilter)),
    [typeFilter]
  );
  useEffect(() => { setSelected(filtered[0] || null); }, [filtered]);

  const avgUtil = Math.round(customers.reduce((s, c) => s + c.licenseUtilization, 0) / customers.length * 10) / 10;
  const avgGrowth = Math.round(customers.reduce((s, c) => s + c.usageGrowth, 0) / customers.length * 10) / 10;
  const byType = portfolio.expansionByType;
  const potByType = (t) => byType.find((x) => x.type === t)?.value || 0;

  return (
    <div className="space-y-6" data-testid="growth-page">
      <p className="text-sm text-slate-500">Where are the growth opportunities, what is the potential value, and why is the customer ready.</p>

      <KpiGrid className="xl:grid-cols-4">
        <KpiCard testId="gr-kpi-total" label="Total Expansion Potential" value={fmtCurrency(portfolio.totalExpansionPotential)} icon={TrendingUp} tone="opportunity" />
        <KpiCard testId="gr-kpi-opps" label="Total Opportunities" value={portfolio.totalOpportunities} icon={Target} tone="opportunity" />
        <KpiCard testId="gr-kpi-upsell" label="Upsell Potential" value={fmtCurrency(potByType("Upsell"))} icon={Sparkles} />
        <KpiCard testId="gr-kpi-crosssell" label="Cross-sell Potential" value={fmtCurrency(potByType("Cross-sell"))} icon={Sparkles} />
        <KpiCard testId="gr-kpi-license" label="License Expansion" value={fmtCurrency(potByType("License Expansion"))} icon={Sparkles} />
        <KpiCard testId="gr-kpi-whitespace" label="Whitespace Potential" value={fmtCurrency(potByType("Whitespace"))} icon={Sparkles} />
        <KpiCard testId="gr-kpi-util" label="Avg License Util %" value={fmtPct(avgUtil)} icon={Gauge} />
        <KpiCard testId="gr-kpi-growth" label="Avg Usage Growth %" value={`${avgGrowth > 0 ? "+" : ""}${avgGrowth}%`} icon={TrendingUp} />
      </KpiGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Opportunity Type Breakdown" className="lg:col-span-2" subtitle="Click a bar category below to filter" testId="gr-type-breakdown-card">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byType} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="type" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtCurrency} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={54} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => [fmtCurrencyFull(v), "Potential"]} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={64}>
                {byType.map((b, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {byType.map((b) => <div key={b.type} className="text-center text-[11px] text-slate-400">{b.count} opps</div>)}
          </div>
        </SectionCard>

        <SectionCard title="Expansion Readiness" subtitle="Derived distribution" testId="gr-readiness-card">
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={expansionReadinessDistribution} dataKey="count" nameKey="readiness" innerRadius={42} outerRadius={70} paddingAngle={2}>
                  {expansionReadinessDistribution.map((e, i) => <Cell key={i} fill={["#10B981", "#F59E0B", "#94A3B8"][i]} />)}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {expansionReadinessDistribution.map((e, i) => (
                <div key={e.readiness} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: ["#10B981", "#F59E0B", "#94A3B8"][i] }} />
                  <span className="text-slate-600">{e.readiness}</span><span className="ml-auto font-semibold text-slate-900">{e.count}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="flex flex-wrap gap-2" data-testid="gr-type-filter">
        {["all", ...OPPORTUNITY_TYPES].map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)} data-testid={`gr-filter-${t}`}
            className={cn("px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors",
              typeFilter === t ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300")}>
            {t === "all" ? "All Types" : t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Opportunities" subtitle={`${filtered.length} opportunities`} className="lg:col-span-2" testId="gr-opps-table-card">
          <DataTable testId="opportunities-table" rows={filtered} pageSize={9}
            onRowClick={(r) => setSelected(r)} rowTestId={(r) => `opportunity-row-${r.id}`}
            columns={[
              { key: "customerName", header: "Customer", sortable: true, render: (r) => <span className="font-medium text-slate-900">{r.customerName}</span> },
              { key: "type", header: "Type", render: (r) => <TypeBadge type={r.type} /> },
              { key: "opportunity", header: "Opportunity", render: (r) => <span className="text-slate-600 text-xs">{r.opportunity}</span> },
              { key: "readiness", header: "Readiness", render: (r) => <ReadinessBadge readiness={r.readiness} /> },
              { key: "value", header: "Value", sortable: true, align: "right", render: (r) => <span className="font-semibold text-indigo-600">{fmtCurrency(r.value)}</span> },
              { key: "priority", header: "Priority", render: (r) => <PriorityBadge priority={r.priority} /> },
            ]} />
        </SectionCard>

        <SectionCard title="Opportunity Detail" subtitle="Why · Evidence · Value" testId="gr-detail-card">
          {!selected ? <p className="text-sm text-slate-400">Select an opportunity to see the reasoning.</p> : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <TypeBadge type={selected.type} /><ReadinessBadge readiness={selected.readiness} /><PriorityBadge priority={selected.priority} />
              </div>
              <div>
                <button onClick={() => navigate(`/customer360/${selected.customerId}`)} data-testid="gr-detail-customer-link"
                  className="text-sm font-semibold text-blue-600 hover:underline inline-flex items-center gap-1">
                  {selected.customerName} <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <div className="text-sm font-medium text-slate-800 mt-1">{selected.opportunity}</div>
                <div className="text-xs text-slate-500 mt-1">Current: {selected.currentState}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Why</div>
                <p className="text-sm text-slate-600 leading-relaxed">{selected.why}</p>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Evidence</div>
                <EvidenceList items={selected.evidence} columns={1} />
              </div>
              <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3">
                <div className="text-xs text-slate-500">Estimated Value</div>
                <div className="font-display text-2xl font-bold text-indigo-700">{fmtCurrencyFull(selected.value)}</div>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3">
                <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div><div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Recommended Action</div>
                  <p className="text-sm text-slate-700">{selected.recommendedAction}</p></div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => navigate("/actions")} data-testid="gr-goto-actions">
                View in Actions <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

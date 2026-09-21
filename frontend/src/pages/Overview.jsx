import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar,
} from "recharts";
import {
  Users, AlertTriangle, DollarSign, Target, TrendingUp, CheckSquare, ArrowRight,
} from "lucide-react";
import { useData, effStatus } from "@/context/DataContext";
import { KpiCard } from "@/components/shared/KpiCard";
import { KpiGrid } from "@/components/shared/Layout";
import { SectionCard } from "@/components/shared/SectionCard";
import { InsightCard } from "@/components/shared/InsightCard";
import { ActionDrawer } from "@/components/shared/ActionDrawer";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge, PriorityBadge } from "@/components/shared/Badges";
import { fmtCurrency, fmtCurrencyFull, fmtNumber } from "@/lib/format";
import { STATUS_CHART } from "@/lib/status";
import { primaryRiskDriver, CHART_TOOLTIP_STYLE } from "@/lib/intel";

export default function Overview() {
  const navigate = useNavigate();
  const [activeAction, setActiveAction] = useState(null);
  const { portfolio, customers, insights, actions, overrides } = useData();
  const pending = actions.filter((a) => effStatus(a, overrides) === "Open").length;

  const topRisk = customers.filter((c) => c.hasRisk).sort((a, b) => b.revenueAtRisk - a.revenueAtRisk).slice(0, 6);
  const highValueRisky = customers.filter((c) => c.hasRisk).sort((a, b) => b.arr - a.arr).slice(0, 5);
  const topInsights = insights.slice(0, 5);
  const priorityActions = actions.filter((a) => effStatus(a, overrides) === "Open").slice(0, 6);

  return (
    <div className="space-y-6" data-testid="overview-page">
      <p className="text-sm text-slate-500 max-w-2xl">What needs attention across the customer portfolio.</p>

      <KpiGrid>
        <KpiCard testId="kpi-total-customers" label="Total Customers" value={portfolio.totalCustomers}
          icon={Users} description="active accounts" onClick={() => navigate("/customers")} />
        <KpiCard testId="kpi-customers-at-risk" label="Customers at Risk" value={portfolio.customersAtRisk}
          icon={AlertTriangle} tone="risk" description="need attention" onClick={() => navigate("/customers?risk=true")} />
        <KpiCard testId="kpi-revenue-at-risk" label="Revenue at Risk" value={fmtCurrency(portfolio.revenueAtRisk)}
          icon={DollarSign} tone="risk" description="ARR exposure" onClick={() => navigate("/health")} />
        <KpiCard testId="kpi-total-opportunities" label="Total Opportunities" value={portfolio.totalOpportunities}
          icon={Target} tone="opportunity" description="open expansion signals" onClick={() => navigate("/growth")} />
        <KpiCard testId="kpi-expansion-potential" label="Expansion Potential" value={fmtCurrency(portfolio.totalExpansionPotential)}
          icon={TrendingUp} tone="opportunity" description="estimated value" onClick={() => navigate("/growth")} />
        <KpiCard testId="kpi-actions-pending" label="AI Actions Pending" value={pending}
          icon={CheckSquare} tone="warning" description="recommended next steps" onClick={() => navigate("/actions")} />
      </KpiGrid>

      {/* Customer Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Health Distribution" subtitle="Derived customer health states" testId="health-distribution-card">
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={portfolio.healthDistribution} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={2}>
                  {portfolio.healthDistribution.map((e) => <Cell key={e.name} fill={STATUS_CHART[e.name]} />)}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {portfolio.healthDistribution.map((e) => (
                <div key={e.name} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_CHART[e.name] }} />
                  <span className="text-slate-600">{e.name}</span>
                  <span className="ml-auto font-semibold text-slate-900">{e.value}</span>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-sm">
                <span className="text-slate-500">Avg Health</span>
                <span className="font-display font-bold text-lg text-slate-900">{portfolio.avgHealthScore}</span>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Health Trend" subtitle="Average health score over 2025" className="lg:col-span-2" testId="health-trend-card">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={portfolio.healthTrend} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis domain={[40, 90]} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="health" stroke="#2563EB" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <SectionCard title="Top Risk Customers" subtitle="Click a customer to open Customer 360" testId="top-risk-customers-card">
        <DataTable
          testId="top-risk-table"
          rows={topRisk}
          onRowClick={(r) => navigate(`/customer360/${r.id}`)}
          rowTestId={(r) => `top-risk-row-${r.id}`}
          pageSize={6}
          columns={[
            { key: "name", header: "Customer", render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
            { key: "healthStatus", header: "Health", render: (r) => <div className="flex items-center gap-2"><StatusBadge status={r.healthStatus} /><span className="font-mono text-xs text-slate-500">{r.healthScore}</span></div> },
            { key: "arr", header: "ARR", align: "right", render: (r) => fmtCurrency(r.arr) },
            { key: "daysToRenewal", header: "Days to Renewal", align: "right", render: (r) => <span className={r.daysToRenewal <= 60 ? "text-rose-600 font-semibold" : ""}>{r.daysToRenewal}</span> },
            { key: "driver", header: "Risk Driver", render: (r) => <span className="text-slate-500">{primaryRiskDriver(r)}</span> },
            { key: "riskPriority", header: "Priority", render: (r) => <PriorityBadge priority={r.riskPriority} /> },
          ]}
        />
      </SectionCard>

      {/* Revenue at Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Revenue at Risk by Renewal Period" className="lg:col-span-2" testId="revenue-risk-card">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={portfolio.revenueAtRiskByBucket} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtCurrency} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={54} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v, n) => n === "revenueAtRisk" ? [fmtCurrencyFull(v), "Revenue at Risk"] : [v, "Customers"]} />
              <Bar dataKey="revenueAtRisk" fill="#EF4444" radius={[6, 6, 0, 0]} maxBarSize={54} />
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {portfolio.revenueAtRiskByBucket.map((b) => (
              <div key={b.bucket} className="text-center">
                <div className="text-[11px] text-slate-400">{b.bucket}</div>
                <div className="text-xs font-semibold text-slate-700">{b.customers} cust.</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="High-Value Risky Customers" testId="high-value-risky-card">
          <div className="space-y-2">
            {highValueRisky.map((c) => (
              <button key={c.id} onClick={() => navigate(`/customer360/${c.id}`)}
                data-testid={`high-value-risky-${c.id}`}
                className="w-full flex items-center gap-3 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50 p-2.5 text-left transition-colors">
                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-[11px] font-semibold text-slate-600">{c.initials}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-800 truncate">{c.name}</div>
                  <div className="text-[11px] text-slate-400">{c.daysToRenewal}d to renewal</div>
                </div>
                <div className="text-sm font-semibold text-rose-600">{fmtCurrency(c.revenueAtRisk)}</div>
              </button>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Growth & Expansion */}
      <SectionCard title="Expansion Potential by Opportunity Type" subtitle="Click a category to explore in Growth & Expansion" testId="expansion-by-type-card">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {portfolio.expansionByType.map((t) => (
            <button key={t.type} onClick={() => navigate(`/growth?type=${encodeURIComponent(t.type)}`)}
              data-testid={`expansion-type-${t.type}`}
              className="text-left rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md p-4 transition-all group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t.type}</span>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </div>
              <div className="font-display text-2xl font-bold text-slate-900 mt-2">{fmtCurrency(t.value)}</div>
              <div className="text-xs text-slate-400 mt-1">{t.count} opportunities</div>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Key Insights + Priority Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Key Insights" subtitle="What happened · Why · Evidence" bodyClassName="space-y-3" testId="key-insights-card">
          {topInsights.map((ins) => <InsightCard key={ins.id} insight={ins} testId={`overview-insight-${ins.id}`} />)}
        </SectionCard>

        <SectionCard title="Priority Actions" subtitle="Recommended next steps" testId="priority-actions-card">
          <div className="space-y-2">
            {priorityActions.map((a) => (
              <button key={a.id} onClick={() => setActiveAction(a)}
                data-testid={`priority-action-${a.id}`}
                className="w-full flex items-center gap-3 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50 p-3 text-left transition-colors">
                <PriorityBadge priority={a.priority} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-800 truncate">{a.action}</div>
                  <div className="text-[11px] text-slate-400 truncate">{a.customerName} · {a.reason}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 shrink-0" />
              </button>
            ))}
          </div>
        </SectionCard>
      </div>

      <ActionDrawer action={activeAction} open={!!activeAction} onOpenChange={(o) => !o && setActiveAction(null)} />
    </div>
  );
}

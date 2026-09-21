import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import {
  AlertTriangle, DollarSign, Activity, CalendarClock, Ticket, ArrowRight, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import { portfolio, customers, insights } from "@/data/dataset";
import { useData } from "@/context/DataContext";
import { KpiCard } from "@/components/shared/KpiCard";
import { KpiGrid } from "@/components/shared/Layout";
import { SectionCard } from "@/components/shared/SectionCard";
import { DataTable } from "@/components/shared/DataTable";
import { InsightCard } from "@/components/shared/InsightCard";
import { StatusBadge, PriorityBadge, RiskBadge } from "@/components/shared/Badges";
import { cn } from "@/lib/utils";
import { fmtCurrency, fmtCurrencyFull, fmtPct, fmtDate, fmtDelta } from "@/lib/format";
import { STATUS_CHART, TONE_TEXT } from "@/lib/status";
import { CHART_TOOLTIP_STYLE, primaryRiskDriver } from "@/lib/intel";

export default function HealthRenewal() {
  const navigate = useNavigate();
  const { portfolio, customers, insights } = useData();

  const riskCustomers = customers.filter((c) => c.hasRisk).sort((a, b) => b.revenueAtRisk - a.revenueAtRisk);
  const avgResolution = Math.round(customers.reduce((s, c) => s + c.support.avgResolutionDays, 0) / customers.length * 10) / 10;

  // aggregate health drivers (portfolio-level contribution)
  const driverNames = ["Product Usage", "Feature Adoption", "License Utilization", "Engagement", "Support Friction", "Renewal Proximity"];
  const aggDrivers = driverNames.map((name) => {
    const rows = customers.map((c) => c.healthDrivers.find((d) => d.name === name));
    const pos = rows.filter((d) => d.contribution === "positive").length;
    const neg = rows.filter((d) => d.contribution === "negative").length;
    return { name, pos, neg, direction: pos >= neg ? "up" : "down", contribution: pos >= neg ? "positive" : "negative" };
  });

  const supportTrend = portfolio.healthTrend.map((h, i) => ({
    month: h.month,
    tickets: Math.round(customers.reduce((s, c) => s + (c.support.trend[i - 6] ? c.support.trend[i - 6].tickets : 0), 0)),
  })).slice(6);

  const riskInsights = insights.filter((i) => i.type === "Risk").slice(0, 4);

  return (
    <div className="space-y-6" data-testid="health-renewal-page">
      <p className="text-sm text-slate-500">Which customers are at risk, what is driving the risk, and how close are they to renewal.</p>

      <KpiGrid className="xl:grid-cols-4">
        <KpiCard testId="hr-kpi-at-risk" label="Customers at Risk" value={portfolio.customersAtRisk} icon={AlertTriangle} tone="risk" />
        <KpiCard testId="hr-kpi-rev-risk" label="Revenue at Risk" value={fmtCurrency(portfolio.revenueAtRisk)} icon={DollarSign} tone="risk" />
        <KpiCard testId="hr-kpi-health" label="Avg Health Score" value={portfolio.avgHealthScore} change={portfolio.healthChange} icon={Activity} />
        <KpiCard testId="hr-kpi-renewals" label="Upcoming Renewals" value={portfolio.upcomingRenewals} icon={CalendarClock} description="within 90 days" />
        <KpiCard testId="hr-kpi-critical" label="Critical Tickets" value={portfolio.criticalTickets} icon={Ticket} tone="warning" />
        <KpiCard testId="hr-kpi-open-rate" label="Open Ticket Rate" value={fmtPct(portfolio.openTicketRate)} icon={Ticket} />
        <KpiCard testId="hr-kpi-ticket-growth" label="Ticket Growth %" value={fmtDelta(portfolio.ticketGrowth)} icon={Ticket} tone={portfolio.ticketGrowth > 0 ? "warning" : "positive"} />
        <KpiCard testId="hr-kpi-resolution" label="Avg Resolution" value={`${avgResolution}d`} icon={Ticket} />
      </KpiGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Health Distribution" testId="hr-health-dist-card">
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={portfolio.healthDistribution} dataKey="value" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={2}>
                  {portfolio.healthDistribution.map((e) => <Cell key={e.name} fill={STATUS_CHART[e.name]} />)}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {portfolio.healthDistribution.map((e) => (
                <div key={e.name} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_CHART[e.name] }} />
                  <span className="text-slate-600">{e.name}</span><span className="ml-auto font-semibold text-slate-900">{e.value}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Health Trend" subtitle="Average health over 2025" className="lg:col-span-2" testId="hr-health-trend-card">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Health Drivers" subtitle="Portfolio contribution by factor" testId="hr-drivers-card">
          <div className="space-y-2.5">
            {aggDrivers.map((d) => {
              const Icon = d.direction === "up" ? ArrowUpRight : d.direction === "down" ? ArrowDownRight : Minus;
              return (
                <div key={d.name} className="flex items-center gap-3">
                  <span className={cn("h-7 w-7 rounded-md flex items-center justify-center shrink-0", d.contribution === "positive" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}><Icon className="h-4 w-4" /></span>
                  <span className="text-sm text-slate-700 w-40">{d.name}</span>
                  <div className="flex-1 flex items-center gap-1 h-2 rounded-full overflow-hidden bg-slate-100">
                    <div className="h-full bg-emerald-400" style={{ width: `${d.pos / customers.length * 100}%` }} />
                    <div className="h-full bg-rose-400" style={{ width: `${d.neg / customers.length * 100}%` }} />
                  </div>
                  <span className="text-xs font-mono text-slate-500 w-16 text-right">+{d.pos} / -{d.neg}</span>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Support / Friction" subtitle="Support signals feeding health" testId="hr-support-card">
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[["Ticket Growth", fmtDelta(portfolio.ticketGrowth)], ["Open Rate", fmtPct(portfolio.openTicketRate)], ["Critical", portfolio.criticalTickets]].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
                <div className="text-[11px] text-slate-400">{l}</div><div className="font-display font-bold text-lg text-slate-900">{v}</div>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={supportTrend} margin={{ left: -24, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Bar dataKey="tickets" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <SectionCard title="Renewal Timeline" subtitle="Revenue at risk by renewal window" testId="hr-renewal-timeline-card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {portfolio.revenueAtRiskByBucket.map((b) => (
            <div key={b.bucket} className={cn("rounded-xl border p-4", b.bucket === "0–30 days" ? "border-rose-200 bg-rose-50" : b.bucket === "31–90 days" ? "border-amber-200 bg-amber-50" : "border-slate-200")}>
              <div className="text-xs font-semibold text-slate-500">{b.bucket}</div>
              <div className="font-display text-2xl font-bold text-slate-900 mt-2">{b.customers}</div>
              <div className="text-xs text-slate-400">customers</div>
              <div className="mt-3 pt-3 border-t border-slate-200/70 space-y-1">
                <div className="flex justify-between text-xs"><span className="text-slate-500">ARR</span><span className="font-semibold text-slate-800">{fmtCurrency(b.arr)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-500">At Risk</span><span className="font-semibold text-rose-600">{fmtCurrency(b.revenueAtRisk)}</span></div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Renewal Risk" subtitle="Click a customer to open Customer 360" testId="hr-risk-table-card">
        <DataTable testId="renewal-risk-table" rows={riskCustomers} pageSize={10}
          exportable
          exportFilename="ali-renewal-risk.csv"
          exportColumns={[
            { header: "Customer", value: (r) => r.name },
            { header: "Renewal Date", value: (r) => fmtDate(r.renewalDate) },
            { header: "Days to Renewal", value: (r) => r.daysToRenewal },
            { header: "ARR", value: (r) => r.arr },
            { header: "Health", value: (r) => r.healthStatus },
            { header: "Renewal Risk", value: (r) => r.renewalRisk },
            { header: "Primary Driver", value: (r) => primaryRiskDriver(r) },
            { header: "Revenue at Risk", value: (r) => r.revenueAtRisk },
            { header: "Priority", value: (r) => r.riskPriority },
          ]}
          onRowClick={(r) => navigate(`/customer360/${r.id}`)} rowTestId={(r) => `renewal-risk-row-${r.id}`}
          columns={[
            { key: "name", header: "Customer", sortable: true, render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
            { key: "renewalDate", header: "Renewal Date", sortable: true, sortValue: (r) => r.daysToRenewal, render: (r) => fmtDate(r.renewalDate) },
            { key: "daysToRenewal", header: "Days", sortable: true, align: "right", render: (r) => <span className={r.daysToRenewal <= 60 ? "text-rose-600 font-semibold" : ""}>{r.daysToRenewal}</span> },
            { key: "arr", header: "ARR", sortable: true, align: "right", render: (r) => fmtCurrency(r.arr) },
            { key: "healthStatus", header: "Health", render: (r) => <StatusBadge status={r.healthStatus} /> },
            { key: "renewalRisk", header: "Renewal Risk", render: (r) => <RiskBadge risk={r.renewalRisk} /> },
            { key: "driver", header: "Primary Driver", render: (r) => <span className="text-slate-500 text-xs">{primaryRiskDriver(r)}</span> },
            { key: "revenueAtRisk", header: "Rev at Risk", sortable: true, align: "right", render: (r) => <span className="font-semibold text-rose-600">{fmtCurrency(r.revenueAtRisk)}</span> },
            { key: "riskPriority", header: "Priority", render: (r) => <PriorityBadge priority={r.riskPriority} /> },
          ]} />
      </SectionCard>

      <SectionCard title="Risk Evidence" subtitle="What happened · Why · Evidence" bodyClassName="grid grid-cols-1 lg:grid-cols-2 gap-3" testId="hr-risk-evidence-card">
        {riskInsights.map((ins) => <InsightCard key={ins.id} insight={ins} testId={`hr-insight-${ins.id}`} />)}
      </SectionCard>
    </div>
  );
}

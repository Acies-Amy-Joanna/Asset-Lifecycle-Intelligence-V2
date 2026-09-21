import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, PieChart, Pie,
} from "recharts";
import { Users, TrendingUp, Layers, Gauge, ArrowRight } from "lucide-react";
import { useData } from "@/context/DataContext";
import { KpiCard } from "@/components/shared/KpiCard";
import { KpiGrid } from "@/components/shared/Layout";
import { SectionCard } from "@/components/shared/SectionCard";
import { DataTable } from "@/components/shared/DataTable";
import { PriorityBadge } from "@/components/shared/Badges";
import {
  Tabs, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { fmtCurrency, fmtNumber, fmtCompact, fmtPct, fmtDelta } from "@/lib/format";
import { CHART_COLORS } from "@/lib/status";
import { CHART_TOOLTIP_STYLE } from "@/lib/intel";

export default function Adoption() {
  const navigate = useNavigate();
  const [metric, setMetric] = useState("usageVolume");
  const { portfolio, portfolioUsageTrend, portfolioFeatures, adoptionStageDistribution, anomalies, customers } = useData();

  const totalActive = customers.reduce((s, c) => s + c.activeUsers, 0);
  const avgUsageGrowth = Math.round(customers.reduce((s, c) => s + c.usageGrowth, 0) / customers.length * 10) / 10;
  const avgAdoption = Math.round(customers.reduce((s, c) => s + c.featureAdoption, 0) / customers.length * 10) / 10;
  const avgUtil = Math.round(customers.reduce((s, c) => s + c.licenseUtilization, 0) / customers.length * 10) / 10;
  const cur = portfolioUsageTrend[11];
  const gaps = portfolioFeatures.filter((f) => f.gap > 0).sort((a, b) => b.gap - a.gap);

  const metricLabel = { usageVolume: "Usage Volume", activeUsers: "Active Users", usageGrowth: "Usage Growth %" }[metric];

  return (
    <div className="space-y-6" data-testid="adoption-page">
      <p className="text-sm text-slate-500">How are customers using the product, and where are the adoption or utilization gaps.</p>

      <KpiGrid className="xl:grid-cols-4">
        <KpiCard testId="adopt-kpi-active" label="Active Users" value={fmtNumber(totalActive)} icon={Users} description="across portfolio" />
        <KpiCard testId="adopt-kpi-growth" label="Usage Growth %" value={fmtDelta(avgUsageGrowth)} icon={TrendingUp} tone={avgUsageGrowth < 0 ? "risk" : "positive"} />
        <KpiCard testId="adopt-kpi-adoption" label="Feature Adoption %" value={fmtPct(avgAdoption)} icon={Layers} />
        <KpiCard testId="adopt-kpi-util" label="License Utilization %" value={fmtPct(avgUtil)} icon={Gauge} />
      </KpiGrid>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[["DAU", fmtNumber(cur.dau)], ["WAU", fmtNumber(cur.wau)], ["MAU", fmtNumber(cur.mau)], ["Usage Volume", fmtNumber(cur.usageVolume)], ["Active User Growth", fmtDelta(avgUsageGrowth)], ["Avg Usage Days", "21 / mo"]].map(([l, v]) => (
          <div key={l} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">{l}</div>
            <div className="font-display text-lg font-bold text-slate-900 mt-1">{v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Product Usage Trend" subtitle="January – December 2025" className="lg:col-span-2"
          action={<Tabs value={metric} onValueChange={setMetric}><TabsList className="h-8">
            <TabsTrigger value="usageVolume" className="text-xs" data-testid="usage-tab-volume">Volume</TabsTrigger>
            <TabsTrigger value="activeUsers" className="text-xs" data-testid="usage-tab-users">Users</TabsTrigger>
            <TabsTrigger value="usageGrowth" className="text-xs" data-testid="usage-tab-growth">Growth %</TabsTrigger>
          </TabsList></Tabs>}
          testId="usage-trend-card">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={portfolioUsageTrend} margin={{ left: -8, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={52} tickFormatter={(v) => metric === "usageGrowth" ? `${v}%` : fmtNumber(v)} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => [metric === "usageGrowth" ? `${v}%` : fmtNumber(v), metricLabel]} />
              <Line type="monotone" dataKey={metric} stroke="#2563EB" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="DAU / WAU / MAU" subtitle="Engagement ratio" testId="dau-wau-mau-card">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={portfolioUsageTrend} margin={{ left: -18, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={40} tickFormatter={fmtCompact} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => fmtNumber(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="dau" stroke="#2563EB" strokeWidth={2} dot={false} name="DAU" />
              <Line type="monotone" dataKey="wau" stroke="#6366F1" strokeWidth={2} dot={false} name="WAU" />
              <Line type="monotone" dataKey="mau" stroke="#10B981" strokeWidth={2} dot={false} name="MAU" />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <SectionCard title="Feature Adoption" subtitle="Adoption across the portfolio" testId="feature-adoption-card">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={portfolioFeatures} layout="vertical" margin={{ left: 30, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="feature" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} width={108} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "Adoption"]} />
              <Bar dataKey="adoptionPct" radius={[0, 4, 4, 0]} maxBarSize={16}>
                {portfolioFeatures.map((f, i) => <Cell key={i} fill={f.adoptionPct >= f.benchmark ? "#10B981" : "#F59E0B"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <DataTable testId="feature-adoption-table" rows={portfolioFeatures} pageSize={8}
            columns={[
              { key: "feature", header: "Feature", render: (r) => <span className="font-medium text-slate-800">{r.feature}</span> },
              { key: "eligibleUsers", header: "Eligible", align: "right", render: (r) => fmtNumber(r.eligibleUsers) },
              { key: "adopters", header: "Adopters", align: "right", render: (r) => fmtNumber(r.adopters) },
              { key: "adoptionPct", header: "Adoption %", align: "right", render: (r) => fmtPct(r.adoptionPct) },
              { key: "adoptionChange", header: "Change", align: "right", render: (r) => <span className={r.adoptionChange >= 0 ? "text-emerald-600" : "text-rose-600"}>{fmtDelta(r.adoptionChange)}</span> },
            ]} />
        </div>
      </SectionCard>

      <SectionCard title="Feature Adoption Gaps" subtitle="Available but underused features" testId="adoption-gaps-card">
        <DataTable testId="adoption-gaps-table" rows={gaps} pageSize={6}
          columns={[
            { key: "feature", header: "Feature", render: (r) => <span className="font-medium text-slate-800">{r.feature}</span> },
            { key: "eligibleUsers", header: "Eligible", align: "right", render: (r) => fmtNumber(r.eligibleUsers) },
            { key: "adopters", header: "Adopters", align: "right", render: (r) => fmtNumber(r.adopters) },
            { key: "adoptionPct", header: "Adoption %", align: "right", render: (r) => fmtPct(r.adoptionPct) },
            { key: "benchmark", header: "Benchmark", align: "right", render: (r) => fmtPct(r.benchmark) },
            { key: "gap", header: "Gap", align: "right", render: (r) => <span className="text-amber-600 font-semibold">{fmtPct(r.gap)}</span> },
            { key: "customersAffected", header: "Customers", align: "right", render: (r) => r.customersAffected },
          ]} />
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Adoption Stage" subtitle="Derived customer distribution" testId="adoption-stage-card">
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={adoptionStageDistribution} dataKey="count" nameKey="stage" innerRadius={42} outerRadius={70} paddingAngle={2}>
                  {adoptionStageDistribution.map((e, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {adoptionStageDistribution.map((e, i) => (
                <div key={e.stage} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i] }} />
                  <span className="text-slate-600">{e.stage}</span>
                  <span className="ml-auto font-semibold text-slate-900">{e.count}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="License Utilization Distribution" testId="license-util-card">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={[
              { band: "<50%", count: customers.filter((c) => c.licenseUtilization < 50).length },
              { band: "50–70%", count: customers.filter((c) => c.licenseUtilization >= 50 && c.licenseUtilization < 70).length },
              { band: "70–85%", count: customers.filter((c) => c.licenseUtilization >= 70 && c.licenseUtilization < 85).length },
              { band: "85%+", count: customers.filter((c) => c.licenseUtilization >= 85).length },
            ]} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="band" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <SectionCard title="Usage Anomalies" subtitle="Click an anomaly to open Customer 360" testId="anomalies-card">
        <DataTable testId="anomalies-table" rows={anomalies} pageSize={8}
          onRowClick={(r) => navigate(`/customer360/${r.customerId}`)}
          rowTestId={(r) => `anomaly-row-${r.id}`}
          columns={[
            { key: "customerName", header: "Customer", render: (r) => <span className="font-medium text-slate-900">{r.customerName}</span> },
            { key: "signal", header: "Signal", render: (r) => <span className="text-slate-700">{r.signal}</span> },
            { key: "metric", header: "Metric", render: (r) => <span className="text-slate-500">{r.metric}</span> },
            { key: "currentValue", header: "Current", align: "right" },
            { key: "baseline", header: "Baseline", align: "right", render: (r) => <span className="text-slate-500">{r.baseline}</span> },
            { key: "change", header: "Change", align: "right", render: (r) => <span className={r.change.startsWith("-") ? "text-rose-600 font-semibold" : "text-emerald-600 font-semibold"}>{r.change}</span> },
            { key: "period", header: "Period", render: (r) => <span className="text-slate-400 text-xs">{r.period}</span> },
            { key: "impact", header: "Impact", render: (r) => <PriorityBadge priority={r.impact} /> },
            { key: "go", header: "", render: () => <ArrowRight className="h-4 w-4 text-slate-300" /> },
          ]} />
      </SectionCard>
    </div>
  );
}

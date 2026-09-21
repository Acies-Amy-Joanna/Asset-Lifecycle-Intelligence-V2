import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import {
  Activity, Users, Gauge, TrendingUp, Layers, CalendarClock, DollarSign, AlertTriangle,
  ChevronDown, ArrowRight, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { useApp } from "@/context/AppContext";
import { KpiCard } from "@/components/shared/KpiCard";
import { SectionCard } from "@/components/shared/SectionCard";
import { EvidenceList } from "@/components/shared/EvidenceList";
import { ActionDrawer } from "@/components/shared/ActionDrawer";
import { StatusBadge, PriorityBadge, RiskBadge, TypeBadge, ReadinessBadge } from "@/components/shared/Badges";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fmtCurrency, fmtCurrencyFull, fmtCompact, fmtPct, fmtDate, fmtDelta } from "@/lib/format";
import { STATUS_CHART, TONE_TEXT } from "@/lib/status";
import { CHART_TOOLTIP_STYLE, healthColor } from "@/lib/intel";

export default function Customer360() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedCustomerId, setSelectedCustomerId } = useApp();
  const { customers, getCustomer } = useData();
  const [evidenceOpen, setEvidenceOpen] = useState(true);
  const [activeAction, setActiveAction] = useState(null);

  const activeId = id || selectedCustomerId;
  useEffect(() => { if (id) setSelectedCustomerId(id); }, [id, setSelectedCustomerId]);

  const c = getCustomer(activeId) || customers[0];

  return (
    <div className="space-y-6" data-testid="customer360-page">
      {/* header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-14 w-14 rounded-xl bg-slate-900 text-white flex items-center justify-center font-display font-bold text-lg shrink-0">{c.initials}</div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="font-display font-bold text-xl text-slate-900">{c.name}</h2>
                <StatusBadge status={c.healthStatus} />
              </div>
              <div className="text-sm text-slate-400 font-mono mt-0.5">{c.id} · {c.segment} · {c.industry} · {c.region}</div>
            </div>
          </div>
          <div className="w-52">
            <Select value={c.id} onValueChange={(v) => navigate(`/customer360/${v}`)}>
              <SelectTrigger className="h-9" data-testid="customer-switcher"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {customers.map((cc) => <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mt-5 pt-5 border-t border-slate-100">
          {[
            ["Product", c.product], ["Plan", c.plan],
            ["Contract Start", fmtDate(c.contractStart)], ["Renewal Date", fmtDate(c.renewalDate)],
            ["ARR", fmtCurrencyFull(c.arr)], ["Total Users", c.totalUsers.toLocaleString()],
            ["Licenses", c.purchasedLicenses.toLocaleString()],
          ].map(([l, v]) => (
            <div key={l}><div className="text-[11px] uppercase tracking-wider text-slate-400">{l}</div><div className="text-sm font-semibold text-slate-800 mt-0.5">{v}</div></div>
          ))}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard testId="c360-kpi-health" label="Health Score" value={c.healthScore} change={c.healthChange} changeInvert={false} description="vs last month" tone={c.healthStatus === "At Risk" ? "risk" : c.healthStatus === "Monitor" ? "warning" : "positive"} />
        <KpiCard testId="c360-kpi-active-users" label="Active Users" value={c.activeUsers.toLocaleString()} change={c.activeUserGrowth} icon={Users} />
        <KpiCard testId="c360-kpi-util" label="License Util %" value={fmtPct(c.licenseUtilization)} change={c.licenseUtilizationChange} icon={Gauge} />
        <KpiCard testId="c360-kpi-usage" label="Usage Growth %" value={fmtDelta(c.usageGrowth)} icon={TrendingUp} tone={c.usageGrowth < 0 ? "risk" : "positive"} />
        <KpiCard testId="c360-kpi-adoption" label="Feature Adoption %" value={fmtPct(c.featureAdoption)} icon={Layers} />
        <KpiCard testId="c360-kpi-renewal" label="Days to Renewal" value={c.daysToRenewal} icon={CalendarClock} tone={c.daysToRenewal <= 60 ? "risk" : "default"} />
        <KpiCard testId="c360-kpi-arr" label="ARR" value={fmtCurrency(c.arr)} icon={DollarSign} />
        <KpiCard testId="c360-kpi-rev-risk" label="Revenue at Risk" value={fmtCurrency(c.revenueAtRisk)} icon={AlertTriangle} tone="risk" />
        <KpiCard testId="c360-kpi-opp" label="Opportunity Value" value={fmtCurrency(c.opportunityValue)} icon={TrendingUp} tone="opportunity" />
        <KpiCard testId="c360-kpi-churn" label="Churn Risk" value={c.churnRisk} tone={c.churnRisk === "High" ? "risk" : c.churnRisk === "Medium" ? "warning" : "positive"} />
      </div>

      {/* Adoption & Utilization */}
      <SectionCard title="Adoption & Utilization"
        action={<Button variant="outline" size="sm" onClick={() => navigate("/adoption")} data-testid="c360-goto-adoption">Open Adoption <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button>}
        testId="c360-adoption-card">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-2">Usage Trend (2025)</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={c.monthly} margin={{ left: -18, right: 8, top: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={40} tickFormatter={fmtCompact} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="usageVolume" stroke="#2563EB" strokeWidth={2.5} dot={false} name="Usage" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-2">Feature Adoption</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={c.features} layout="vertical" margin={{ left: 40, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#64748B" }} axisLine={false} tickLine={false} width={92} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "Adoption"]} />
                <Bar dataKey="adoptionPct" radius={[0, 4, 4, 0]} maxBarSize={14}>
                  {c.features.map((f, i) => <Cell key={i} fill={f.adoptionPct >= f.benchmark ? "#10B981" : "#F59E0B"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5 pt-5 border-t border-slate-100">
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-3">License Utilization</div>
            <div className="space-y-3">
              {[["Purchased", c.purchasedLicenses, 100], ["Assigned", c.assignedLicenses, c.assignedLicenses / c.purchasedLicenses * 100], ["Active", c.activeLicenses, c.licenseUtilization]].map(([l, v, p]) => (
                <div key={l}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">{l}</span><span className="font-semibold text-slate-800">{v.toLocaleString()}</span></div>
                  <Progress value={p} className="h-2" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-3">Adoption Gaps</div>
            {c.adoptionGaps.length === 0 ? <p className="text-sm text-slate-400">No significant adoption gaps.</p> : (
              <div className="space-y-2">
                {c.adoptionGaps.slice(0, 4).map((f) => (
                  <div key={f.name} className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                    <span className="text-sm text-slate-700">{f.name}</span>
                    <span className="text-xs font-semibold text-amber-700">{f.adoptionPct}% <span className="text-slate-400">/ {f.benchmark}% target</span></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Risk Drivers & Evidence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Health & Renewal"
          action={<Button variant="outline" size="sm" onClick={() => navigate("/health")} data-testid="c360-goto-health">Health & Renewal <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button>}
          testId="c360-health-card">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke={healthColor(c.healthScore)} strokeWidth="3" strokeDasharray={`${c.healthScore}, 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display font-bold text-xl text-slate-900">{c.healthScore}</span>
                <span className="text-[10px] text-slate-400">health</span>
              </div>
            </div>
            <div className="space-y-1.5 text-sm flex-1">
              <div className="flex justify-between"><span className="text-slate-500">Status</span><StatusBadge status={c.healthStatus} /></div>
              <div className="flex justify-between"><span className="text-slate-500">Renewal Risk</span><RiskBadge risk={c.renewalRisk} /></div>
              <div className="flex justify-between"><span className="text-slate-500">Renewal Date</span><span className="font-medium text-slate-800">{fmtDate(c.renewalDate)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Revenue at Risk</span><span className="font-semibold text-rose-600">{fmtCurrency(c.revenueAtRisk)}</span></div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={c.healthTrend} margin={{ left: -20, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="health" stroke={healthColor(c.healthScore)} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Risk Drivers & Evidence" subtitle="Why ALI flagged this account" testId="c360-risk-card">
          <div className={cn("rounded-lg border p-3 mb-4", c.hasRisk ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200")}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={cn("h-4 w-4", c.hasRisk ? "text-rose-600" : "text-emerald-600")} />
              <span className="text-sm font-semibold text-slate-800">{c.riskSummary}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed"><span className="font-semibold">Why:</span> {c.riskWhy}</p>
          </div>
          <div className="space-y-2 mb-3">
            {c.healthDrivers.map((d) => {
              const Icon = d.direction === "up" ? ArrowUpRight : d.direction === "down" ? ArrowDownRight : Minus;
              return (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-6 w-6 rounded-md flex items-center justify-center", d.contribution === "positive" ? "bg-emerald-50 text-emerald-600" : d.contribution === "negative" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-400")}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-slate-600">{d.name}</span>
                  </div>
                  <span className={cn("font-mono text-xs font-semibold", TONE_TEXT[d.contribution])}>{d.value}</span>
                </div>
              );
            })}
          </div>
          <button onClick={() => setEvidenceOpen((v) => !v)} data-testid="c360-evidence-toggle"
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 mb-2">
            {evidenceOpen ? "Hide" : "Show"} evidence <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", evidenceOpen && "rotate-180")} />
          </button>
          {evidenceOpen && <EvidenceList items={c.riskEvidence} columns={2} />}
        </SectionCard>
      </div>

      {/* Growth & Expansion */}
      <SectionCard title="Growth & Expansion"
        action={<Button variant="outline" size="sm" onClick={() => navigate("/growth")} data-testid="c360-goto-growth">Growth & Expansion <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button>}
        testId="c360-growth-card">
        {c.opportunities.length === 0 ? <p className="text-sm text-slate-400">No active expansion opportunities identified.</p> : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {c.opportunities.map((o) => (
              <div key={o.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <TypeBadge type={o.type} />
                  <div className="flex items-center gap-2"><ReadinessBadge readiness={o.readiness} /><PriorityBadge priority={o.priority} /></div>
                </div>
                <div className="font-semibold text-slate-800 text-sm">{o.opportunity}</div>
                <div className="text-xs text-slate-500 mt-1">{o.reason}</div>
                <div className="font-display text-xl font-bold text-indigo-600 mt-2">{fmtCurrencyFull(o.value)}</div>
                <div className="mt-3"><EvidenceList items={o.evidence} columns={2} /></div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Recommended Actions */}
      <SectionCard title="Recommended Actions" testId="c360-actions-card">
        {c.recommendedActions.length === 0 ? <p className="text-sm text-slate-400">No recommended actions.</p> : (
          <div className="space-y-2">
            {c.recommendedActions.map((a) => (
              <button key={a.id} onClick={() => setActiveAction(a)} data-testid={`c360-action-${a.id}`}
                className="w-full flex items-center gap-3 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50 p-3 text-left transition-colors">
                <PriorityBadge priority={a.priority} />
                <TypeBadge type={a.type} />
                <div className="min-w-0 flex-1"><div className="text-sm font-medium text-slate-800 truncate">{a.action}</div><div className="text-[11px] text-slate-400 truncate">{a.reason}</div></div>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", a.status === "Open" ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400")}>{a.status}</span>
                <ArrowRight className="h-4 w-4 text-slate-300 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </SectionCard>

      <ActionDrawer action={activeAction} open={!!activeAction} onOpenChange={(o) => !o && setActiveAction(null)} />
    </div>
  );
}

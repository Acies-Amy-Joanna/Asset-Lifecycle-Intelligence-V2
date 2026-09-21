import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Cell, ReferenceLine,
} from "recharts";
import { Search, X, Users, Activity, AlertTriangle, DollarSign, Target, TrendingUp } from "lucide-react";
import { useData } from "@/context/DataContext";
import { SEGMENTS, HEALTH_STATUSES, PRODUCTS } from "@/lib/constants";
import { KpiCard } from "@/components/shared/KpiCard";
import { KpiGrid } from "@/components/shared/Layout";
import { SectionCard } from "@/components/shared/SectionCard";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge, PriorityBadge } from "@/components/shared/Badges";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fmtCurrency, fmtPct } from "@/lib/format";
import { STATUS_CHART } from "@/lib/status";
import { CHART_TOOLTIP_STYLE } from "@/lib/intel";

const ALL = "all";

export default function Customers() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { customers } = useData();
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState(ALL);
  const [segment, setSegment] = useState(ALL);
  const [status, setStatus] = useState(params.get("risk") === "true" ? "At Risk" : ALL);
  const [util, setUtil] = useState(ALL);
  const [trend, setTrend] = useState(ALL);
  const [renewal, setRenewal] = useState(ALL);
  const [hasOpp, setHasOpp] = useState(ALL);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.id.toLowerCase().includes(q)) return false;
      }
      if (product !== ALL && !c.products.includes(product)) return false;
      if (segment !== ALL && c.segment !== segment) return false;
      if (status !== ALL && c.healthStatus !== status) return false;
      if (util === "high" && c.licenseUtilization < 80) return false;
      if (util === "low" && c.licenseUtilization >= 60) return false;
      if (trend === "up" && c.usageGrowth <= 0) return false;
      if (trend === "down" && c.usageGrowth >= 0) return false;
      if (renewal !== ALL) {
        const d = c.daysToRenewal;
        if (renewal === "0-30" && !(d <= 30)) return false;
        if (renewal === "31-90" && !(d > 30 && d <= 90)) return false;
        if (renewal === "91-180" && !(d > 90 && d <= 180)) return false;
        if (renewal === "180+" && !(d > 180)) return false;
      }
      if (hasOpp === "yes" && c.opportunities.length === 0) return false;
      return true;
    });
  }, [search, product, segment, status, util, trend, renewal, hasOpp]);

  const chips = [];
  if (product !== ALL) chips.push(["Product: " + product, () => setProduct(ALL)]);
  if (segment !== ALL) chips.push(["Segment: " + segment, () => setSegment(ALL)]);
  if (status !== ALL) chips.push(["Health: " + status, () => setStatus(ALL)]);
  if (util !== ALL) chips.push(["Utilization: " + (util === "high" ? "High ≥80%" : "Low <60%"), () => setUtil(ALL)]);
  if (trend !== ALL) chips.push(["Usage: " + (trend === "up" ? "Growing" : "Declining"), () => setTrend(ALL)]);
  if (renewal !== ALL) chips.push(["Renewal: " + renewal, () => setRenewal(ALL)]);
  if (hasOpp !== ALL) chips.push(["Has opportunity", () => setHasOpp(ALL)]);

  const clearAll = () => { setProduct(ALL); setSegment(ALL); setStatus(ALL); setUtil(ALL); setTrend(ALL); setRenewal(ALL); setHasOpp(ALL); setSearch(""); };

  const agg = useMemo(() => {
    const n = filtered.length || 1;
    return {
      count: filtered.length,
      avgHealth: Math.round(filtered.reduce((s, c) => s + c.healthScore, 0) / n),
      atRisk: filtered.filter((c) => c.healthStatus === "At Risk").length,
      revAtRisk: filtered.reduce((s, c) => s + c.revenueAtRisk, 0),
      opps: filtered.reduce((s, c) => s + c.opportunities.length, 0),
      expansion: filtered.reduce((s, c) => s + c.opportunityValue, 0),
    };
  }, [filtered]);

  const scatterData = filtered.map((c) => ({ x: c.healthScore, y: c.licenseUtilization, name: c.name, status: c.healthStatus }));

  const FilterSelect = ({ value, onChange, testId, placeholder, options }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-full" data-testid={testId}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6" data-testid="customers-page">
      <p className="text-sm text-slate-500">Which customers should I look at?</p>

      <KpiGrid>
        <KpiCard testId="cust-kpi-total" label="Total Customers" value={agg.count} icon={Users} description="matching filters" />
        <KpiCard testId="cust-kpi-avg-health" label="Avg Health Score" value={agg.avgHealth} icon={Activity} description="portfolio" />
        <KpiCard testId="cust-kpi-at-risk" label="Customers at Risk" value={agg.atRisk} icon={AlertTriangle} tone="risk" />
        <KpiCard testId="cust-kpi-rev-risk" label="Revenue at Risk" value={fmtCurrency(agg.revAtRisk)} icon={DollarSign} tone="risk" />
        <KpiCard testId="cust-kpi-opps" label="Opportunities" value={agg.opps} icon={Target} tone="opportunity" />
        <KpiCard testId="cust-kpi-expansion" label="Expansion Potential" value={fmtCurrency(agg.expansion)} icon={TrendingUp} tone="opportunity" />
      </KpiGrid>

      <SectionCard title="Filters" action={chips.length > 0 && (
        <Button variant="ghost" size="sm" onClick={clearAll} data-testid="clear-filters-button" className="text-slate-500">
          <X className="h-3.5 w-3.5 mr-1" /> Clear ({chips.length})
        </Button>
      )} testId="filters-card">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by customer name or ID…"
            className="pl-9 h-9" data-testid="customer-search-input" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
          <FilterSelect value={product} onChange={setProduct} testId="filter-product" placeholder="Product"
            options={[{ v: ALL, l: "All Products" }, ...PRODUCTS.map((p) => ({ v: p, l: p }))]} />
          <FilterSelect value={segment} onChange={setSegment} testId="filter-segment" placeholder="Segment"
            options={[{ v: ALL, l: "All Segments" }, ...SEGMENTS.map((s) => ({ v: s, l: s }))]} />
          <FilterSelect value={status} onChange={setStatus} testId="filter-health-status" placeholder="Health"
            options={[{ v: ALL, l: "All Health" }, ...HEALTH_STATUSES.map((s) => ({ v: s, l: s }))]} />
          <FilterSelect value={util} onChange={setUtil} testId="filter-utilization" placeholder="Utilization"
            options={[{ v: ALL, l: "All Utilization" }, { v: "high", l: "High ≥80%" }, { v: "low", l: "Low <60%" }]} />
          <FilterSelect value={trend} onChange={setTrend} testId="filter-usage-trend" placeholder="Usage Trend"
            options={[{ v: ALL, l: "All Trends" }, { v: "up", l: "Growing" }, { v: "down", l: "Declining" }]} />
          <FilterSelect value={renewal} onChange={setRenewal} testId="filter-renewal" placeholder="Renewal"
            options={[{ v: ALL, l: "All Renewals" }, { v: "0-30", l: "0–30 days" }, { v: "31-90", l: "31–90 days" }, { v: "91-180", l: "91–180 days" }, { v: "180+", l: "180+ days" }]} />
          <FilterSelect value={hasOpp} onChange={setHasOpp} testId="filter-opportunity" placeholder="Opportunity"
            options={[{ v: ALL, l: "All" }, { v: "yes", l: "Has opportunity" }]} />
        </div>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {chips.map(([label, clear], i) => (
              <Badge key={i} variant="outline" className="gap-1 pl-2.5 pr-1 py-1 bg-blue-50 text-blue-700 border-blue-200">
                {label}
                <button onClick={clear} className="hover:bg-blue-200 rounded-full p-0.5" data-testid={`chip-remove-${i}`}><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Customers" subtitle={`${filtered.length} accounts`} testId="customers-table-card">
        <DataTable
          testId="customers-table"
          rows={filtered}
          pageSize={10}
          exportable
          exportFilename="ali-customers.csv"
          exportColumns={[
            { header: "Customer", value: (r) => r.name },
            { header: "ID", value: (r) => r.id },
            { header: "Segment", value: (r) => r.segment },
            { header: "Product", value: (r) => r.product },
            { header: "Health Score", value: (r) => r.healthScore },
            { header: "Health Status", value: (r) => r.healthStatus },
            { header: "Active Users", value: (r) => r.activeUsers },
            { header: "License Util %", value: (r) => r.licenseUtilization },
            { header: "Usage Growth %", value: (r) => r.usageGrowth },
            { header: "Feature Adoption %", value: (r) => r.featureAdoption },
            { header: "Days to Renewal", value: (r) => r.daysToRenewal },
            { header: "Revenue at Risk", value: (r) => r.revenueAtRisk },
            { header: "Opportunity Value", value: (r) => r.opportunityValue },
            { header: "Priority", value: (r) => r.riskPriority },
          ]}
          onRowClick={(r) => navigate(`/customer360/${r.id}`)}
          rowTestId={(r) => `customer-row-${r.id}`}
          columns={[
            { key: "name", header: "Customer", sortable: true, render: (r) => <div><div className="font-medium text-slate-900">{r.name}</div><div className="text-[11px] text-slate-400 font-mono">{r.id} · {r.segment}</div></div> },
            { key: "product", header: "Product", render: (r) => <span className="text-slate-500">{r.product}</span> },
            { key: "healthScore", header: "Health", sortable: true, align: "right", render: (r) => <span className="font-mono font-semibold">{r.healthScore}</span> },
            { key: "healthStatus", header: "Status", render: (r) => <StatusBadge status={r.healthStatus} /> },
            { key: "activeUsers", header: "Active Users", sortable: true, align: "right", render: (r) => r.activeUsers.toLocaleString() },
            { key: "licenseUtilization", header: "License Util %", sortable: true, align: "right", render: (r) => fmtPct(r.licenseUtilization) },
            { key: "usageGrowth", header: "Usage Growth", sortable: true, align: "right", render: (r) => <span className={r.usageGrowth >= 0 ? "text-emerald-600" : "text-rose-600"}>{r.usageGrowth > 0 ? "+" : ""}{r.usageGrowth}%</span> },
            { key: "featureAdoption", header: "Adoption %", sortable: true, align: "right", render: (r) => fmtPct(r.featureAdoption) },
            { key: "daysToRenewal", header: "Renewal", sortable: true, align: "right", render: (r) => <span className={r.daysToRenewal <= 60 ? "text-rose-600 font-semibold" : ""}>{r.daysToRenewal}d</span> },
            { key: "revenueAtRisk", header: "Rev at Risk", sortable: true, align: "right", render: (r) => fmtCurrency(r.revenueAtRisk) },
            { key: "opportunityValue", header: "Opp Value", sortable: true, align: "right", render: (r) => <span className="text-indigo-600">{fmtCurrency(r.opportunityValue)}</span> },
            { key: "riskPriority", header: "Priority", render: (r) => <PriorityBadge priority={r.riskPriority} /> },
          ]}
        />
      </SectionCard>

      <SectionCard title="Health Score vs License Utilization" subtitle="Identify patterns across customers" testId="scatter-card">
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis type="number" dataKey="x" name="Health" domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} label={{ value: "Health Score", position: "insideBottom", offset: -4, fontSize: 11, fill: "#94A3B8" }} />
            <YAxis type="number" dataKey="y" name="Utilization" domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} label={{ value: "License Util %", angle: -90, position: "insideLeft", fontSize: 11, fill: "#94A3B8" }} />
            <ZAxis range={[80, 80]} />
            <ReferenceLine x={72} stroke="#CBD5E1" strokeDasharray="4 4" />
            <ReferenceLine y={80} stroke="#CBD5E1" strokeDasharray="4 4" />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ strokeDasharray: "3 3" }}
              formatter={(v, n) => [v, n === "x" ? "Health" : "Utilization %"]}
              labelFormatter={() => ""} content={({ payload }) => payload && payload[0] ? (
                <div style={CHART_TOOLTIP_STYLE} className="bg-white">
                  <div className="font-semibold text-slate-800 text-xs">{payload[0].payload.name}</div>
                  <div className="text-[11px] text-slate-500">Health {payload[0].payload.x} · Util {payload[0].payload.y}%</div>
                </div>) : null} />
            <Scatter data={scatterData}>
              {scatterData.map((d, i) => <Cell key={i} fill={STATUS_CHART[d.status]} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </SectionCard>
    </div>
  );
}

// ALI – Customer Intelligence Platform
// Real customer facts come from the uploaded workbook (ALI_Udemy_MVP_Mock_Data.xlsx),
// pre-aggregated into ./ali_data.json. All INTELLIGENCE below (health, status, risk,
// opportunity, readiness, priority, recommended actions) is DERIVED here from those raw facts.

import RAW from "./ali_data.json";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const YEAR = 2025;
export const REFERENCE_DATE = new Date(2025, 11, 31);

export const PRODUCTS = ["Udemy Business"];
export const CROSS_SELL_PRODUCT = "Udemy Leadership Academy";
export const FEATURE_NAMES = RAW[0].features.map((f) => f.name);
export const SEGMENTS = ["Enterprise", "Mid-Market", "SMB"];
export const HEALTH_STATUSES = ["Healthy", "Monitor", "At Risk"];
export const OPPORTUNITY_TYPES = ["Upsell", "Cross-sell", "License Expansion", "Whitespace"];
export const RENEWAL_BUCKETS = ["0–30 days", "31–90 days", "91–180 days", "180+ days"];

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const round = (n, dp = 0) => { const p = 10 ** dp; return Math.round((n + Number.EPSILON) * p) / p; };
const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const pct = (cur, prev) => (prev ? (cur - prev) / prev * 100 : 0);
const mapScore = (v, lo, hi) => clamp((v - lo) / (hi - lo) * 100, 0, 100);
const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);

const BENCH = {
  "Course Learning": 75, "Learning Paths": 60, "Course Assignments": 60,
  "Analytics & Insights": 45, "User Management": 55, "Custom Content": 40,
  "Integrations": 40, "Skill Insights": 45,
};

function build(c) {
  const m = c.monthly;
  const sess = m.map((x) => x.sessions);
  const usersM = m.map((x) => x.activeUsers);

  const cur3s = avg(sess.slice(9)), prev3s = avg(sess.slice(6, 9));
  const cur3u = avg(usersM.slice(9)), prev3u = avg(usersM.slice(6, 9));
  const usageGrowth = round(pct(cur3s, prev3s), 1);
  const activeUserGrowth = round(pct(cur3u, prev3u), 1);
  const usageVolume = sess[11];
  const activeUsers = usersM[11];
  const totalUsers = c.totalUsers;
  const activeUserPct = round(activeUsers / totalUsers * 100, 1);

  const purchasedLicenses = c.subscription.purchasedSeats;
  const assignedLicenses = c.subscription.assignedSeats;
  const activeLicenses = c.subscription.activeSeats;
  const licenseUtilization = round(activeLicenses / purchasedLicenses * 100, 1);
  const licenseUtilizationChange = round((usersM[11] - usersM[10]) / purchasedLicenses * 100, 1);
  const pricePerLicense = round(c.arr / purchasedLicenses);

  const features = c.features.map((f) => {
    const eligibleUsers = totalUsers;
    const adopters = f.adoptersLast3;
    const adoptionPct = round(adopters / eligibleUsers * 100, 1);
    const prevAdoptionPct = round(f.adoptersPrev3 / eligibleUsers * 100, 1);
    const adoptionChange = round(adoptionPct - prevAdoptionPct, 1);
    const benchmark = BENCH[f.name] ?? 55;
    const gap = round(Math.max(0, benchmark - adoptionPct), 1);
    return { name: f.name, category: f.category, eligibleUsers, adopters, adoptionPct, prevAdoptionPct, adoptionChange, benchmark, gap, usageVolume: f.sessions };
  });
  const featureAdoption = round(avg(features.map((f) => f.adoptionPct)), 1);
  const featuresUsed = features.filter((f) => f.adoptionPct >= 30).length;
  const adoptionGaps = features.filter((f) => f.gap > 0).sort((a, b) => b.gap - a.gap);

  const freqCur = cur3u ? cur3s / cur3u : 0;
  const freqPrev = prev3u ? prev3s / prev3u : 0;
  const engagementChange = round(pct(freqCur, freqPrev), 1);
  const usageFrequency = round(clamp(sess[11] / Math.max(activeUsers, 1) / 4.3, 0.2, 7), 1);
  const usageDays = round(clamp(sess[11] / Math.max(activeUsers, 1), 1, 30));
  const lastActivityDays = round(clamp(4 - usageGrowth / 10, 1, 26));

  const mau = activeUsers, wau = round(mau * 0.63), dau = round(wau * 0.42);

  const sp = c.support;
  const currentTickets = sp.lastMonth, prevTickets = sp.prevMonth;
  const totalTickets = sp.total, openTickets = sp.open, criticalTickets = sp.critical;
  const openTicketRate = round(totalTickets ? openTickets / totalTickets * 100 : 0, 1);
  const ticketGrowth = round(pct(currentTickets, prevTickets), 1);
  const avgResolutionDays = round(clamp(2 + criticalTickets * 0.12 + openTickets * 0.2, 1.2, 9), 1);
  const supportTrend = MONTHS.slice(6).map((mm, i) => ({ month: mm, tickets: sp.monthly[6 + i] }));

  // ===== health (derived) =====
  const usageScore = mapScore(usageGrowth, -30, 30);
  const auScore = mapScore(activeUserGrowth, -30, 30);
  const utilScore = clamp(licenseUtilization, 0, 100);
  const adoptScore = featureAdoption;
  const engScore = mapScore(engagementChange, -40, 40);
  const supportScore = clamp(100 - openTicketRate - ticketGrowth * 0.4 - criticalTickets * 1.4, 0, 100);
  const healthScore = round(usageScore * 0.22 + auScore * 0.14 + utilScore * 0.18 + adoptScore * 0.16 + engScore * 0.15 + supportScore * 0.15);
  const healthStatus = healthScore >= 72 ? "Healthy" : healthScore >= 55 ? "Monitor" : "At Risk";

  const minS = Math.min(...sess), maxS = Math.max(...sess);
  const shape = sess.map((s) => (maxS > minS ? 50 + (s - minS) / (maxS - minS) * 40 : 65));
  const offset = healthScore - shape[11];
  const healthTrend = m.map((x, i) => ({ month: x.month, health: i === 11 ? healthScore : round(clamp(shape[i] + offset, 10, 99)) }));
  const healthPrev = healthTrend[10].health;
  const healthChange = round(healthScore - healthPrev);

  const daysToRenewal = round((new Date(c.renewalDate) - REFERENCE_DATE) / 86400000);
  const arr = c.arr;
  const revenueAtRisk = c.revenueAtRisk;
  const churnRisk = healthScore < 55 ? "High" : healthScore < 72 ? "Medium" : "Low";
  const renewalRisk = healthStatus === "At Risk" ? "High" : (healthStatus === "Monitor" && daysToRenewal <= 90) ? "Medium" : "Low";
  const riskPriority = healthStatus === "At Risk" ? "High" : (healthStatus === "Monitor" && daysToRenewal <= 120) ? "Medium" : "Low";

  const adoptionStage =
    featureAdoption >= 70 && licenseUtilization >= 75 ? "Power User" :
    featureAdoption >= 55 ? "Established" :
    featureAdoption >= 40 ? "Growing" : "Onboarding";

  const dir = (v) => (v > 1 ? "up" : v < -1 ? "down" : "flat");
  const tone = (good) => (good ? "positive" : "negative");
  const healthDrivers = [
    { name: "Product Usage", value: `${usageGrowth > 0 ? "+" : ""}${usageGrowth}%`, change: usageGrowth, direction: dir(usageGrowth), contribution: tone(usageGrowth >= 0) },
    { name: "Feature Adoption", value: `${featureAdoption}%`, change: round(featureAdoption - 60), direction: dir(featureAdoption - 60), contribution: tone(featureAdoption >= 55) },
    { name: "License Utilization", value: `${licenseUtilization}%`, change: licenseUtilizationChange, direction: dir(licenseUtilizationChange), contribution: tone(licenseUtilization >= 65) },
    { name: "Engagement", value: `${engagementChange > 0 ? "+" : ""}${engagementChange}%`, change: engagementChange, direction: dir(engagementChange), contribution: tone(engagementChange >= 0) },
    { name: "Support Friction", value: `${ticketGrowth > 0 ? "+" : ""}${ticketGrowth}% tickets`, change: -ticketGrowth, direction: dir(-ticketGrowth), contribution: tone(ticketGrowth <= 10 && openTicketRate < 40) },
    { name: "Renewal Proximity", value: `${daysToRenewal} days`, change: 0, direction: "flat", contribution: daysToRenewal <= 90 ? "negative" : "neutral" },
  ];

  const riskEvidence = [
    { label: "Usage Growth", value: `${usageGrowth > 0 ? "+" : ""}${usageGrowth}%`, tone: usageGrowth >= 0 ? "positive" : "negative" },
    { label: "Active User Growth", value: `${activeUserGrowth > 0 ? "+" : ""}${activeUserGrowth}%`, tone: activeUserGrowth >= 0 ? "positive" : "negative" },
    { label: "License Utilization", value: `${licenseUtilization}%`, tone: licenseUtilization >= 65 ? "positive" : "negative" },
    { label: "Feature Adoption", value: `${featureAdoption}%`, tone: featureAdoption >= 55 ? "positive" : "negative" },
    { label: "Support Tickets", value: `${ticketGrowth > 0 ? "+" : ""}${ticketGrowth}%`, tone: ticketGrowth <= 10 ? "positive" : "negative" },
    { label: "Days to Renewal", value: `${daysToRenewal}`, tone: daysToRenewal <= 90 ? "negative" : "neutral" },
  ];
  const hasRisk = healthStatus !== "Healthy";
  const riskSummary = healthStatus === "At Risk" ? "Customer may be at renewal risk" : healthStatus === "Monitor" ? "Customer needs monitoring ahead of renewal" : "No active retention risk";
  const riskWhy = hasRisk
    ? `Product usage ${usageGrowth < 0 ? "has declined" : "is stalling"} (${usageGrowth}%) and license utilization is ${licenseUtilization}% while renewal is ${daysToRenewal <= 120 ? "approaching" : "on the horizon"} (${daysToRenewal} days).`
    : "Usage, adoption and engagement are trending positively with no renewal pressure.";

  // ===== opportunities (derived, values sourced from commercial facts where present) =====
  const opportunities = [];
  const pushOpp = (o) => opportunities.push({ id: `${c.customer_id || c.id}-OPP${opportunities.length + 1}`, ...o });
  const cid = c.id;

  if (licenseUtilization >= 80) {
    const additional = round(purchasedLicenses * (licenseUtilization >= 92 ? 0.25 : 0.15));
    const value = round(additional * pricePerLicense);
    pushOpp({
      type: "License Expansion", opportunity: `Add ~${additional} seats`,
      currentState: `${licenseUtilization}% utilized (${activeLicenses}/${purchasedLicenses})`,
      readiness: licenseUtilization >= 92 && healthScore >= 65 ? "High" : "Medium", value,
      reason: "Customer is approaching full license utilization.",
      why: `Active seats are at ${licenseUtilization}% of purchased capacity, indicating demand for additional seats.`,
      evidence: [
        { label: "Purchased Seats", value: `${purchasedLicenses}` },
        { label: "Active Seats", value: `${activeLicenses}` },
        { label: "Utilization", value: `${licenseUtilization}%` },
        { label: "Active User Growth", value: `${activeUserGrowth > 0 ? "+" : ""}${activeUserGrowth}%` },
      ],
      priority: licenseUtilization >= 92 ? "High" : "Medium",
      recommendedAction: "Discuss additional seat bundle before renewal.",
    });
  }
  if (c.upsellPotential > 0 && healthScore >= 58) {
    pushOpp({
      type: "Upsell", opportunity: `Upgrade to premium tier / add-ons`,
      currentState: `On ${c.subscription.plan} plan`,
      readiness: healthScore >= 78 ? "High" : "Medium", value: c.upsellPotential,
      reason: "Healthy account with room to move to a higher tier.",
      why: `Usage growth ${usageGrowth}% and adoption ${featureAdoption}% support a premium upgrade.`,
      evidence: [
        { label: "Health Score", value: `${healthScore}` },
        { label: "Usage Growth", value: `${usageGrowth > 0 ? "+" : ""}${usageGrowth}%` },
        { label: "Feature Adoption", value: `${featureAdoption}%` },
        { label: "Current Plan", value: c.subscription.plan },
      ],
      priority: healthScore >= 78 ? "High" : "Medium",
      recommendedAction: "Review plan upgrade aligned to expanded usage.",
    });
  }
  if (c.crossSellPotential > 0 && healthScore >= 55) {
    pushOpp({
      type: "Cross-sell", opportunity: `Introduce ${CROSS_SELL_PRODUCT}`,
      currentState: `Uses ${c.subscription.product}`,
      readiness: healthScore >= 75 ? "High" : "Medium", value: c.crossSellPotential,
      reason: "Healthy account not yet using a complementary product.",
      why: `Strong adoption of ${c.subscription.product} signals fit for ${CROSS_SELL_PRODUCT}.`,
      evidence: [
        { label: "Health Score", value: `${healthScore}` },
        { label: "Feature Adoption", value: `${featureAdoption}%` },
        { label: "Active Users", value: `${activeUsers}` },
      ],
      priority: healthScore >= 75 ? "Medium" : "Low",
      recommendedAction: `Introduce ${CROSS_SELL_PRODUCT} to the account team.`,
    });
  }
  const whitespaceVal = c.expansionPotential - c.upsellPotential - c.crossSellPotential;
  if (whitespaceVal > 0 && licenseUtilization < 80) {
    pushOpp({
      type: "Whitespace", opportunity: "Expand into untapped teams",
      currentState: `${activeUsers} of ${totalUsers} users active`,
      readiness: healthScore >= 60 ? "Medium" : "Low", value: whitespaceVal,
      reason: "Large user base with adoption concentrated in few teams.",
      why: `Only ${activeUsers} of ${totalUsers} provisioned users are active — untapped whitespace across the organization.`,
      evidence: [
        { label: "Total Users", value: `${totalUsers}` },
        { label: "Active Users", value: `${activeUsers}` },
        { label: "Utilization", value: `${licenseUtilization}%` },
      ],
      priority: "Medium",
      recommendedAction: "Explore whitespace with a departmental rollout plan.",
    });
  }
  const opportunityValue = round(sum(opportunities, (o) => o.value));
  const expansionReadiness = opportunities.length
    ? (opportunities.some((o) => o.readiness === "High") ? "High" : opportunities.some((o) => o.readiness === "Medium") ? "Medium" : "Low")
    : "Low";

  // ===== anomalies (derived) =====
  const anomalies = [];
  const baseSess = round(avg(sess.slice(6, 9)));
  const baseUsers = round(avg(usersM.slice(6, 9)));
  if (usageGrowth <= -12) anomalies.push({ signal: "Usage drop", metric: "Usage Volume", currentValue: `${usageVolume.toLocaleString()}`, baseline: `${baseSess.toLocaleString()}`, change: `${usageGrowth}%`, period: "Last 3 months", impact: "High" });
  if (activeUserGrowth <= -10) anomalies.push({ signal: "Active-user drop", metric: "Active Users", currentValue: `${activeUsers}`, baseline: `${baseUsers}`, change: `${activeUserGrowth}%`, period: "Last 3 months", impact: "High" });
  if (usageGrowth >= 18) anomalies.push({ signal: "Usage spike", metric: "Usage Volume", currentValue: `${usageVolume.toLocaleString()}`, baseline: `${baseSess.toLocaleString()}`, change: `+${usageGrowth}%`, period: "Last 3 months", impact: "Medium" });
  const worst = adoptionGaps.find((f) => f.adoptionChange < -3) || adoptionGaps[0];
  if (worst && worst.adoptionChange < -3) anomalies.push({ signal: "Feature-usage change", metric: worst.name, currentValue: `${worst.adoptionPct}%`, baseline: `${worst.prevAdoptionPct}%`, change: `${worst.adoptionChange}%`, period: "QoQ", impact: "Medium" });

  // ===== recommended actions (derived) =====
  const actions = [];
  const pushAction = (a) => actions.push({ id: `${cid}-A${actions.length + 1}`, customerId: cid, customerName: c.name, status: "Open", ...a });
  if (healthStatus === "At Risk" || (healthStatus === "Monitor" && daysToRenewal <= 120)) {
    pushAction({
      priority: riskPriority, action: "Review renewal risk", type: daysToRenewal <= 120 ? "Renewal" : "Risk",
      reason: "Usage declining while renewal is approaching.", impact: revenueAtRisk, impactType: "risk",
      why: riskWhy, nextStep: "Schedule an executive check-in and share a tailored engagement plan before renewal.",
      relatedType: "risk", relatedId: cid, evidence: riskEvidence,
    });
  }
  if (featureAdoption < 50) {
    pushAction({
      priority: featureAdoption < 40 ? "High" : "Medium", action: "Drive feature adoption", type: "Adoption",
      reason: "Key features are available but underused.", impact: revenueAtRisk || round(arr * 0.1), impactType: "risk",
      why: `Feature adoption is ${featureAdoption}% with the largest gap on ${adoptionGaps[0] ? adoptionGaps[0].name : "core features"}.`,
      nextStep: "Run an enablement session on the lowest-adoption features.",
      relatedType: "adoption", relatedId: cid,
      evidence: adoptionGaps.slice(0, 3).map((f) => ({ label: f.name, value: `${f.adoptionPct}% (gap ${f.gap})`, tone: "negative" })),
    });
  }
  opportunities.forEach((o) => {
    pushAction({
      priority: o.priority, action: o.recommendedAction, type: o.type, reason: o.reason,
      impact: o.value, impactType: "opportunity", why: o.why, nextStep: o.recommendedAction,
      relatedType: "opportunity", relatedId: o.id, evidence: o.evidence.map((e) => ({ ...e, tone: "neutral" })),
    });
  });

  return {
    id: cid, name: c.name, initials: c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    segment: c.segment, industry: c.industry, region: c.region, country: c.country,
    accountOwner: c.accountOwner, employeeCount: c.employeeCount,
    product: c.subscription.product, products: [c.subscription.product], plan: c.subscription.plan,
    contractStart: c.subscription.startDate, renewalDate: c.renewalDate, daysToRenewal, arr,
    totalUsers, purchasedLicenses, assignedLicenses, activeLicenses, activeUsers, activeUserPct,
    monthly: m.map((x) => ({ month: x.month, usageVolume: x.sessions, activeUsers: x.activeUsers, minutes: x.minutes })),
    usageVolume, usageGrowth, activeUserGrowth,
    licenseUtilization, licenseUtilizationChange,
    featureAdoption, features, featuresUsed, adoptionGaps,
    engagement: { usageFrequency, usageDays, featuresUsed, lastActivityDays, engagementChange },
    support: { currentTickets, prevTickets, openTickets, totalTickets, criticalTickets, ticketGrowth, openTicketRate, avgResolutionDays, trend: supportTrend },
    dau, wau, mau,
    healthScore, healthPrev, healthChange, healthStatus, healthTrend, healthDrivers,
    churnRisk, renewalRisk, revenueAtRisk, riskPriority, riskSummary, riskWhy, riskEvidence, hasRisk,
    adoptionStage,
    opportunities, opportunityValue, expansionReadiness,
    anomalies, recommendedActions: actions,
  };
}

export const customers = RAW.map(build);
export const getCustomer = (id) => customers.find((c) => c.id === id);

export const portfolio = (() => {
  const total = customers.length;
  const atRisk = customers.filter((c) => c.healthStatus === "At Risk");
  const monitor = customers.filter((c) => c.healthStatus === "Monitor");
  const healthy = customers.filter((c) => c.healthStatus === "Healthy");
  const allOpps = customers.flatMap((c) => c.opportunities);
  const allActions = customers.flatMap((c) => c.recommendedActions);

  const expansionByType = OPPORTUNITY_TYPES.map((t) => {
    const items = allOpps.filter((o) => o.type === t);
    return { type: t, count: items.length, value: round(sum(items, (o) => o.value)) };
  });

  const bucketDef = [
    { label: "0–30 days", min: 0, max: 30 }, { label: "31–90 days", min: 31, max: 90 },
    { label: "91–180 days", min: 91, max: 180 }, { label: "180+ days", min: 181, max: 100000 },
  ];
  const revenueAtRiskByBucket = bucketDef.map((b) => {
    const items = customers.filter((c) => c.daysToRenewal >= b.min && c.daysToRenewal <= b.max);
    return { bucket: b.label, customers: items.length, arr: round(sum(items, (c) => c.arr)), revenueAtRisk: round(sum(items, (c) => c.revenueAtRisk)) };
  });

  const healthTrend = MONTHS.map((mm, idx) => ({ month: mm, health: round(sum(customers, (c) => c.healthTrend[idx].health) / total) }));

  return {
    totalCustomers: total,
    customersAtRisk: atRisk.length, customersMonitor: monitor.length, customersHealthy: healthy.length,
    revenueAtRisk: round(sum(customers, (c) => c.revenueAtRisk)),
    totalArr: round(sum(customers, (c) => c.arr)),
    totalOpportunities: allOpps.length,
    totalExpansionPotential: round(sum(allOpps, (o) => o.value)),
    aiActionsPending: allActions.filter((a) => a.status === "Open").length,
    avgHealthScore: round(sum(customers, (c) => c.healthScore) / total),
    healthChange: round(sum(customers, (c) => c.healthChange) / total, 1),
    healthDistribution: [
      { name: "Healthy", value: healthy.length }, { name: "Monitor", value: monitor.length }, { name: "At Risk", value: atRisk.length },
    ],
    healthTrend, expansionByType, revenueAtRiskByBucket,
    upcomingRenewals: customers.filter((c) => c.daysToRenewal <= 90).length,
    criticalTickets: round(sum(customers, (c) => c.support.criticalTickets)),
    openTicketRate: round(sum(customers, (c) => c.support.openTicketRate) / total, 1),
    ticketGrowth: round(sum(customers, (c) => c.support.ticketGrowth) / total, 1),
  };
})();

export const actions = customers
  .flatMap((c) => c.recommendedActions)
  .sort((a, b) => ({ High: 0, Medium: 1, Low: 2 }[a.priority] - { High: 0, Medium: 1, Low: 2 }[b.priority]));

export const opportunities = customers.flatMap((c) =>
  c.opportunities.map((o) => ({ ...o, customerId: c.id, customerName: c.name, healthScore: c.healthScore, segment: c.segment }))
);

export const anomalies = customers.flatMap((c) =>
  c.anomalies.map((a, idx) => ({ id: `${c.id}-AN${idx}`, customerId: c.id, customerName: c.name, ...a }))
);

export const insights = (() => {
  const out = [];
  customers.forEach((c) => {
    if (c.healthStatus !== "Healthy") {
      out.push({ id: `${c.id}-INS-R`, type: "Risk", customerId: c.id, customerName: c.name,
        insight: `${c.name} ${c.usageGrowth < 0 ? "has declining usage" : "shows stalling usage"} ahead of renewal`,
        why: c.riskWhy, evidence: c.riskEvidence, priority: c.riskPriority });
    }
    if (c.opportunities[0]) {
      const o = c.opportunities[0];
      out.push({ id: `${c.id}-INS-O`, type: "Opportunity", customerId: c.id, customerName: c.name,
        insight: `${c.name}: ${o.opportunity}`, why: o.why, evidence: o.evidence.map((e) => ({ ...e, tone: "neutral" })), priority: o.priority });
    }
    if (c.featureAdoption < 50) {
      out.push({ id: `${c.id}-INS-A`, type: "Adoption", customerId: c.id, customerName: c.name,
        insight: `${c.name} has low feature adoption (${c.featureAdoption}%)`,
        why: "Several available features are underused, limiting realized value.",
        evidence: c.adoptionGaps.slice(0, 3).map((f) => ({ label: f.name, value: `${f.adoptionPct}%`, tone: "negative" })),
        priority: c.featureAdoption < 40 ? "High" : "Medium" });
    }
  });
  const order = { High: 0, Medium: 1, Low: 2 };
  return out.sort((a, b) => order[a.priority] - order[b.priority]);
})();

export const portfolioUsageTrend = MONTHS.map((mm, idx) => {
  const usageVolume = round(sum(customers, (c) => c.monthly[idx].usageVolume));
  const activeUsers = round(sum(customers, (c) => c.monthly[idx].activeUsers));
  const prev = idx === 0 ? usageVolume : round(sum(customers, (c) => c.monthly[idx - 1].usageVolume));
  const usageGrowth = idx === 0 ? 0 : round((usageVolume - prev) / prev * 100, 1);
  const mau = activeUsers, wau = round(mau * 0.63), dau = round(wau * 0.42);
  return { month: mm, usageVolume, activeUsers, usageGrowth, dau, wau, mau };
});

export const portfolioFeatures = FEATURE_NAMES.map((fn) => {
  const rows = customers.map((c) => c.features.find((f) => f.name === fn));
  const eligibleUsers = round(sum(rows, (f) => f.eligibleUsers));
  const adopters = round(sum(rows, (f) => f.adopters));
  const adoptionPct = round(adopters / eligibleUsers * 100, 1);
  const adoptionChange = round(avg(rows.map((f) => f.adoptionChange)), 1);
  const benchmark = rows[0].benchmark;
  const gap = round(Math.max(0, benchmark - adoptionPct), 1);
  const usageVolume = round(sum(rows, (f) => f.usageVolume));
  const customersAffected = rows.filter((f) => f.gap > 0).length;
  return { feature: fn, eligibleUsers, adopters, adoptionPct, adoptionChange, benchmark, gap, usageVolume, customersAffected };
});

export const adoptionStageDistribution = ["Onboarding", "Growing", "Established", "Power User"].map((stage) => ({
  stage, count: customers.filter((c) => c.adoptionStage === stage).length,
}));

export const expansionReadinessDistribution = ["High", "Medium", "Low"].map((r) => ({
  readiness: r, count: customers.filter((c) => c.expansionReadiness === r).length,
}));

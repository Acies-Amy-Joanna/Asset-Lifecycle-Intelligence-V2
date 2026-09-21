// small derived helpers used across screens

export const primaryRiskDriver = (c) => {
  if (c.usageGrowth < -5) return "Usage decline";
  if (c.activeUserGrowth < -5) return "Active user decline";
  if (c.licenseUtilization < 55) return "Low utilization";
  if (c.support.ticketGrowth > 15) return "Support friction";
  if (c.featureAdoption < 50) return "Low adoption";
  if (c.daysToRenewal <= 60) return "Renewal proximity";
  return "Stable";
};

export const renewalBucketOf = (days) =>
  days <= 30 ? "0–30 days" : days <= 90 ? "31–90 days" : days <= 180 ? "91–180 days" : "180+ days";

export const CHART_TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "1px solid #E2E8F0",
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
  fontSize: 12,
  padding: "8px 12px",
};

export const healthColor = (score) =>
  score >= 72 ? "#10B981" : score >= 55 ? "#F59E0B" : "#EF4444";

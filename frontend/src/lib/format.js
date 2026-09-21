export const fmtCurrency = (n) => {
  if (n == null) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}K`;
  return `$${Math.round(n).toLocaleString()}`;
};

export const fmtCurrencyFull = (n) =>
  n == null ? "—" : `$${Math.round(n).toLocaleString()}`;

export const fmtNumber = (n) =>
  n == null ? "—" : Math.round(n).toLocaleString();

export const fmtCompact = (n) => {
  if (n == null) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${Math.round(n)}`;
};

export const fmtPct = (n, dp = 1) => (n == null ? "—" : `${n.toFixed(dp)}%`);

// signed change, e.g. +4.2% / -3.1%
export const fmtDelta = (n, dp = 1, suffix = "%") =>
  n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(dp)}${suffix}`;

export const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export const deltaTone = (n, invert = false) => {
  const positive = invert ? n < 0 : n > 0;
  if (n === 0) return "neutral";
  return positive ? "positive" : "negative";
};

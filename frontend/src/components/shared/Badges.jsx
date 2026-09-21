import { cn } from "@/lib/utils";
import {
  STATUS_STYLES, PRIORITY_STYLES, RISK_STYLES, TYPE_STYLES, READINESS_STYLES,
} from "@/lib/status";

const Base = ({ className, children, testId }) => (
  <span
    data-testid={testId}
    className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
      className
    )}
  >
    {children}
  </span>
);

export const StatusBadge = ({ status, testId }) => (
  <Base className={STATUS_STYLES[status] || STATUS_STYLES.Monitor} testId={testId}>
    <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5",
      status === "Healthy" ? "bg-emerald-500" : status === "Monitor" ? "bg-amber-500" : "bg-rose-500")} />
    {status}
  </Base>
);

export const PriorityBadge = ({ priority, testId }) => (
  <Base className={PRIORITY_STYLES[priority] || PRIORITY_STYLES.Low} testId={testId}>{priority}</Base>
);

export const RiskBadge = ({ risk, testId }) => (
  <Base className={RISK_STYLES[risk] || RISK_STYLES.Low} testId={testId}>{risk}</Base>
);

export const TypeBadge = ({ type, testId }) => (
  <Base className={TYPE_STYLES[type] || "bg-slate-100 text-slate-600 border-slate-200"} testId={testId}>{type}</Base>
);

export const ReadinessBadge = ({ readiness, testId }) => (
  <Base className={READINESS_STYLES[readiness] || READINESS_STYLES.Low} testId={testId}>{readiness}</Base>
);

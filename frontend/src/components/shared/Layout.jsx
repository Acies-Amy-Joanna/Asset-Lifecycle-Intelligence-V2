import { cn } from "@/lib/utils";

// KPI grid wrapper for consistent responsive reflow
export const KpiGrid = ({ children, className }) => (
  <div className={cn("grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4", className)}>
    {children}
  </div>
);

export const PageIntro = ({ question, children }) => (
  <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
    <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
      <span className="text-slate-700 font-medium">{question}</span>
    </p>
    {children}
  </div>
);

import { cn } from "@/lib/utils";

export const SectionCard = ({ title, subtitle, action, children, className, bodyClassName, testId }) => (
  <section
    data-testid={testId}
    className={cn("bg-white border border-slate-200 rounded-xl", className)}
  >
    {(title || action) && (
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          {title && <h3 className="font-display font-semibold text-[15px] text-slate-900">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    )}
    <div className={cn("px-5 pb-5", !title && "pt-5", bodyClassName)}>{children}</div>
  </section>
);

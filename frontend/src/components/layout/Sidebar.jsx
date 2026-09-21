import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, UserCheck, BarChart3, Activity, TrendingUp, CheckSquare, Sparkles, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true, id: "overview" },
  { to: "/customers", label: "Customers", icon: Users, id: "customers" },
  { to: "/customer360", label: "Customer 360", icon: UserCheck, id: "customer360" },
  { to: "/adoption", label: "Adoption & Utilization", icon: BarChart3, id: "adoption" },
  { to: "/health", label: "Health & Renewal", icon: Activity, id: "health" },
  { to: "/growth", label: "Growth & Expansion", icon: TrendingUp, id: "growth" },
  { to: "/actions", label: "Actions", icon: CheckSquare, id: "actions" },
];

export const Sidebar = ({ open, onClose }) => {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={onClose} data-testid="sidebar-backdrop" />
      )}
      <aside
        data-testid="app-sidebar"
        className={cn(
          "fixed z-40 inset-y-0 left-0 w-[260px] bg-slate-900 text-slate-100 flex flex-col transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-white/10">
          <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-extrabold text-[17px] tracking-tight">ALI</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400">Customer Intelligence</div>
          </div>
          <button className="ml-auto lg:hidden text-slate-400" onClick={onClose} data-testid="sidebar-close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.to}
                end={item.end}
                onClick={onClose}
                data-testid={`sidebar-nav-${item.id}`}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  )
                }
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="rounded-lg bg-white/5 p-3 text-xs text-slate-300 leading-relaxed">
            <div className="font-semibold text-slate-100 mb-1">Intelligence flow</div>
            Data → Metrics → Signals → Insights → Risk / Opportunity → Evidence → Action
          </div>
        </div>
      </aside>
    </>
  );
};

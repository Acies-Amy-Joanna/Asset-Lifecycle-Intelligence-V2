import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Search, Bell, ChevronRight } from "lucide-react";
import { customers, insights } from "@/data/dataset";
import { useData } from "@/context/DataContext";
import {
  Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const TITLES = {
  "/": { title: "Executive Overview", crumb: ["Overview"] },
  "/customers": { title: "Customer Directory", crumb: ["Customers"] },
  "/customer360": { title: "Customer 360", crumb: ["Customers", "Customer 360"] },
  "/adoption": { title: "Adoption & Utilization", crumb: ["Adoption & Utilization"] },
  "/health": { title: "Health & Renewal", crumb: ["Health & Renewal"] },
  "/growth": { title: "Growth & Expansion", crumb: ["Growth & Expansion"] },
  "/actions": { title: "Action Center", crumb: ["Actions"] },
};

export const TopBar = ({ onMenu }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { customers, insights } = useData();
  const [searchOpen, setSearchOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const meta = useMemo(() => {
    const base = "/" + (location.pathname.split("/")[1] || "");
    return TITLES[base] || TITLES["/"];
  }, [location.pathname]);

  const riskAlerts = insights.filter((i) => i.type === "Risk").slice(0, 6);

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/85 backdrop-blur-md border-b border-slate-200 flex items-center gap-3 px-4 lg:px-6">
      <button className="lg:hidden text-slate-600" onClick={onMenu} data-testid="topbar-menu-button">
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
          {meta.crumb.map((c, i) => (
            <span key={c} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              <span className={i === meta.crumb.length - 1 ? "text-slate-600" : ""}>{c}</span>
            </span>
          ))}
        </div>
        <h1 className="font-display font-bold text-lg text-slate-900 leading-tight truncate">{meta.title}</h1>
      </div>

      <button
        onClick={() => setSearchOpen(true)}
        data-testid="global-search-button"
        className="ml-auto hidden sm:flex items-center gap-2 h-9 w-56 lg:w-72 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 hover:bg-white transition-colors"
      >
        <Search className="h-4 w-4" />
        <span>Search customers…</span>
        <kbd className="ml-auto text-[10px] font-mono bg-white border border-slate-200 rounded px-1.5 py-0.5">⌘K</kbd>
      </button>
      <button onClick={() => setSearchOpen(true)} className="sm:hidden text-slate-600" data-testid="global-search-button-mobile">
        <Search className="h-5 w-5" />
      </button>

      <DropdownMenu open={alertsOpen} onOpenChange={setAlertsOpen}>
        <DropdownMenuTrigger asChild>
          <button className="relative text-slate-600 hover:text-slate-900 transition-colors" data-testid="notifications-button">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold flex items-center justify-center">
              {riskAlerts.length}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between">
            Risk Alerts <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50">{riskAlerts.length}</Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {riskAlerts.map((a) => (
            <DropdownMenuItem
              key={a.id}
              className="flex-col items-start gap-0.5 py-2 cursor-pointer"
              onClick={() => navigate(`/customer360/${a.customerId}`)}
              data-testid={`alert-item-${a.customerId}`}
            >
              <span className="text-sm font-medium text-slate-800">{a.customerName}</span>
              <span className="text-xs text-slate-500 line-clamp-1">{a.insight}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2" data-testid="profile-button">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-blue-600 text-white text-sm font-semibold">JR</AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-left leading-tight">
              <div className="text-sm font-semibold text-slate-800">Jordan Reyes</div>
              <div className="text-[11px] text-slate-400">Head of Customer Success</div>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>Jordan Reyes</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Team settings</DropdownMenuItem>
          <DropdownMenuItem>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <Command>
          <CommandInput placeholder="Search by customer name or ID…" data-testid="global-search-input" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Customers">
              {customers.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.name} ${c.id}`}
                  onSelect={() => { setSearchOpen(false); navigate(`/customer360/${c.id}`); }}
                  data-testid={`search-result-${c.id}`}
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-2 text-xs text-slate-400 font-mono">{c.id}</span>
                  <span className="ml-auto text-xs text-slate-400">{c.segment}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </header>
  );
};

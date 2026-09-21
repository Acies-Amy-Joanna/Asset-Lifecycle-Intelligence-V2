import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { Sparkles } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const DataContext = createContext(null);

// effective values: shared override (from MongoDB) falls back to seeded default
export const effStatus = (a, overrides) => (overrides[a.id] && overrides[a.id].status) || a.status;
export const effOwner = (a, overrides) => (overrides[a.id] && overrides[a.id].owner) || "";

const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
    <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center animate-pulse">
      <Sparkles className="h-6 w-6 text-white" />
    </div>
    <div className="text-sm text-slate-500">Loading customer intelligence…</div>
  </div>
);

const ErrorScreen = ({ onRetry }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 text-center px-6">
    <div className="text-lg font-semibold text-slate-800">Unable to reach the ALI service</div>
    <div className="text-sm text-slate-500">The intelligence API did not respond. Please try again.</div>
    <button onClick={onRetry} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg" data-testid="retry-button">Retry</button>
  </div>
);

export const DataProvider = ({ children }) => {
  const [bundle, setBundle] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    axios.get(`${API}/bootstrap`)
      .then((res) => { setOverrides(res.data.actionOverrides || {}); setBundle(res.data); })
      .catch(() => setError(true));
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateAction = useCallback((id, patch) => {
    setOverrides((o) => ({ ...o, [id]: { ...o[id], ...patch } })); // optimistic
    axios.put(`${API}/actions/${id}`, patch).catch(() => {});
  }, []);

  const value = useMemo(() => {
    if (!bundle) return null;
    const getCustomer = (cid) => bundle.customers.find((c) => c.id === cid);
    return { ...bundle, overrides, updateAction, getCustomer };
  }, [bundle, overrides, updateAction]);

  if (error) return <ErrorScreen onRetry={load} />;
  if (!value) return <LoadingScreen />;
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
};

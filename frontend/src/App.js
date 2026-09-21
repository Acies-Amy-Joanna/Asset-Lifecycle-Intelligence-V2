import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AppProvider } from "@/context/AppContext";
import { DataProvider } from "@/context/DataContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Overview from "@/pages/Overview";
import Customers from "@/pages/Customers";
import Customer360 from "@/pages/Customer360";
import Adoption from "@/pages/Adoption";
import HealthRenewal from "@/pages/HealthRenewal";
import Growth from "@/pages/Growth";
import Actions from "@/pages/Actions";

function App() {
  return (
    <AppProvider>
      <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Overview />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customer360" element={<Customer360 />} />
            <Route path="/customer360/:id" element={<Customer360 />} />
            <Route path="/adoption" element={<Adoption />} />
            <Route path="/health" element={<HealthRenewal />} />
            <Route path="/growth" element={<Growth />} />
            <Route path="/actions" element={<Actions />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
      </DataProvider>
    </AppProvider>
  );
}

export default App;

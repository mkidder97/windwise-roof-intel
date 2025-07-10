import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthProvider } from "./hooks/useAuth";
import WindCalculator from "./pages/WindCalculator";
import MaterialFinder from "./pages/MaterialFinder";
import MaterialsManage from "./pages/MaterialsManage";
import MaterialsDashboard from "./pages/MaterialsDashboard";
import MaterialsMonitoring from "./pages/MaterialsMonitoring";
import ReviewChanges from "./pages/ReviewChanges";
import IntegrationTest from "./pages/IntegrationTest";
import DataQualityDashboard from "./pages/DataQualityDashboard";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<WindCalculator />} />
              <Route path="materials" element={<MaterialFinder />} />
              <Route path="materials/manage" element={<MaterialsManage />} />
              <Route path="materials/dashboard" element={<MaterialsDashboard />} />
              <Route path="materials/monitoring" element={<MaterialsMonitoring />} />
              <Route path="materials/review-changes" element={<ReviewChanges />} />
              <Route path="integration-test" element={<IntegrationTest />} />
              <Route path="data-quality" element={<DataQualityDashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

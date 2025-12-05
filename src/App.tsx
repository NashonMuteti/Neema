import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";

// Placeholder pages
import Projects from "./pages/Projects";
import PettyCash from "./pages/PettyCash";
import UserProfile from "./pages/UserProfile";
import Members from "./pages/Members";
import Pledges from "./pages/Pledges";
import MemberContributions from "./pages/Reports/MemberContributions";
import PettyCashReport from "./pages/Reports/PettyCashReport";
import PledgeReport from "./pages/Reports/PledgeReport";
import AdminSettings from "./pages/AdminSettings"; // New Admin Settings page

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/petty-cash" element={<PettyCash />} />
            <Route path="/pledges" element={<Pledges />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/members" element={<Members />} />
            <Route path="/reports/member-contributions" element={<MemberContributions />} />
            <Route path="/reports/petty-cash" element={<PettyCashReport />} />
            <Route path="/reports/pledges" element={<PledgeReport />} />
            <Route path="/admin/settings" element={<AdminSettings />} /> {/* New Admin Settings route */}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
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
import UserSettings from "./pages/UserSettings";
import Members from "./pages/Members";
import Pledges from "./pages/Pledges";
import MemberContributions from "./pages/Reports/MemberContributions";
import PettyCashReport from "./pages/Reports/PettyCashReport";
import PledgeReport from "./pages/Reports/PledgeReport";
import AdminSettings from "./pages/AdminSettings";
import UserActivityReport from "./pages/Reports/UserActivityReport";
import InitializeBalances from "./pages/InitializeBalances";
import DeletedProjectsReport from "./pages/Reports/DeletedProjectsReport";
import Income from "./pages/Income"; // Import the new Income page
import Expenditure from "./pages/Expenditure"; // Import the new Expenditure page

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
            <Route path="/income" element={<Income />} /> {/* New route for Income */}
            <Route path="/expenditure" element={<Expenditure />} /> {/* New route for Expenditure */}
            <Route path="/profile" element={<UserSettings />} />
            <Route path="/settings" element={<UserSettings />} />
            <Route path="/members" element={<Members />} />
            <Route path="/reports/member-contributions" element={<MemberContributions />} />
            <Route path="/reports/petty-cash" element={<PettyCashReport />} />
            <Route path="/reports/pledges" element={<PledgeReport />} />
            <Route path="/reports/user-activity" element={<UserActivityReport />} />
            <Route path="/reports/deleted-projects" element={<DeletedProjectsReport />} />
            <Route path="/initialize-balances" element={<InitializeBalances />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
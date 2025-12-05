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
import Members from "./pages/Members"; // New page
import MemberContributions from "./pages/Reports/MemberContributions"; // New report page
import PettyCashReport from "./pages/Reports/PettyCashReport"; // New report page

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
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/members" element={<Members />} /> {/* New route */}
            <Route path="/reports/member-contributions" element={<MemberContributions />} /> {/* New route */}
            <Route path="/reports/petty-cash" element={<PettyCashReport />} /> {/* New route */}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
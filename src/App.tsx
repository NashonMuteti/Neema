import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import { AuthProvider } from "./context/AuthContext";
import { BrandingProvider } from "./context/BrandingContext";
import { UserRolesProvider } from "./context/UserRolesContext";
import { ViewingMemberProvider } from "./context/ViewingMemberContext";
import { SessionContextProvider, useSession } from "./context/SessionContext"; // New import
import Login from "./pages/Login"; // New import

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
import Income from "./pages/Income";
import Expenditure from "./pages/Expenditure";
import BoardMembers from "./pages/BoardMembers";
import MyContributions from "./pages/MyContributions";
import MemberContributionsDetail from "./pages/MemberContributionsDetail";
import ProjectFinancialsDetail from "./pages/ProjectFinancialsDetail";
import TableBankingSummary from "./pages/TableBankingSummary";

// Sales Management Pages
import Stocks from "./pages/SalesManagement/Stocks";
import DailySales from "./pages/SalesManagement/DailySales";
import Debts from "./pages/SalesManagement/Debts";


const queryClient = new QueryClient();

// ProtectedRoute component to guard routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useSession();

  if (loading) {
    return <div>Loading...</div>; // Or a more sophisticated loading spinner
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider> {/* Wrap the entire app with SessionContextProvider */}
          <AuthProvider>
            <BrandingProvider>
              <UserRolesProvider>
                <ViewingMemberProvider>
                  <Routes>
                    <Route path="/login" element={<Login />} /> {/* New Login Route */}
                    <Route
                      path="*"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <Routes>
                              <Route path="/" element={<Index />} />
                              <Route path="/projects" element={<Projects />} />
                              <Route path="/projects/:projectId/financials" element={<ProjectFinancialsDetail />} />
                              <Route path="/petty-cash" element={<PettyCash />} />
                              <Route path="/pledges" element={<Pledges />} />
                              <Route path="/income" element={<Income />} />
                              <Route path="/expenditure" element={<Expenditure />} />
                              {/* Sales Management Routes */}
                              <Route path="/sales/stocks" element={<Stocks />} />
                              <Route path="/sales/daily" element={<DailySales />} />
                              <Route path="/sales/debts" element={<Debts />} />
                              <Route path="/members" element={<Members />} />
                              <Route path="/board-members" element={<BoardMembers />} />
                              <Route path="/profile" element={<UserSettings />} />
                              <Route path="/settings" element={<UserSettings />} />
                              <Route path="/my-contributions" element={<MyContributions />} />
                              <Route path="/members/:memberId/contributions" element={<MemberContributionsDetail />} />
                              <Route path="/reports/member-contributions" element={<MemberContributions />} />
                              <Route path="/reports/petty-cash" element={<PettyCashReport />} />
                              <Route path="/reports/pledges" element={<PledgeReport />} />
                              <Route path="/reports/table-banking-summary" element={<TableBankingSummary />} />
                              <Route path="/reports/user-activity" element={<UserActivityReport />} />
                              <Route path="/reports/deleted-projects" element={<DeletedProjectsReport />} />
                              <Route path="/initialize-balances" element={<InitializeBalances />} />
                              <Route path="/admin/settings" element={<AdminSettings />} />
                              {/* The catch-all NotFound route should be inside ProtectedRoute if it's a protected page */}
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </ViewingMemberProvider>
              </UserRolesProvider>
            </BrandingProvider>
          </AuthProvider>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
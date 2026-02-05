import React, { Suspense, useEffect } from "react"; // Import Suspense
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./globals.css";

import { AuthProvider } from "./context/AuthContext";
import { BrandingProvider } from "./context/BrandingContext";
import { UserRolesProvider } from "./context/UserRolesContext";
import { ViewingMemberProvider } from "./context/ViewingMemberContext";

import { perfMark } from "@/utils/perf";
import PerfLogger from "@/components/PerfLogger";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import BrandingMeta from "@/components/BrandingMeta";

// Layout and ProtectedRoute
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

// Dynamically import pages using React.lazy
const Index = React.lazy(() => import("./pages/Index"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Login = React.lazy(() => import("./pages/Login"));
const Projects = React.lazy(() => import("./pages/Projects"));
const UserSettings = React.lazy(() => import("./pages/UserSettings"));
const Members = React.lazy(() => import("./pages/Members"));
const Pledges = React.lazy(() => import("./pages/Pledges"));
const MemberContributions = React.lazy(() => import("./pages/Reports/MemberContributions"));
const PledgeReport = React.lazy(() => import("./pages/Reports/PledgeReport"));
const AdminSettings = React.lazy(() => import("./pages/AdminSettings"));
const UserActivityReport = React.lazy(() => import("./pages/Reports/UserActivityReport"));
const InitializeBalances = React.lazy(() => import("./pages/InitializeBalances"));
const DeletedProjectsReport = React.lazy(() => import("./pages/Reports/DeletedProjectsReport"));
const Income = React.lazy(() => import("./pages/Income"));
const Expenditure = React.lazy(() => import("./pages/Expenditure"));
const BoardMembers = React.lazy(() => import("./pages/BoardMembers"));
const MyContributions = React.lazy(() => import("./pages/MyContributions"));
const MemberContributionsDetail = React.lazy(() => import("./pages/MemberContributionsDetail"));
const ProjectFinancialsDetail = React.lazy(() => import("./pages/ProjectFinancialsDetail"));
const TableBankingSummary = React.lazy(() => import("./pages/TableBankingSummary"));
const TransferFunds = React.lazy(() => import("./pages/TransferFunds"));

// Sales Management Pages
const Stocks = React.lazy(() => import("./pages/SalesManagement/Stocks"));
const DailySales = React.lazy(() => import("./pages/SalesManagement/DailySales"));
const Debts = React.lazy(() => import("./pages/SalesManagement/Debts"));

// Financial Health Reports
const FinancialSummaryReport = React.lazy(() => import("./pages/Reports/FinancialSummaryReport"));
const FinancialDetailedReport = React.lazy(() => import("./pages/Reports/FinancialDetailedReport"));

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    perfMark("App:mounted");
  }, []);

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <PerfLogger />
            <AuthProvider>
              <BrandingProvider>
                <BrandingMeta />
                <UserRolesProvider>
                  <ViewingMemberProvider>
                    <Suspense
                      fallback={
                        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                          Loading application...
                        </div>
                      }
                    >
                      <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route element={<ProtectedRoute />}>
                          <Route element={<Layout />}>
                            <Route path="/" element={<Index />} />
                            <Route path="/projects" element={<Projects />} />
                            <Route path="/projects/:projectId/financials" element={<ProjectFinancialsDetail />} />
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
                            <Route path="/reports/pledges" element={<PledgeReport />} />
                            <Route path="/reports/table-banking-summary" element={<TableBankingSummary />} />
                            <Route path="/reports/user-activity" element={<UserActivityReport />} />
                            <Route path="/reports/deleted-projects" element={<DeletedProjectsReport />} />
                            <Route path="/reports/financial-summary" element={<FinancialSummaryReport />} />
                            <Route path="/reports/financial-detailed" element={<FinancialDetailedReport />} />

                            <Route path="/initialize-balances" element={<InitializeBalances />} />
                            <Route path="/transfer-funds" element={<TransferFunds />} />
                            <Route path="/admin/settings" element={<AdminSettings />} />
                          </Route>
                        </Route>
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </ViewingMemberProvider>
                </UserRolesProvider>
              </BrandingProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
};

export default App;
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import LoginPage from "./pages/Login"; // Import the new Login page
import ProtectedRoute from "./components/ProtectedRoute"; // Import ProtectedRoute
import { AuthContextProvider } from "./contexts/AuthContext"; // Import AuthContextProvider

// Placeholder pages for now
import Projects from "./pages/Projects";
import PettyCash from "./pages/PettyCash";
import UserProfile from "./pages/UserProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthContextProvider> {/* Wrap the entire app with AuthContextProvider */}
          <Routes>
            <Route path="/login" element={<LoginPage />} /> {/* Login page */}
            <Route element={<ProtectedRoute />}> {/* Protected routes */}
              <Route path="/" element={<Layout><Index /></Layout>} />
              <Route path="/projects" element={<Layout><Projects /></Layout>} />
              <Route path="/petty-cash" element={<Layout><PettyCash /></Layout>} />
              <Route path="/profile" element={<Layout><UserProfile /></Layout>} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
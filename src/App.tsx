import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/supabase/AuthProvider";
import { AppLayout } from "@/components/AppLayout";
import ProtectedRoute from "@/components/Auth/ProtectedRoute";
import DashboardPage from "@/pages/Dashboard/DashboardPage";
import GenerateWithAIPage from "@/pages/AI/GenerateWithAIPage";
import ChatHistoryPage from "@/pages/AI/ChatHistory/ChatHistoryPage";
import AuthPage from "@/pages/Auth/AuthPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="ui-theme">
      <Toaster />
      <Sonner />
      <Router>
        <TooltipProvider>
          <AuthProvider>
            <Routes>
              {/* Public auth route */}
              <Route path="/auth" element={<AuthPage />} />
              
              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  {/* Dashboard route */}
                  <Route index element={<DashboardPage />} />
                  
                  {/* AI routes - order matters for proper URL matching */}
                  <Route path="ai">
                    {/* Important: More specific routes must come before less specific ones */}
                    <Route path="history" element={<ChatHistoryPage />} />
                    {/* Order is important: Index route should be before the dynamic route */}
                    <Route index element={<GenerateWithAIPage />} />
                    <Route path=":conversationId" element={<GenerateWithAIPage />} />
                  </Route>

                  {/* Catch-all redirect */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Route>
            </Routes>
          </AuthProvider>
        </TooltipProvider>
      </Router>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

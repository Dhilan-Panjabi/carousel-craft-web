
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NavBar } from "@/components/NavBar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/supabase/AuthProvider";

// Pages
import DashboardPage from "@/pages/Dashboard/DashboardPage";
import TemplateManagerPage from "@/pages/Templates/TemplateManagerPage";
import JobListPage from "@/pages/Jobs/JobListPage";
import GenerateWizardPage from "@/pages/Generate/GenerateWizardPage";
import AccountPage from "@/pages/Account/AccountPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="min-h-screen flex flex-col">
              <NavBar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/templates" element={<TemplateManagerPage />} />
                  <Route path="/jobs" element={<JobListPage />} />
                  <Route path="/generate" element={<GenerateWizardPage />} />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

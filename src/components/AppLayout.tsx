
import { Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

// Pages
import DashboardPage from "@/pages/Dashboard/DashboardPage";
import TemplateManagerPage from "@/pages/Templates/TemplateManagerPage";
import JobListPage from "@/pages/Jobs/JobListPage";
import GenerateWizardPage from "@/pages/Generate/GenerateWizardPage";
import AccountPage from "@/pages/Account/AccountPage";
import NotFound from "@/pages/NotFound";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
            <div className="flex flex-1 items-center justify-end space-x-4">
              <ThemeToggle />
            </div>
          </header>
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
      </div>
    </SidebarProvider>
  );
}

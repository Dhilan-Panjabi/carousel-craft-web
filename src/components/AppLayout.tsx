import { Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/supabase/AuthProvider";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import ProtectedRoute from "@/components/Auth/ProtectedRoute";

// Pages
import DashboardPage from "@/pages/Dashboard/DashboardPage";
import TemplateManagerPage from "@/pages/Templates/TemplateManagerPage";
import JobListPage from "@/pages/Jobs/JobListPage";
import JobDetailsPage from "@/pages/Jobs/JobDetailsPage";
import LibraryPage from "@/pages/Library/LibraryPage";
import GenerateWizardPage from "@/pages/Generate/GenerateWizardPage";
import AccountPage from "@/pages/Account/AccountPage";
import AuthPage from "@/pages/Auth/AuthPage";
import NotFound from "@/pages/NotFound";
import GenerateWithAIPage from "@/pages/AI/GenerateWithAIPage";
import ChatHistoryPage from "@/pages/AI/ChatHistory/ChatHistoryPage";

export function AppLayout() {
  const { user, signOut } = useAuth();
  const userEmail = user?.email || '';
  const displayEmail = userEmail.length > 20 ? `${userEmail.slice(0, 17)}...` : userEmail;

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      
      <Route element={<ProtectedRoute />}>
        <Route
          element={
            <SidebarProvider>
              <div className="flex min-h-screen w-full">
                <AppSidebar />
                <div className="flex flex-1 flex-col">
                  <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
                    <div className="flex flex-1 items-center justify-end space-x-4">
                      <ThemeToggle />
                      
                      {user && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="ml-2 gap-2">
                              <User className="h-4 w-4" />
                              <span className="hidden md:inline">{displayEmail}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => window.location.href = '/account'}>
                              Profile Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                              <LogOut className="mr-2 h-4 w-4" />
                              Logout
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </header>
                  <main className="flex-1">
                    <Routes>
                      <Route path="/" element={<DashboardPage />} />
                      <Route path="/templates" element={<TemplateManagerPage />} />
                      <Route path="/jobs" element={<JobListPage />} />
                      <Route path="/jobs/:jobId" element={<JobDetailsPage />} />
                      <Route path="/library" element={<LibraryPage />} />
                      <Route path="/generate" element={<GenerateWizardPage />} />
                      <Route path="/ai" element={<GenerateWithAIPage />} />
                      <Route path="/ai/history" element={<ChatHistoryPage />} />
                      <Route path="/ai/:conversationId" element={<GenerateWithAIPage />} />
                      <Route path="/account" element={<AccountPage />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                </div>
              </div>
            </SidebarProvider>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="/templates" element={<TemplateManagerPage />} />
          <Route path="/jobs" element={<JobListPage />} />
          <Route path="/jobs/:jobId" element={<JobDetailsPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/generate" element={<GenerateWizardPage />} />
          <Route path="/ai" element={<GenerateWithAIPage />} />
          <Route path="/ai/history" element={<ChatHistoryPage />} />
          <Route path="/ai/:conversationId" element={<GenerateWithAIPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Route>
      </Route>
      
      {/* Redirect root path if not covered by other routes */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

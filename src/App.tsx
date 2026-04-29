import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import Programs from "./pages/Programs";
import ProgramForm from "./pages/ProgramForm";
import Results from "./pages/Results";
import Auth from "./pages/Auth";
import SavedPlans from "./pages/SavedPlans";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import InactivityRedirect from "./components/InactivityRedirect";
import PWAManager from "./components/pwa/PWAManager";
import ConsentManager from "./components/legal/ConsentManager";
import BottomNav from "./components/nav/BottomNav";
import { useTheme } from "./hooks/useTheme";

const queryClient = new QueryClient();

const ThemeBoot = () => {
  // Initializes theme class on <html> before children render
  useTheme();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <ThemeBoot />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PWAManager />
            <InactivityRedirect>
              <div className="pb-16 sm:pb-0">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/programs" element={<Programs />} />
                  <Route path="/program/:type" element={<ProgramForm />} />
                  <Route path="/results" element={<Results />} />
                  <Route path="/saved-plans" element={<SavedPlans />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
              <BottomNav />
            </InactivityRedirect>
            <ConsentManager />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;

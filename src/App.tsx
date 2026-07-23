import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import ProgramForm from "./pages/ProgramForm";
import Results from "./pages/Results";
import Auth from "./pages/Auth";
import SavedPlans from "./pages/SavedPlans";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import Medals from "./pages/Medals";
import ActivityPre from "./pages/ActivityPre";
import ActivityActive from "./pages/ActivityActive";
import ActivitySummary from "./pages/ActivitySummary";
import NotFound from "./pages/NotFound";
import InactivityRedirect from "./components/InactivityRedirect";
import PWAManager from "./components/pwa/PWAManager";
import ConsentManager from "./components/legal/ConsentManager";
import BottomNav from "./components/nav/BottomNav";
import MedalToast from "./components/MedalToast";
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
                  <Route path="/programs" element={<Navigate to="/program/custom" replace />} />
                  <Route path="/program/:type" element={<ProgramForm />} />
                  <Route path="/results" element={<Results />} />
                  <Route path="/saved-plans" element={<SavedPlans />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/medals" element={<Medals />} />
                  <Route path="/running" element={<ActivityPre activity="running" />} />
                  <Route path="/running/active" element={<ActivityActive activity="running" />} />
                  <Route path="/running/summary" element={<ActivitySummary activity="running" />} />
                  <Route path="/cycling" element={<ActivityPre activity="cycling" />} />
                  <Route path="/cycling/active" element={<ActivityActive activity="cycling" />} />
                  <Route path="/cycling/summary" element={<ActivitySummary activity="cycling" />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
              <BottomNav />
            </InactivityRedirect>
            <ConsentManager />
            <MedalToast />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;

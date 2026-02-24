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
import NotFound from "./pages/NotFound";
import InactivityRedirect from "./components/InactivityRedirect";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <InactivityRedirect>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/programs" element={<Programs />} />
                <Route path="/program/:type" element={<ProgramForm />} />
                <Route path="/results" element={<Results />} />
                <Route path="/saved-plans" element={<SavedPlans />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </InactivityRedirect>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;

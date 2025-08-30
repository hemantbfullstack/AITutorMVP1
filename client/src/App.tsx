import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Tutor from "@/pages/tutor";
import Papers from "@/pages/papers";
import NotFound from "@/pages/not-found";
import PricingPage from '@/components/pricing/PricingPage';
import SuccessPage from '@/pages/success';
import CancelPage from '@/pages/cancel';
import PlanSync from '@/components/admin/PlanSync';

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading ? (
        <Route path="/" component={() => (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )} />
      ) : !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Signup} />
          <Route path="/pricing" component={PricingPage} />
          <Route path="/success" component={SuccessPage} />
          <Route path="/cancel" component={CancelPage} />
        </>
      ) : (
        <>
          <Route path="/" component={Tutor} />
          <Route path="/tutor" component={Tutor} />
          <Route path="/papers" component={Papers} />
          <Route path="/pricing" component={PricingPage} />
          <Route path="/success" component={SuccessPage} />
          <Route path="/cancel" component={CancelPage} />
          <Route path="/admin/sync" component={PlanSync} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

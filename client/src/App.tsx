import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import MainLayout from "@/components/layout/mainLayout";
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
import { AdminLayout } from './components/layout/AdminLayout';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { UserManagement } from './components/admin/UserManagement';

// Loading Component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ component: Component, requiredRole }: { 
  component: React.ComponentType<any>, 
  requiredRole?: string 
}) => {
  const { user, isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isLoggedIn) {
    window.location.href = '/login';
    return <div>Redirecting to login...</div>;
  }

  if (requiredRole && user?.role !== requiredRole) {
    window.location.href = '/tutor';
    return <div>Redirecting to tutor...</div>;
  }

  return <Component />;
};

function Router() {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Switch>
      {/* Public routes - always accessible */}
      <Route path="/" component={isLoggedIn ? Tutor : Landing} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/success" component={SuccessPage} />
      <Route path="/cancel" component={CancelPage} />
      
      {/* Protected routes - require authentication */}
      <Route path="/tutor" component={() => <ProtectedRoute component={Tutor} />} />
      <Route path="/papers" component={() => <ProtectedRoute component={Papers} />} />
      <Route path="/admin/sync" component={() => <ProtectedRoute component={PlanSync} />} />
      
      {/* Admin Routes - require admin role */}
      <Route path="/admin" component={() => (
        <ProtectedRoute component={AdminDashboard} requiredRole="admin" />
      )} />
      
      <Route path="/admin/users" component={() => (
        <ProtectedRoute component={UserManagement} requiredRole="admin" />
      )} />
      
      {/* 404 - only show when no other routes match */}
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
import { Switch, Route } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import MainLayout from "@/components/layout/mainLayout";

// Pages
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Tutor from "@/pages/tutor";
import Papers from "@/pages/papers";
import NotFound from "@/pages/not-found";
import PricingPage from '@/components/pricing/PricingPage';
import SuccessPage from '@/pages/success';
import CancelPage from '@/pages/cancel';

// Admin Components
import PlanSync from '@/components/admin/PlanSync';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { UserManagement } from '@/components/admin/UserManagement';

// Loading Component
const LoadingSpinner = () => (
  <MainLayout>
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  </MainLayout>
);

export default function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Switch>
      {/* Public routes - always accessible */}
      <Route path="/" component={isAuthenticated ? Tutor : Landing} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/success" component={SuccessPage} />
      <Route path="/cancel" component={CancelPage} />
      
      {/* Protected routes - require authentication */}
      <Route path="/tutor" component={() => (
        <ProtectedRoute>
          <Tutor />
        </ProtectedRoute>
      )} />
      
      <Route path="/papers" component={() => (
        <ProtectedRoute>
          <Papers />
        </ProtectedRoute>
      )} />
      
      {/* Admin Routes - require admin role */}
      <Route path="/admin" component={() => (
        <ProtectedRoute requiredRole="admin">
          <AdminDashboard />
        </ProtectedRoute>
      )} />
      
      <Route path="/admin/users" component={() => (
        <ProtectedRoute requiredRole="admin">
          <UserManagement />
        </ProtectedRoute>
      )} />
      
      <Route path="/admin/sync" component={() => (
        <ProtectedRoute requiredRole="admin">
          <PlanSync />
        </ProtectedRoute>
      )} />
      
      {/* 404 - only show when no other routes match */}
      <Route component={NotFound} />
    </Switch>
  );
}

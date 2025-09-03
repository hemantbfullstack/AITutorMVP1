import React, { lazy, Suspense, useMemo } from "react";
import { Switch, Route } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import MainLayout from "@/components/layout/mainLayout";
import TutorCostCalculator from "@/components/CostCalculator/costings";

// Lazy load heavy pages
const Landing = lazy(() => import("@/pages/landing"));
const Login = lazy(() => import("@/pages/login"));
const Signup = lazy(() => import("@/pages/signup"));
const Tutor = lazy(() => import("@/pages/tutor"));
const Papers = lazy(() => import("@/pages/papers"));
const NotFound = lazy(() => import("@/pages/not-found"));
const PricingPage = lazy(() => import("@/components/pricing/PricingPage"));
const SuccessPage = lazy(() => import("@/pages/success"));
const CancelPage = lazy(() => import("@/pages/cancel"));

// Admin Components - lazy load these too
const PlanSync = lazy(() => import("@/components/admin/PlanSync"));
const AdminDashboard = lazy(() =>
  import("@/components/admin/AdminDashboard").then((m) => ({
    default: m.AdminDashboard,
  }))
);
const UserManagement = lazy(() =>
  import("@/components/admin/UserManagement").then((m) => ({
    default: m.UserManagement,
  }))
);

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

// Memoized route components to prevent unnecessary re-renders
const AuthenticatedTutor = React.memo(() => (
  <Suspense fallback={<LoadingSpinner />}>
    <Tutor />
  </Suspense>
));

const PublicLanding = React.memo(() => (
  <Suspense fallback={<LoadingSpinner />}>
    <Landing />
  </Suspense>
));

const PublicLogin = React.memo(() => (
  <Suspense fallback={<LoadingSpinner />}>
    <Login />
  </Suspense>
));

const PublicSignup = React.memo(() => (
  <Suspense fallback={<LoadingSpinner />}>
    <Signup />
  </Suspense>
));

const PublicPricing = React.memo(() => (
  <Suspense fallback={<LoadingSpinner />}>
    <PricingPage />
  </Suspense>
));

const PublicSuccess = React.memo(() => (
  <Suspense fallback={<LoadingSpinner />}>
    <SuccessPage />
  </Suspense>
));

const PublicCancel = React.memo(() => (
  <Suspense fallback={<LoadingSpinner />}>
    <CancelPage />
  </Suspense>
));

const ProtectedTutor = React.memo(() => (
  <ProtectedRoute>
    <Suspense fallback={<LoadingSpinner />}>
      <Tutor />
    </Suspense>
  </ProtectedRoute>
));

const ProtectedPapers = React.memo(() => (
  <ProtectedRoute>
    <Suspense fallback={<LoadingSpinner />}>
      <Papers />
    </Suspense>
  </ProtectedRoute>
));

const ProtectedAdminDashboard = React.memo(() => (
  <ProtectedRoute requiredRole="admin">
    <Suspense fallback={<LoadingSpinner />}>
      <AdminDashboard />
    </Suspense>
  </ProtectedRoute>
));

const ProtectedUserManagement = React.memo(() => (
  <ProtectedRoute requiredRole="admin">
    <Suspense fallback={<LoadingSpinner />}>
      <UserManagement />
    </Suspense>
  </ProtectedRoute>
));

const ProtectedPlanSync = React.memo(() => (
  <ProtectedRoute requiredRole="admin">
    <Suspense fallback={<LoadingSpinner />}>
      <PlanSync />
    </Suspense>
  </ProtectedRoute>
));

const PublicNotFound = React.memo(() => (
  <Suspense fallback={<LoadingSpinner />}>
    <NotFound />
  </Suspense>
));

export default function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Switch>
      {/* Root route - redirect authenticated users to tutor, show landing to guests */}
      <Route path="/">
        {isAuthenticated ? (
          <Suspense fallback={<LoadingSpinner />}>
            <Tutor />
          </Suspense>
        ) : (
          <Suspense fallback={<LoadingSpinner />}>
            <Landing />
          </Suspense>
        )}
      </Route>

      {/* Public routes - always accessible */}
      <Route path="/login" component={PublicLogin} />
      <Route path="/signup" component={PublicSignup} />
      <Route path="/pricing" component={PublicPricing} />
      <Route path="/success" component={PublicSuccess} />
      <Route path="/cancel" component={PublicCancel} />
      <Route path="/tutorCostings" component={TutorCostCalculator} />

      

      {/* Protected routes - require authentication */}
      <Route path="/tutor" component={ProtectedTutor} />
      <Route path="/papers" component={ProtectedPapers} />

      {/* Admin Routes - require admin role */}
      <Route path="/admin" component={ProtectedAdminDashboard} />
      <Route path="/admin/users" component={ProtectedUserManagement} />
      <Route path="/admin/sync" component={ProtectedPlanSync} />

      {/* 404 - only show when no other routes match */}
      <Route component={PublicNotFound} />
    </Switch>
  );
}

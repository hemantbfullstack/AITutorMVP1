import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from "@/components/layout/mainLayout";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin';
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({ 
  children, 
  requiredRole, 
  fallback 
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!isAuthenticated) {
    window.location.href = '/login';
    return fallback || <div>Redirecting to login...</div>;
  }

  if (requiredRole && user?.role !== requiredRole) {
    window.location.href = '/tutor';
    return fallback || <div>Access denied. Redirecting...</div>;
  }

  return <MainLayout>{children}</MainLayout>;
}

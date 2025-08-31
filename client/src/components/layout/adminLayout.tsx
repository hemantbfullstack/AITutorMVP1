import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from 'wouter';
import { Button } from '../ui/button';
import { Users, BarChart3, Settings, LogOut } from 'lucide-react';
import MainLayout from './MainLayout';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, isLoading, isLoggedIn } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isLoggedIn || user?.role !== 'admin') {
    setLocation('/login');
    return <div>Access denied. Redirecting...</div>;
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setLocation('/login');
  };

  const adminNavItems = [
    { path: '/admin', label: 'Dashboard', icon: BarChart3 },
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <MainLayout showNavbar={false} className="bg-slate-50">
      <div className="flex min-h-screen">
        {/* Admin Sidebar */}
        <div className="w-64 bg-slate-900 text-white fixed left-0 top-0 bottom-0 z-40">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white mb-8">Admin Panel</h1>
            
            <nav className="space-y-2">
              {adminNavItems.map(({ path, label, icon: Icon }) => (
                <button
                  key={path}
                  onClick={() => setLocation(path)}
                  className="w-full flex items-center px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
          
          {/* Logout Button */}
          <div className="absolute bottom-6 left-6 right-6">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="ml-64 flex-1 p-6">
          {children}
        </div>
      </div>
    </MainLayout>
  );
}
import React from 'react';
import { Button } from '../ui/button';
import { Users, BarChart3, Settings, LogOut } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b">
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            <Button variant="ghost" className="w-full justify-start" asChild>
              <a href="/admin">
                <BarChart3 className="mr-2 h-4 w-4" />
                Dashboard
              </a>
            </Button>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <a href="/admin/users">
                <Users className="mr-2 h-4 w-4" />
                Users
              </a>
            </Button>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <a href="/admin/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </a>
            </Button>
          </nav>
          
          <div className="p-4 border-t">
            <Button variant="ghost" className="w-full justify-start" asChild>
              <a href="/tutor">
                <LogOut className="mr-2 h-4 w-4" />
                Back to App
              </a>
            </Button>
          </div>
        </div>
      </div>
      
      <main className="ml-64 p-6">
        {children}
      </main>
    </div>
  );
};

import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, FileText, LogOut } from "lucide-react";
import type { User } from "@shared/schema";

export default function Navbar() {
  const [location] = useLocation();
  const { user } = useAuth() as { user: User | undefined };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const navItems = [
    { path: "/tutor", label: "AI Tutor", icon: MessageSquare },
    { path: "/papers", label: "Paper Generator", icon: FileText },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Nav Items */}
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-slate-900">IB Math Tutor</h1>
            </div>
            
            <div className="hidden md:flex space-x-4">
              {navItems.map(({ path, label, icon: Icon }) => (
                <Link key={path} href={path}>
                  <a
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location === path
                        ? "bg-blue-100 text-blue-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                    data-testid={`nav-${path.replace("/", "")}`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {label}
                  </a>
                </Link>
              ))}
            </div>
          </div>

          {/* User Info and Logout */}
          <div className="flex items-center space-x-4">
            {user && (
              <div className="hidden md:flex items-center space-x-2">
                {user.profileImageUrl && (
                  <img
                    src={user.profileImageUrl}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
                <span className="text-sm text-slate-700">
                  {user.firstName || user.email}
                </span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-3 pt-2">
          <div className="flex space-x-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link key={path} href={path}>
                <a
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location === path
                      ? "bg-blue-100 text-blue-700"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                  data-testid={`nav-mobile-${path.replace("/", "")}`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </a>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
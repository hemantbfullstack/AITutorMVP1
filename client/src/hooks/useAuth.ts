import { useState, useEffect } from "react";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  planId: string;
  usageCount: number;
  imageUsageCount: number;
  voiceUsageCount: number;
  paperUsageCount: number;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        const response = await fetch("/api/user/profile", {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: "include",
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch user: ${response.status}`);
        }
        
        const userData = await response.json();
        setUser(userData);
      } catch (error) {
        console.error('Auth error:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  return {
    user: user as User | null,
    isLoading,
    isAuthenticated: !!user,
  };
}
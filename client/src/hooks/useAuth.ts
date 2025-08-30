import { useQuery } from "@tanstack/react-query";
import { User } from "../../../shared/schema";
import { useUserStore } from "../store/userStore";
import { useEffect } from "react";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });
  
  const { setUser } = useUserStore();
  
  // Sync user data with global store
  useEffect(() => {
    console.log('useAuth: user data received:', user); // Debug log
    if (user) {
      setUser(user);
    } else {
      setUser(null);
    }
  }, [user, setUser]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}

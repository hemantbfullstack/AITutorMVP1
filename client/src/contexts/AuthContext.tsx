import React, {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/authService";

interface AuthContextType {
  user: any;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [tokenExists, setTokenExists] = useState(
    !!localStorage.getItem("auth_token"),
  );

  const { data: user, isLoading } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      console.log("AuthContext: Fetching user data...");
      const result = await authService.getCurrentUser();
      console.log("AuthContext: User data fetched:", result);
      return result;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes (reduced from 30)
    gcTime: 10 * 60 * 1000, // 10 minutes (reduced from 60)
    refetchOnMount: true, // Enable refetch on mount
    refetchOnWindowFocus: true, // Enable refetch on window focus
    refetchOnReconnect: true, // Enable refetch on reconnect
    enabled: tokenExists, // Only run if token exists
  });

  // Listen for localStorage changes to trigger refetch
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "auth_token") {
        const hasToken = !!e.newValue;
        console.log("AuthContext: Token changed, hasToken:", hasToken);
        setTokenExists(hasToken);
        if (hasToken) {
          queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
        } else {
          queryClient.setQueryData(["auth", "user"], undefined);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [queryClient]);

  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      console.log("AuthContext: Logout mutation successful");
      // Clear all queries and invalidate auth queries
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      // Update token state to trigger query disable
      setTokenExists(false);
      // Clear user data
      queryClient.setQueryData(["auth", "user"], undefined);
    },
  });

  const logout = useCallback(async () => {
    try {
      console.log("AuthContext: Logging out...");
      await logoutMutation.mutateAsync();
      console.log("AuthContext: Logout successful");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [logoutMutation]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      logout,
    }),
    [user, isLoading, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

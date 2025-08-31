import { useState, useEffect } from 'react';
import { User } from '../../../shared/schema';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true
  });

  useEffect(() => {
    // Check localStorage on mount
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        setAuthState({ user, token, isLoading: false });
      } catch (error) {
        // Invalid data in localStorage, clear it
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        setAuthState({ user: null, token: null, isLoading: false });
      }
    } else {
      setAuthState({ user: null, token: null, isLoading: false });
    }
  }, []);

  const login = (user: User, token: string) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
    setAuthState({ user, token, isLoading: false });
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setAuthState({ user: null, token: null, isLoading: false });
  };

  const updateUser = (updatedUser: User) => {
    localStorage.setItem('userData', JSON.stringify(updatedUser));
    setAuthState(prev => ({ ...prev, user: updatedUser }));
  };

  return {
    user: authState.user,
    token: authState.token,
    isLoading: authState.isLoading,
    isAuthenticated: !!authState.user,
    login,
    logout,
    updateUser
  };
}

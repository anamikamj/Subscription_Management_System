import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../services/api/client';
import type { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<void>;
  quickSwitchRole: (role: UserRole) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_EMAILS: Record<UserRole, string> = {
  ADMIN: 'admin@brightloop.demo',
  STAFF: 'staff@brightloop.demo',
  CUSTOMER: 'customer@brightloop.demo',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check local storage for existing session
    const saved = localStorage.getItem('brightloop_current_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem('brightloop_current_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      const { user: authedUser } = await authApi.login(email, password);
      setUser(authedUser);
      localStorage.setItem('brightloop_current_user', JSON.stringify(authedUser));
    } finally {
      setIsLoading(false);
    }
  };

  const quickSwitchRole = async (targetRole: UserRole) => {
    const email = DEMO_EMAILS[targetRole];
    await login(email);
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        login,
        quickSwitchRole,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

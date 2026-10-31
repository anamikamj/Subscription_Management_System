import { useState, useEffect } from 'react';
import type { User, Role } from '../types';
import { apiClient } from '../services/api/client';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if token exists
    const token = apiClient.getToken() || localStorage.getItem('bl_token');
    if (token) {
      apiClient.setToken(token);
      apiClient
        .getMe()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('bl_token');
          apiClient.setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loginAsDemo = async (role: Role) => {
    let email = 'admin@brightloop.demo';
    let password = 'Admin@123';

    if (role === 'STAFF') {
      email = 'staff@brightloop.demo';
      password = 'Staff@123';
    } else if (role === 'CUSTOMER') {
      email = 'customer@brightloop.demo';
      password = 'Customer@123';
    }

    const res = await apiClient.login(email, password);
    localStorage.setItem('bl_token', res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('bl_token');
    apiClient.setToken(null);
    setUser(null);
  };

  return {
    user,
    role: user?.role || null,
    isAuthenticated: !!user,
    loading,
    loginAsDemo,
    logout
  };
}

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getAuthToken,
  getStoredUser,
  setStoredUser,
  clearAuth,
  loginUserAPI,
  fetchCurrentUserAPI,
} from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [token, setToken] = useState(() => getAuthToken());
  const [loading, setLoading] = useState(true);

  // Re-verify token on initial mount
  useEffect(() => {
    const verifyUser = async () => {
      const storedToken = getAuthToken();
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetchCurrentUserAPI();
        if (res && res.success && res.user) {
          setCurrentUser(res.user);
          setStoredUser(res.user);
        } else {
          // Token expired or invalid
          clearAuth();
          setCurrentUser(null);
          setToken('');
        }
      } catch {
        // Fallback to local stored user
        const stored = getStoredUser();
        if (stored) setCurrentUser(stored);
      } finally {
        setLoading(false);
      }
    };

    verifyUser();
  }, []);

  const login = async (credentials) => {
    const res = await loginUserAPI(credentials);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      setToken(res.token);
    }
    return res;
  };

  const logout = () => {
    clearAuth();
    setCurrentUser(null);
    setToken('');
  };

  // Permission helpers
  const role = currentUser?.role || null;
  const isAuthenticated = !!currentUser && !!token;

  // superadmin has universal rights
  const isSuperAdmin = role === 'superadmin';
  const isPrincipal = role === 'principal' || isSuperAdmin;
  const isCoordinator = role === 'coordinator' || isPrincipal;
  const isTeacher = role === 'teacher';

  const canManageUsers = isSuperAdmin || role === 'principal';
  const canAccessAllRooms = isSuperAdmin || isPrincipal || isCoordinator;

  const value = {
    currentUser,
    token,
    role,
    isAuthenticated,
    loading,
    login,
    logout,
    isSuperAdmin,
    isPrincipal,
    isCoordinator,
    isTeacher,
    canManageUsers,
    canAccessAllRooms,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

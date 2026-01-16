import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/apiClient';
import type { AuthUser } from '../types';

interface AuthContextValue {
  user?: AuthUser;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

// Context untuk menyimpan status autentikasi global.
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Kunci localStorage agar sesi login tetap ada setelah refresh.
const USER_KEY = 'petid_user';

// Provider membungkus aplikasi dan menyimpan state user.
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Ambil user dari localStorage saat inisialisasi pertama.
  const [user, setUser] = useState<AuthUser | undefined>(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch (error) {
      console.error('Failed to parse user from storage', error);
      return undefined;
    }
  });
  const [loading, setLoading] = useState(false);

  // Sinkronkan perubahan user ke localStorage.
  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [user]);

  // Proses login yang mengaktifkan loading dan menyimpan user.
  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await authApi.login(email, password);
      setUser(result.user);
      return result.user;
    } finally {
      setLoading(false);
    }
  };

  // Proses logout menghapus token dan reset state user.
  const logout = () => {
    authApi.logout();
    setUser(undefined);
  };

  // Memoisasi value agar tidak memicu render ulang berlebihan.
  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      login: handleLogin,
      logout,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook helper agar penggunaan context konsisten di seluruh komponen.
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface BusinessIdentity {
  identity_type: string;
  identity_code: string;
  display_name: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  roles: string[];
  department: string | null;
  status: string;
  must_change_password: boolean;
  profile_image_url: string | null;
  business_identities?: BusinessIdentity[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/me', {
        credentials: 'include', // 重要：包含 session cookie
      });

      if (response.status === 401) {
        // 未登入
        setUser(null);
        return;
      }

      if (!response.ok) {
        throw new Error('無法取得使用者資料');
      }

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err: any) {
      console.error('取得使用者資料錯誤:', err);
      setError(err.message || '取得使用者資料失敗');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || '登入失敗' };
      }
    } catch (err: any) {
      console.error('登入錯誤:', err);
      return { success: false, error: err.message || '登入失敗' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      setUser(null);
    } catch (err) {
      console.error('登出錯誤:', err);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        refetch: fetchCurrentUser,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

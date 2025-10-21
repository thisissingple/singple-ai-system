/**
 * 受保護的路由組件
 * 檢查用戶是否已登入，未登入則重定向到登入頁
 */

import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  // 開發模式：跳過認證檢查
  const isDevelopment = import.meta.env.DEV;
  if (isDevelopment) {
    return <>{children}</>;
  }

  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // 如果載入完成且用戶未登入，重定向到登入頁
    if (!loading && !user) {
      setLocation('/login');
    }
  }, [user, loading, setLocation]);

  // 顯示載入中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  // 如果未登入，顯示載入（即將重定向）
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">重定向到登入頁...</p>
        </div>
      </div>
    );
  }

  // 已登入，顯示受保護的內容
  return <>{children}</>;
}

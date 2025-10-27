/**
 * 登入頁面
 * 員工使用 Email + 密碼登入系統
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // 重要：包含 session cookie
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError('伺服器錯誤，請稍後再試');
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (!data.success) {
        setError(data.error || '登入失敗');
        setLoading(false);
        return;
      }

      // 檢查是否需要修改密碼
      if (data.user?.must_change_password) {
        setLocation('/change-password');
        return;
      }

      // 登入成功，跳轉到首頁
      window.location.href = '/'; // 使用 window.location.href 強制重新載入
    } catch (err: any) {
      console.error('登入錯誤:', err);
      setError('網路錯誤，請稍後再試');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <LogIn className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">員工登入</CardTitle>
          <CardDescription>
            請使用您的 Email 和密碼登入系統
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* 錯誤訊息 */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Email 欄位 */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your.email@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username email"
                autoFocus
                disabled={loading}
              />
            </div>

            {/* 密碼欄位 */}
            <div className="space-y-2">
              <Label htmlFor="password">密碼</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* 登入按鈕 */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !email || !password}
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  登入中...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  登入
                </>
              )}
            </Button>

            {/* 忘記密碼提示 */}
            <p className="text-center text-sm text-muted-foreground mt-4">
              忘記密碼？請聯絡系統管理員重設密碼
            </p>
          </form>

          {/* 版本資訊 */}
          <div className="mt-6 pt-4 border-t text-center text-xs text-muted-foreground">
            <p>教育機構管理系統 v1.0</p>
            <p className="mt-1">© {new Date().getFullYear()} All rights reserved</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

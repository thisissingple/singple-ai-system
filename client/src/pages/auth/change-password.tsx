/**
 * 修改密碼頁面
 * 首次登入或使用者主動修改密碼
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Key, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ChangePasswordPage() {
  const [, setLocation] = useLocation();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mustChange, setMustChange] = useState(false);

  useEffect(() => {
    // 檢查使用者狀態
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          setLocation('/login');
          return;
        }
        setMustChange(data.user.must_change_password);
      })
      .catch(() => {
        setLocation('/login');
      });
  }, [setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 驗證密碼
    if (newPassword.length < 6) {
      setError('新密碼長度至少 6 個字元');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('新密碼與確認密碼不符');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword: mustChange ? null : oldPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || '修改密碼失敗');
        setLoading(false);
        return;
      }

      // 修改成功，跳轉到首頁
      setLocation('/');
    } catch (err: any) {
      setError('網路錯誤，請稍後再試');
      setLoading(false);
    }
  };

  const passwordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, text: '' };
    if (password.length < 6) return { strength: 1, text: '弱', color: 'text-red-500' };
    if (password.length < 10) return { strength: 2, text: '中', color: 'text-yellow-500' };
    return { strength: 3, text: '強', color: 'text-green-500' };
  };

  const strength = passwordStrength(newPassword);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <Key className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {mustChange ? '設定新密碼' : '修改密碼'}
          </CardTitle>
          <CardDescription>
            {mustChange
              ? '首次登入需要設定新密碼'
              : '為了帳號安全，請定期修改密碼'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 錯誤訊息 */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 強制修改密碼提示 */}
            {mustChange && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  這是您第一次登入，請設定新密碼以保護您的帳號安全
                </AlertDescription>
              </Alert>
            )}

            {/* 舊密碼（非強制修改時才需要） */}
            {!mustChange && (
              <div className="space-y-2">
                <Label htmlFor="oldPassword">目前密碼</Label>
                <div className="relative">
                  <Input
                    id="oldPassword"
                    type={showOldPassword ? 'text' : 'password'}
                    placeholder="請輸入目前密碼"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    disabled={loading}
                  >
                    {showOldPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 新密碼 */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">新密碼</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="至少 6 個字元"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  disabled={loading}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {/* 密碼強度指示器 */}
              {newPassword && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        strength.strength === 1
                          ? 'w-1/3 bg-red-500'
                          : strength.strength === 2
                          ? 'w-2/3 bg-yellow-500'
                          : 'w-full bg-green-500'
                      }`}
                    />
                  </div>
                  <span className={strength.color}>強度：{strength.text}</span>
                </div>
              )}
            </div>

            {/* 確認密碼 */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">確認新密碼</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="請再次輸入新密碼"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {/* 密碼匹配提示 */}
              {confirmPassword && (
                <p
                  className={`text-sm ${
                    newPassword === confirmPassword
                      ? 'text-green-500'
                      : 'text-red-500'
                  }`}
                >
                  {newPassword === confirmPassword ? '✓ 密碼相符' : '✗ 密碼不符'}
                </p>
              )}
            </div>

            {/* 提交按鈕 */}
            <Button
              type="submit"
              className="w-full"
              disabled={
                loading ||
                !newPassword ||
                !confirmPassword ||
                newPassword !== confirmPassword ||
                (!mustChange && !oldPassword)
              }
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  處理中...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  {mustChange ? '設定密碼' : '修改密碼'}
                </>
              )}
            </Button>

            {/* 取消按鈕（非強制修改時） */}
            {!mustChange && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setLocation('/')}
                disabled={loading}
              >
                取消
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

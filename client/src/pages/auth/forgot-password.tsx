/**
 * 忘記密碼頁面
 * 使用者輸入 Email 後，系統會通知管理員重設密碼
 */

import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || '請求失敗，請稍後再試');
        setLoading(false);
        return;
      }

      // 成功
      setSuccess(true);
      setLoading(false);
    } catch (err: any) {
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
              <Mail className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">忘記密碼</CardTitle>
          <CardDescription>
            請輸入您的 Email，管理員會協助您重設密碼
          </CardDescription>
        </CardHeader>

        <CardContent>
          {success ? (
            // 提交成功畫面
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <strong>已收到您的請求！</strong>
                  <p className="mt-2">
                    管理員會在確認您的身份後，透過 Email 提供臨時密碼。
                  </p>
                  <p className="mt-1 text-sm">
                    若 24 小時內未收到回覆，請直接聯絡管理員。
                  </p>
                </AlertDescription>
              </Alert>

              <Link href="/login">
                <a>
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    返回登入頁面
                  </Button>
                </a>
              </Link>
            </div>
          ) : (
            // 表單
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 錯誤訊息 */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* 說明 */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  提交後，管理員會驗證您的帳號並透過 Email 提供新密碼。
                </AlertDescription>
              </Alert>

              {/* Email 欄位 */}
              <div className="space-y-2">
                <Label htmlFor="email">您的 Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  請輸入您註冊時使用的 Email 地址
                </p>
              </div>

              {/* 提交按鈕 */}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !email}
              >
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    提交中...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    提交請求
                  </>
                )}
              </Button>

              {/* 返回登入連結 */}
              <Link href="/login">
                <a>
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    返回登入頁面
                  </Button>
                </a>
              </Link>
            </form>
          )}

          {/* 聯絡資訊 */}
          <div className="mt-6 pt-4 border-t text-center text-xs text-muted-foreground">
            <p>遇到問題？請聯絡管理員</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

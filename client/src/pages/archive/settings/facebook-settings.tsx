/**
 * Facebook Lead Ads 整合設定頁面
 * 功能：登入 Facebook、選擇表單、手動同步
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw, LogIn } from 'lucide-react';

interface FacebookSettings {
  connected: boolean;
  facebook_user_name?: string;
  page_name?: string;
  form_ids: string[];
  form_names: Record<string, string>;
  sync_enabled: boolean;
  sync_interval_minutes: number;
  last_sync_at?: string;
  last_sync_status?: string;
  last_sync_count?: number;
  last_sync_new_leads?: number;
  last_sync_error?: string;
  token_expires_at?: string;
}

interface LeadForm {
  id: string;
  name: string;
  status: string;
  leads_count: number;
}

export default function FacebookSettings() {
  const queryClient = useQueryClient();
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 查詢設定狀態
  const { data: settingsData, isLoading: settingsLoading } = useQuery<{ success: boolean; connected: boolean; settings: FacebookSettings | null }>({
    queryKey: ['/api/facebook/settings'],
    refetchInterval: 10000,  // 10秒刷新一次
  });

  const settings = settingsData?.settings;
  const isConnected = settingsData?.connected || false;

  // 查詢表單列表
  const { data: formsData, isLoading: formsLoading } = useQuery<{ success: boolean; forms: LeadForm[] }>({
    queryKey: ['/api/facebook/forms'],
    enabled: isConnected,  // 只有連接後才查詢
  });

  const forms = formsData?.forms || [];

  // 初始化選擇的表單
  useState(() => {
    if (settings?.form_ids) {
      setSelectedFormIds(settings.form_ids);
    }
  });

  // 登入 Facebook（使用彈出視窗）
  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/facebook/auth-url');
      const data = await response.json();
      if (!data.success) throw new Error(data.error || '取得登入 URL 失敗');
      return data;
    },
    onSuccess: (data) => {
      // 彈出視窗（Meta Business Integration 方式）
      const width = 600;
      const height = 700;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;

      const popup = window.open(
        data.authUrl,
        'facebook-login',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );

      // 監聽彈出視窗關閉（授權完成）
      const checkPopup = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(checkPopup);
          // 重新載入設定以檢查是否連接成功
          queryClient.invalidateQueries({ queryKey: ['/api/facebook/settings'] });
        }
      }, 500);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
    },
  });

  // 儲存設定
  const saveMutation = useMutation({
    mutationFn: async () => {
      const formNames: Record<string, string> = {};
      selectedFormIds.forEach((formId) => {
        const form = forms.find((f) => f.id === formId);
        if (form) formNames[formId] = form.name;
      });

      const response = await fetch('/api/facebook/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_ids: selectedFormIds,
          form_names: formNames,
          sync_enabled: true,
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || '儲存設定失敗');
      return data;
    },
    onSuccess: () => {
      setSuccessMessage('設定已儲存');
      queryClient.invalidateQueries({ queryKey: ['/api/facebook/settings'] });
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
    },
  });

  // 手動同步
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/facebook/sync', {
        method: 'POST',
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || '同步失敗');
      return data;
    },
    onSuccess: (data) => {
      setSuccessMessage(data.message);
      queryClient.invalidateQueries({ queryKey: ['/api/facebook/settings'] });
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
    },
  });

  // 監聽彈出視窗的授權完成訊息
  useState(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'facebook-auth-success') {
        setSuccessMessage('Facebook 連接成功！');
        queryClient.invalidateQueries({ queryKey: ['/api/facebook/settings'] });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  });

  // 處理 URL 參數（登入回來後的狀態）
  useState(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');

    if (success === 'true') {
      setSuccessMessage('Facebook 連接成功！');
      // 清除 URL 參數
      window.history.replaceState({}, '', '/settings/facebook');
    } else if (error) {
      setErrorMessage(`連接失敗：${error}`);
      window.history.replaceState({}, '', '/settings/facebook');
    }
  });

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Facebook Lead Ads 整合</h1>
        <p className="text-gray-500 mt-2">
          連接 Facebook 帳號，自動同步廣告表單的名單
        </p>
      </div>

      {/* 錯誤訊息 */}
      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* 成功訊息 */}
      {successMessage && (
        <Alert className="mb-4 border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* 連接狀態 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>連接狀態</CardTitle>
          <CardDescription>Facebook 帳號連接狀態</CardDescription>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  尚未連接 Facebook。點擊下方按鈕登入您的 Facebook 帳號。
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => loginMutation.mutate()}
                disabled={loginMutation.isPending}
                size="lg"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    連接中...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    登入 Facebook
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="font-medium">已連接 Facebook</span>
              </div>
              {settings?.facebook_user_name && (
                <div className="text-sm text-gray-600">
                  帳號：{settings.facebook_user_name}
                </div>
              )}
              {settings?.page_name && (
                <div className="text-sm text-gray-600">
                  粉絲專頁：{settings.page_name}
                </div>
              )}
              {settings?.token_expires_at && (
                <div className="text-sm text-gray-500">
                  Token 有效期至：{new Date(settings.token_expires_at).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 表單選擇 */}
      {isConnected && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>選擇要同步的表單</CardTitle>
            <CardDescription>
              勾選要自動同步名單的 Lead Ads 表單
            </CardDescription>
          </CardHeader>
          <CardContent>
            {formsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : forms.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  此粉絲專頁尚無 Lead Ads 表單
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {forms.map((form) => (
                  <div key={form.id} className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50">
                    <Checkbox
                      id={form.id}
                      checked={selectedFormIds.includes(form.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedFormIds([...selectedFormIds, form.id]);
                        } else {
                          setSelectedFormIds(selectedFormIds.filter((id) => id !== form.id));
                        }
                      }}
                    />
                    <Label htmlFor={form.id} className="flex-1 cursor-pointer">
                      <div className="font-medium">{form.name}</div>
                      <div className="text-sm text-gray-500">
                        狀態：{form.status === 'ACTIVE' ? '啟用' : form.status} · 名單數：{form.leads_count}
                      </div>
                    </Label>
                  </div>
                ))}

                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || selectedFormIds.length === 0}
                  className="mt-4"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      儲存中...
                    </>
                  ) : (
                    '儲存設定'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 同步狀態 */}
      {isConnected && settings && (
        <Card>
          <CardHeader>
            <CardTitle>同步狀態</CardTitle>
            <CardDescription>名單同步記錄</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">自動同步</span>
                <span className="font-medium">
                  {settings.sync_enabled ? '✅ 已啟用' : '❌ 未啟用'}
                </span>
              </div>

              {settings.last_sync_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">最後同步時間</span>
                  <span className="font-medium">
                    {new Date(settings.last_sync_at).toLocaleString()}
                  </span>
                </div>
              )}

              {settings.last_sync_status && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">同步狀態</span>
                  <span className={`font-medium ${settings.last_sync_status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {settings.last_sync_status === 'success' ? '✅ 成功' : '❌ 失敗'}
                  </span>
                </div>
              )}

              {settings.last_sync_status === 'success' && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">同步結果</span>
                  <span className="font-medium">
                    新增 {settings.last_sync_new_leads || 0} 筆（共處理 {settings.last_sync_count || 0} 筆）
                  </span>
                </div>
              )}

              {settings.last_sync_error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{settings.last_sync_error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending || !settings.form_ids || settings.form_ids.length === 0}
                variant="outline"
                className="w-full mt-4"
              >
                {syncMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    同步中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    立即同步
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

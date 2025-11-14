/**
 * 登入除錯頁面
 * 用於診斷登入問題
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginDebugPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const testLogin = async () => {
    setLogs([]);
    addLog('🔍 開始登入測試...');

    try {
      // 步驟 1: 檢查 Cookie 支援
      addLog('步驟 1: 檢查瀏覽器 Cookie 支援');
      const cookieEnabled = navigator.cookieEnabled;
      addLog(`Cookie 支援: ${cookieEnabled ? '✅ 已啟用' : '❌ 已停用'}`);

      if (!cookieEnabled) {
        addLog('⚠️ Cookie 已停用！這會導致登入失敗');
        addLog('請在瀏覽器設定中啟用 Cookie');
        return;
      }

      // 步驟 2: 登入
      addLog('步驟 2: 發送登入請求');
      addLog(`POST /api/auth/login`);

      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      addLog(`HTTP Status: ${loginResponse.status}`);

      const loginData = await loginResponse.json();
      addLog(`登入結果: ${loginData.success ? '✅ 成功' : '❌ 失敗'}`);

      if (!loginData.success) {
        addLog(`錯誤訊息: ${loginData.error}`);
        return;
      }

      addLog(`用戶 ID: ${loginData.user.id}`);
      addLog(`需要修改密碼: ${loginData.user.must_change_password}`);

      // 步驟 3: 檢查 Cookie
      addLog('步驟 3: 檢查 Cookie 是否已設定');
      const cookies = document.cookie;
      addLog(`document.cookie: ${cookies || '(空)'}`);

      const hasConnectSid = cookies.includes('connect.sid');
      addLog(`connect.sid Cookie: ${hasConnectSid ? '✅ 存在' : '❌ 不存在'}`);

      if (!hasConnectSid) {
        addLog('⚠️ Cookie 沒有被設定！');
        addLog('可能原因：');
        addLog('  1. 瀏覽器封鎖第三方 Cookie');
        addLog('  2. Cookie 的 Domain 或 Path 設定錯誤');
        addLog('  3. 無痕模式限制');
      }

      // 步驟 4: 測試 Session
      addLog('步驟 4: 測試 Session (GET /api/auth/me)');

      const meResponse = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });

      addLog(`HTTP Status: ${meResponse.status}`);

      if (meResponse.status === 401) {
        addLog('❌ Session 無效 (401 Unauthorized)');
        addLog('這表示 Cookie 沒有正確傳遞到伺服器');
      } else if (meResponse.status === 200) {
        const meData = await meResponse.json();
        addLog('✅ Session 有效！');
        addLog(`用戶: ${meData.user?.email}`);
      }

      // 步驟 5: 檢查除錯 API
      addLog('步驟 5: 檢查 Session 詳情 (GET /api/auth/debug-session)');

      const debugResponse = await fetch('/api/auth/debug-session', {
        credentials: 'include',
      });

      const debugData = await debugResponse.json();
      addLog('Session 詳情:');
      addLog(`  - hasSession: ${debugData.data.hasSession}`);
      addLog(`  - userId: ${debugData.data.userId || '(無)'}`);
      addLog(`  - sessionId: ${debugData.data.sessionId || '(無)'}`);
      addLog(`  - store: ${debugData.data.store}`);

    } catch (error: any) {
      addLog(`❌ 錯誤: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>登入除錯工具</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mama725619@gmail.com"
              />
            </div>
            <div>
              <Label>密碼</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button onClick={testLogin} className="w-full">
              測試登入
            </Button>
          </CardContent>
        </Card>

        {logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>診斷日誌</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded font-mono text-sm space-y-1 max-h-96 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

# 諮詢分析 AI 配置系統實作指南

## 概述

本系統允許管理員（xk4xk4563022@gmail.com）通過前端介面調整諮詢品質 AI 分析的配置，包括：
- AI 模型選擇 (gpt-4o, gpt-4-turbo, 等)
- Temperature (創意度)
- Max Tokens (輸出長度)
- 完整 Prompt 文字編輯

## 已完成的工作

### 1. 資料庫 Migration ✅
- 檔案: `supabase/migrations/047_create_consultation_analysis_config.sql`
- 表: `consultation_analysis_config` (singleton - 僅一筆記錄)
- 預設值已插入

### 2. 執行腳本 ✅
- 檔案: `scripts/run-migration-047.ts`
- Migration 已成功執行

## 需要完成的工作

### 階段 2: 修改 GPT Service

修改 `server/services/consultation-quality-gpt-service.ts`：

```typescript
import { createPool } from '../pg-client';

// 新增配置型別
interface AnalysisConfig {
  ai_model: string;
  temperature: number;
  max_tokens: number;
  analysis_prompt: string;
}

export class ConsultationQualityGPTService {
  private openai: OpenAI | null = null;
  private config: AnalysisConfig | null = null;

  // 新增方法：從資料庫載入配置
  private async loadConfig(): Promise<AnalysisConfig> {
    if (this.config) {
      return this.config;
    }

    const pool = createPool();
    try {
      const query = `
        SELECT ai_model, temperature, max_tokens, analysis_prompt
        FROM consultation_analysis_config
        WHERE id = '00000000-0000-0000-0000-000000000001'::UUID
        LIMIT 1
      `;
      const result = await pool.query(query);

      if (result.rows.length === 0) {
        // 如果資料庫無配置，使用預設值 (fallback)
        this.config = {
          ai_model: 'gpt-4o',
          temperature: 0.7,
          max_tokens: 4000,
          analysis_prompt: CONSULTATION_QUALITY_ANALYSIS_PROMPT, // 使用硬編碼 prompt 作為預設
        };
      } else {
        this.config = result.rows[0];
      }

      return this.config;
    } finally {
      await pool.end();
    }
  }

  // 新增方法：清除快取（當配置更新時呼叫）
  public clearConfigCache(): void {
    this.config = null;
  }

  // 修改分析方法：使用資料庫配置
  async analyzeConsultationQuality(transcript: string): Promise<ConsultationQualityAnalysis> {
    try {
      const openai = this.getOpenAI();
      const config = await this.loadConfig(); // 載入配置

      const completion = await openai.chat.completions.create({
        model: config.ai_model,           // 從資料庫讀取
        messages: [
          { role: 'system', content: config.analysis_prompt }, // 從資料庫讀取
          { role: 'user', content: `請分析以下諮詢逐字稿：\n\n${transcript}` },
        ],
        temperature: config.temperature,   // 從資料庫讀取
        max_tokens: config.max_tokens,     // 從資料庫讀取
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content returned from OpenAI API');
      }

      const analysis = parseAnalysisOutput(content);
      return analysis;
    } catch (error) {
      console.error('Error analyzing consultation quality:', error);
      throw error;
    }
  }
}
```

### 階段 3: 新增後端 API

在 `server/routes-consultation-quality.ts` 新增 3 個端點：

```typescript
import { requireAdmin } from './auth';

// 5. GET /api/consultation-quality/config - 取得配置
app.get('/api/consultation-quality/config', requireAdmin, async (req: any, res) => {
  try {
    const pool = createPool();
    const query = `
      SELECT ai_model, temperature, max_tokens, analysis_prompt, updated_at, updated_by
      FROM consultation_analysis_config
      WHERE id = '00000000-0000-0000-0000-000000000001'::UUID
    `;
    const result = await pool.query(query);
    await pool.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '配置不存在' });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Failed to fetch config:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. PUT /api/consultation-quality/config - 更新配置
app.put('/api/consultation-quality/config', requireAdmin, async (req: any, res) => {
  try {
    const { ai_model, temperature, max_tokens, analysis_prompt } = req.body;
    const userEmail = req.session?.user?.email || 'unknown';

    // 驗證
    if (!ai_model || temperature == null || !max_tokens || !analysis_prompt) {
      return res.status(400).json({ error: '所有欄位都是必填的' });
    }

    if (temperature < 0 || temperature > 1) {
      return res.status(400).json({ error: 'Temperature 必須在 0-1 之間' });
    }

    const pool = createPool();
    const query = `
      UPDATE consultation_analysis_config
      SET
        ai_model = $1,
        temperature = $2,
        max_tokens = $3,
        analysis_prompt = $4,
        updated_at = NOW(),
        updated_by = $5
      WHERE id = '00000000-0000-0000-0000-000000000001'::UUID
      RETURNING *
    `;
    const result = await pool.query(query, [
      ai_model,
      temperature,
      max_tokens,
      analysis_prompt,
      userEmail,
    ]);
    await pool.end();

    // 清除快取
    consultationQualityGPTService.clearConfigCache();

    res.json({
      success: true,
      data: result.rows[0],
      message: '配置已更新',
    });
  } catch (error: any) {
    console.error('Failed to update config:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7. POST /api/consultation-quality/config/reset - 重置為預設值
app.post('/api/consultation-quality/config/reset', requireAdmin, async (req: any, res) => {
  try {
    const userEmail = req.session?.user?.email || 'unknown';
    const pool = createPool();

    // 讀取預設 prompt (重新執行 migration 的預設值)
    const defaultPrompt = CONSULTATION_QUALITY_ANALYSIS_PROMPT; // 從 service 匯入

    const query = `
      UPDATE consultation_analysis_config
      SET
        ai_model = 'gpt-4o',
        temperature = 0.7,
        max_tokens = 4000,
        analysis_prompt = $1,
        updated_at = NOW(),
        updated_by = $2
      WHERE id = '00000000-0000-0000-0000-000000000001'::UUID
      RETURNING *
    `;
    const result = await pool.query(query, [defaultPrompt, userEmail]);
    await pool.end();

    // 清除快取
    consultationQualityGPTService.clearConfigCache();

    res.json({
      success: true,
      data: result.rows[0],
      message: '配置已重置為預設值',
    });
  } catch (error: any) {
    console.error('Failed to reset config:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 階段 4: 前端配置頁面

建立 `client/src/pages/settings/consultation-analysis-config.tsx`：

```typescript
import React, { useState, useEffect } from 'react';
import { Button, Card, Input, Textarea, Alert, Spinner } from '@/components/ui';

export default function ConsultationAnalysisConfig() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    ai_model: '',
    temperature: 0.7,
    max_tokens: 4000,
    analysis_prompt: '',
  });

  // 載入配置
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/consultation-quality/config');
      const data = await response.json();
      if (data.success) {
        setConfig(data.data);
        setFormData({
          ai_model: data.data.ai_model,
          temperature: data.data.temperature,
          max_tokens: data.data.max_tokens,
          analysis_prompt: data.data.analysis_prompt,
        });
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
      setMessage({ type: 'error', text: '載入配置失敗' });
    } finally {
      setLoading(false);
    }
  };

  // 儲存配置
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/consultation-quality/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: '配置已儲存' });
        setConfig(data.data);
      } else {
        setMessage({ type: 'error', text: data.error || '儲存失敗' });
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      setMessage({ type: 'error', text: '儲存配置失敗' });
    } finally {
      setSaving(false);
    }
  };

  // 重置配置
  const handleReset = async () => {
    if (!confirm('確定要重置為預設值嗎？')) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/consultation-quality/config/reset', {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: '配置已重置' });
        setConfig(data.data);
        setFormData({
          ai_model: data.data.ai_model,
          temperature: data.data.temperature,
          max_tokens: data.data.max_tokens,
          analysis_prompt: data.data.analysis_prompt,
        });
      } else {
        setMessage({ type: 'error', text: data.error || '重置失敗' });
      }
    } catch (error) {
      console.error('Failed to reset config:', error);
      setMessage({ type: 'error', text: '重置配置失敗' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">諮詢分析 AI 配置</h1>

      {message && (
        <Alert type={message.type} className="mb-4">
          {message.text}
        </Alert>
      )}

      <Card className="p-6 space-y-6">
        {/* AI 模型 */}
        <div>
          <label className="block text-sm font-medium mb-2">AI 模型</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={formData.ai_model}
            onChange={(e) => setFormData({ ...formData, ai_model: e.target.value })}
          >
            <option value="gpt-4o">gpt-4o (推薦)</option>
            <option value="gpt-4-turbo">gpt-4-turbo</option>
            <option value="gpt-4">gpt-4</option>
            <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
          </select>
        </div>

        {/* Temperature */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Temperature (創意度): {formData.temperature}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={formData.temperature}
            onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">0 = 精確, 1 = 創意</p>
        </div>

        {/* Max Tokens */}
        <div>
          <label className="block text-sm font-medium mb-2">Max Tokens (輸出長度)</label>
          <input
            type="number"
            min="1000"
            max="8000"
            step="100"
            value={formData.max_tokens}
            onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* Prompt 編輯器 */}
        <div>
          <label className="block text-sm font-medium mb-2">AI Prompt (分析指令)</label>
          <textarea
            value={formData.analysis_prompt}
            onChange={(e) => setFormData({ ...formData, analysis_prompt: e.target.value })}
            className="w-full border rounded px-3 py-2 font-mono text-sm"
            rows={20}
            placeholder="輸入 AI 分析的完整 prompt..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Prompt 長度: {formData.analysis_prompt.length} 字元
          </p>
        </div>

        {/* 按鈕 */}
        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? <Spinner size="sm" /> : '儲存配置'}
          </Button>
          <Button onClick={handleReset} variant="outline" disabled={saving}>
            重置為預設值
          </Button>
        </div>

        {/* 最後更新資訊 */}
        {config && (
          <div className="text-xs text-gray-500 mt-4 pt-4 border-t">
            <p>最後更新: {new Date(config.updated_at).toLocaleString('zh-TW')}</p>
            <p>更新者: {config.updated_by}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
```

### 階段 5: 路由與權限

1. **註冊前端路由** (`client/src/App.tsx`):

```typescript
import ConsultationAnalysisConfig from './pages/settings/consultation-analysis-config';

// 在 Router 中新增
<Route path="/settings/consultation-analysis-config" element={
  <ProtectedRoute>
    <ConsultationAnalysisConfig />
  </ProtectedRoute>
} />
```

2. **更新權限** (`configs/permissions.ts`):

```typescript
export const routePermissions: Record<string, string[]> = {
  // ... 其他路由
  '/settings/consultation-analysis-config': ['admin'],
};
```

3. **新增側邊欄選單** (`client/src/components/Sidebar.tsx`):

```typescript
{
  name: '諮詢分析設定',
  path: '/settings/consultation-analysis-config',
  icon: Settings,
  roles: ['admin'],
}
```

## 測試步驟

1. 重啟伺服器
2. 以 admin 身分登入 (xk4xk4563022@gmail.com)
3. 前往 `/settings/consultation-analysis-config`
4. 修改配置並儲存
5. 觸發一次諮詢分析，確認使用新配置
6. 測試重置功能

## 注意事項

- 權限限制：僅 admin 可訪問配置頁面
- 快取機制：配置更新後自動清除快取
- 預設值：如果資料庫無配置，系統使用硬編碼預設值
- Singleton Pattern：配置表僅一筆記錄，ID 固定為 `00000000-0000-0000-0000-000000000001`

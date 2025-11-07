/**
 * 諮詢分析 AI 配置頁面
 * 允許 admin 調整 AI 模型、溫度、輸出長度和完整 Prompt
 * 包含：分析 Prompt 和聊天助手 Prompt
 */

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Save, RotateCcw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sidebarConfig } from '@/config/sidebar-config';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AnalysisConfig {
  ai_model: string;
  temperature: number;
  max_tokens: number;
  analysis_prompt: string;
  chat_ai_model: string;
  chat_temperature: number;
  chat_max_tokens: number;
  chat_system_prompt: string;
  updated_at: string;
  updated_by: string;
}

function ConsultationAnalysisConfigContent() {
  const [config, setConfig] = useState<AnalysisConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    ai_model: 'gpt-4o',
    temperature: 0.7,
    max_tokens: 4000,
    analysis_prompt: '',
    chat_ai_model: 'gpt-4o',
    chat_temperature: 0.7,
    chat_max_tokens: 2000,
    chat_system_prompt: '',
  });

  // 載入配置
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/consultation-quality/config');
      const data = await response.json();

      if (data.success && data.data) {
        setConfig(data.data);
        setFormData({
          ai_model: data.data.ai_model,
          temperature: data.data.temperature,
          max_tokens: data.data.max_tokens,
          analysis_prompt: data.data.analysis_prompt,
          chat_ai_model: data.data.chat_ai_model,
          chat_temperature: data.data.chat_temperature,
          chat_max_tokens: data.data.chat_max_tokens,
          chat_system_prompt: data.data.chat_system_prompt,
        });
      } else {
        setMessage({ type: 'error', text: '載入配置失敗' });
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
        toast({
          title: '儲存成功',
          description: 'AI 分析配置已更新',
        });
      } else {
        setMessage({ type: 'error', text: data.error || '儲存失敗' });
        toast({
          title: '儲存失敗',
          description: data.error || '未知錯誤',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      setMessage({ type: 'error', text: '儲存配置失敗' });
      toast({
        title: '儲存失敗',
        description: '網路錯誤，請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // 重置配置
  const handleReset = async () => {
    if (!confirm('確定要重置為預設值嗎？所有自訂配置將會遺失。')) return;

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
          chat_ai_model: data.data.chat_ai_model,
          chat_temperature: data.data.chat_temperature,
          chat_max_tokens: data.data.chat_max_tokens,
          chat_system_prompt: data.data.chat_system_prompt,
        });
        toast({
          title: '重置成功',
          description: '已恢復為預設配置',
        });
      } else {
        setMessage({ type: 'error', text: data.error || '重置失敗' });
        toast({
          title: '重置失敗',
          description: data.error || '未知錯誤',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to reset config:', error);
      setMessage({ type: 'error', text: '重置配置失敗' });
      toast({
        title: '重置失敗',
        description: '網路錯誤，請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">諮詢分析 AI 配置</h1>
        <p className="text-muted-foreground mt-1">
          調整 OpenAI GPT 模型參數和 Prompt，影響諮詢品質分析結果和聊天助手回應
        </p>
      </div>

      {/* Status Message */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Tabs for different configurations */}
      <Tabs defaultValue="analysis" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analysis">諮詢分析設定</TabsTrigger>
          <TabsTrigger value="chat">聊天助手設定</TabsTrigger>
        </TabsList>

        {/* 諮詢分析設定 */}
        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>分析模型參數設定</CardTitle>
              <CardDescription>
                配置 OpenAI API 的模型和參數，影響諮詢分析的速度、成本和品質
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* AI 模型選擇 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">AI 模型</label>
                <select
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={formData.ai_model}
                  onChange={(e) => setFormData({ ...formData, ai_model: e.target.value })}
                >
                  <option value="gpt-5">gpt-5 (最新旗艦版)</option>
                  <option value="gpt-5-mini">gpt-5-mini (輕量快速)</option>
                  <option value="gpt-5-nano">gpt-5-nano (超輕量)</option>
                  <option value="gpt-4.1">gpt-4.1 (升級版)</option>
                  <option value="gpt-4.1-mini">gpt-4.1-mini (輕量版)</option>
                  <option value="gpt-4.1-nano">gpt-4.1-nano (超輕量版)</option>
                  <option value="o3">o3 (推理模型)</option>
                  <option value="o4-mini">o4-mini (推理輕量版)</option>
                  <option value="gpt-4o">gpt-4o (推薦 - 平衡)</option>
                  <option value="gpt-4-turbo">gpt-4-turbo (快速)</option>
                  <option value="gpt-4">gpt-4 (標準)</option>
                  <option value="gpt-3.5-turbo">gpt-3.5-turbo (經濟)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  不同模型的回應品質、速度和成本各異
                </p>
              </div>

              {/* Temperature */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Temperature (創意度)
                  </label>
                  <Badge variant="outline">{formData.temperature}</Badge>
                </div>
                <Slider
                  value={[formData.temperature]}
                  onValueChange={(values) => setFormData({ ...formData, temperature: values[0] })}
                  min={0}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 = 精確、一致</span>
                  <span>1 = 創意、多樣</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  推薦值：0.7 (兼顧準確性和多樣性)
                </p>
              </div>

              {/* Max Tokens */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Max Tokens (輸出長度)</label>
                  <Badge variant="outline">{formData.max_tokens} tokens</Badge>
                </div>
                <input
                  type="number"
                  min={1000}
                  max={8000}
                  step={100}
                  value={formData.max_tokens}
                  onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                  className="w-full border rounded-md px-3 py-2 bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  範圍：1000-8000 tokens，推薦值：4000 (約 3000 字)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Prompt 編輯器 */}
          <Card>
            <CardHeader>
              <CardTitle>AI 分析 Prompt 設定</CardTitle>
              <CardDescription>
                完整的 System Prompt，定義 AI 分析的角色、任務和輸出格式
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={formData.analysis_prompt}
                onChange={(e) => setFormData({ ...formData, analysis_prompt: e.target.value })}
                className="font-mono text-sm min-h-[400px]"
                placeholder="輸入 AI 分析的完整 prompt..."
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Prompt 長度: {formData.analysis_prompt.length} 字元</span>
                <span>約 {Math.ceil(formData.analysis_prompt.length / 4)} tokens</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 聊天助手設定 */}
        <TabsContent value="chat" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>聊天助手模型參數設定</CardTitle>
              <CardDescription>
                配置諮詢詳情頁面中 AI 聊天助手的模型和參數
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* AI 模型選擇 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">AI 模型</label>
                <select
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={formData.chat_ai_model}
                  onChange={(e) => setFormData({ ...formData, chat_ai_model: e.target.value })}
                >
                  <option value="gpt-5">gpt-5 (最新旗艦版)</option>
                  <option value="gpt-5-mini">gpt-5-mini (輕量快速)</option>
                  <option value="gpt-5-nano">gpt-5-nano (超輕量)</option>
                  <option value="gpt-4.1">gpt-4.1 (升級版)</option>
                  <option value="gpt-4.1-mini">gpt-4.1-mini (輕量版)</option>
                  <option value="gpt-4.1-nano">gpt-4.1-nano (超輕量版)</option>
                  <option value="o3">o3 (推理模型)</option>
                  <option value="o4-mini">o4-mini (推理輕量版)</option>
                  <option value="gpt-4o">gpt-4o (推薦 - 平衡)</option>
                  <option value="gpt-4-turbo">gpt-4-turbo (快速)</option>
                  <option value="gpt-4">gpt-4 (標準)</option>
                  <option value="gpt-3.5-turbo">gpt-3.5-turbo (經濟)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  聊天助手的即時問答模型
                </p>
              </div>

              {/* Temperature */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Temperature (創意度)
                  </label>
                  <Badge variant="outline">{formData.chat_temperature}</Badge>
                </div>
                <Slider
                  value={[formData.chat_temperature]}
                  onValueChange={(values) => setFormData({ ...formData, chat_temperature: values[0] })}
                  min={0}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 = 精確、一致</span>
                  <span>1 = 創意、多樣</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  推薦值：0.7 (兼顧準確性和多樣性)
                </p>
              </div>

              {/* Max Tokens */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Max Tokens (單次回應長度)</label>
                  <Badge variant="outline">{formData.chat_max_tokens} tokens</Badge>
                </div>
                <input
                  type="number"
                  min={500}
                  max={4000}
                  step={100}
                  value={formData.chat_max_tokens}
                  onChange={(e) => setFormData({ ...formData, chat_max_tokens: parseInt(e.target.value) })}
                  className="w-full border rounded-md px-3 py-2 bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  範圍：500-4000 tokens，推薦值：2000 (約 1500 字)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Chat Prompt 編輯器 */}
          <Card>
            <CardHeader>
              <CardTitle>聊天助手 Prompt 設定</CardTitle>
              <CardDescription>
                定義聊天助手的角色、回應風格和行為準則
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={formData.chat_system_prompt}
                onChange={(e) => setFormData({ ...formData, chat_system_prompt: e.target.value })}
                className="font-mono text-sm min-h-[300px]"
                placeholder="輸入聊天助手的 system prompt..."
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Prompt 長度: {formData.chat_system_prompt.length} 字元</span>
                <span>約 {Math.ceil(formData.chat_system_prompt.length / 4)} tokens</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 操作按鈕 */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              儲存中...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              儲存配置
            </>
          )}
        </Button>
        <Button onClick={handleReset} variant="outline" disabled={saving}>
          <RotateCcw className="w-4 h-4 mr-2" />
          重置為預設值
        </Button>
      </div>

      {/* 最後更新資訊 */}
      {config && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm space-y-1 text-muted-foreground">
              <p>
                <strong>最後更新時間：</strong>
                {new Date(config.updated_at).toLocaleString('zh-TW', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </p>
              <p>
                <strong>更新者：</strong>
                {config.updated_by}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ConsultationAnalysisConfig() {
  return (
    <DashboardLayout sidebarSections={sidebarConfig} title="諮詢分析 AI 設定">
      <ConsultationAnalysisConfigContent />
    </DashboardLayout>
  );
}

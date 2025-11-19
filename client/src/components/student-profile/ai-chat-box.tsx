/**
 * AI Chat Box Component
 *
 * 提供 AI 對話功能，包含：
 * - 預設問題快速按鈕
 * - 自訂問題輸入
 * - 對話歷史顯示
 * - 快取指示器
 * - 成本追蹤
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Sparkles, DollarSign, Zap } from 'lucide-react';
import {
  useAskPresetQuestion,
  useAskCustomQuestion,
  useConversations,
  usePresetQuestions,
} from '@/hooks/use-student-profile';

interface AIChatBoxProps {
  studentEmail: string;
  studentName: string;
}

export function AIChatBox({ studentEmail, studentName }: AIChatBoxProps) {
  const [customQuestion, setCustomQuestion] = useState('');

  // Hooks
  const { data: presetQuestions } = usePresetQuestions();
  const { data: conversations, isLoading: loadingConversations } = useConversations(studentEmail, 20);
  const askPresetMutation = useAskPresetQuestion(studentEmail);
  const askCustomMutation = useAskCustomQuestion(studentEmail);

  // 預設問題按鈕資料
  const presetButtons = [
    { key: 'painPointAnalysis', label: '學員痛點分析', icon: '🎯' },
    { key: 'conversionStrategy', label: '推課話術建議', icon: '💡' },
    { key: 'conversionProbability', label: '成交機率評估', icon: '📊' },
    { key: 'executionEvaluation', label: '執行情況評估', icon: '✅' },
    { key: 'nextSteps', label: '下次重點方向', icon: '🚀' },
  ];

  // 處理預設問題點擊
  const handlePresetQuestion = (questionKey: string) => {
    askPresetMutation.mutate(questionKey);
  };

  // 處理自訂問題提交
  const handleCustomQuestion = () => {
    if (!customQuestion.trim()) return;

    askCustomMutation.mutate(
      customQuestion,
      {
        onSuccess: () => {
          setCustomQuestion('');
        },
      }
    );
  };

  // 計算統計資訊
  const stats = conversations?.reduce(
    (acc, conv) => ({
      totalTokens: acc.totalTokens + (conv.tokens_used || 0),
      totalCost: acc.totalCost + (typeof conv.api_cost_usd === 'number' ? conv.api_cost_usd : parseFloat(String(conv.api_cost_usd || '0'))),
      cachedCount: acc.cachedCount + (conv.is_cached ? 1 : 0),
    }),
    { totalTokens: 0, totalCost: 0, cachedCount: 0 }
  ) || { totalTokens: 0, totalCost: 0, cachedCount: 0 };

  const cacheRate = conversations && conversations.length > 0
    ? Math.round((stats.cachedCount / conversations.length) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* 預設問題快速按鈕 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            快速提問
          </CardTitle>
          <CardDescription>點擊以下按鈕快速詢問常見問題</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {presetButtons.map((btn) => (
              <Button
                key={btn.key}
                variant="outline"
                size="sm"
                onClick={() => handlePresetQuestion(btn.key)}
                disabled={askPresetMutation.isPending}
                className="hover:bg-purple-50"
              >
                <span className="mr-1">{btn.icon}</span>
                {btn.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 對話歷史 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            💬 對話歷史
          </CardTitle>
          <CardDescription>
            與 AI 的對話記錄（最近 20 筆）
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingConversations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">載入對話記錄...</span>
            </div>
          ) : conversations && conversations.length > 0 ? (
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition-colors"
                >
                  {/* 問題 */}
                  <div className="flex items-start gap-2">
                    <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                      <span className="text-sm">👤</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-700">問：</span>
                        {conv.question_type === 'preset' && (
                          <Badge variant="outline" className="text-xs">
                            預設問題
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-800">{conv.question}</p>
                    </div>
                  </div>

                  {/* 答案 */}
                  <div className="flex items-start gap-2 ml-6">
                    <div className="bg-purple-100 rounded-full p-2 flex-shrink-0">
                      <span className="text-sm">🤖</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-700">答：</span>
                        {conv.is_cached && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            快取
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {conv.answer}
                      </p>
                    </div>
                  </div>

                  {/* 元資訊 */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 ml-6 pl-10">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      ${conv.api_cost_usd ? (typeof conv.api_cost_usd === 'number' ? conv.api_cost_usd : parseFloat(String(conv.api_cost_usd))).toFixed(4) : '0.0000'}
                    </span>
                    <span>{conv.tokens_used || 0} tokens</span>
                    <span>{conv.response_time_ms ? `${conv.response_time_ms}ms` : '-'}</span>
                    <span className="text-gray-400">
                      {new Date(conv.created_at).toLocaleString('zh-TW', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>尚無對話記錄</p>
              <p className="text-sm mt-2">點擊上方「快速提問」按鈕開始詢問</p>
            </div>
          )}

          {/* Loading indicator for new questions */}
          {(askPresetMutation.isPending || askCustomMutation.isPending) && (
            <div className="border border-purple-200 rounded-lg p-4 bg-purple-50 mt-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                <span className="text-sm text-purple-700">AI 正在思考中...</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 自訂問題輸入 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            ✍️ 自訂問題
          </CardTitle>
          <CardDescription>
            詢問關於 {studentName} 的任何問題
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="輸入您的問題..."
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCustomQuestion();
                }
              }}
              disabled={askCustomMutation.isPending}
              className="flex-1"
            />
            <Button
              onClick={handleCustomQuestion}
              disabled={!customQuestion.trim() || askCustomMutation.isPending}
              className="flex items-center gap-2"
            >
              {askCustomMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              發送
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            提示：按 Enter 發送，Shift + Enter 換行
          </p>
        </CardContent>
      </Card>

      {/* 對話統計 */}
      {conversations && conversations.length > 0 && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-gray-600">總對話數：</span>
                  <span className="font-semibold text-gray-800 ml-1">
                    {conversations.length}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">總 Tokens：</span>
                  <span className="font-semibold text-gray-800 ml-1">
                    {stats.totalTokens.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">總費用：</span>
                  <span className="font-semibold text-gray-800 ml-1">
                    ${stats.totalCost.toFixed(4)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">快取率：</span>
                  <span className="font-semibold text-green-600 ml-1">
                    {cacheRate}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

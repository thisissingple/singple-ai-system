/**
 * Smart AI Chat - AI 智能學習對話組件
 *
 * 功能：
 * 1. 自然語言問答
 * 2. AI 自動學習使用者確認的問題模式
 * 3. 下次遇到類似問題直接回答（無需再確認）
 * 4. 顯示學習狀態（新問題 vs 已學習）
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Send, Sparkles, CheckCircle2, Brain, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  learned?: boolean;
  usageCount?: number;
}

interface ConfirmationData {
  question: string;
  analysis: {
    intent: string;
    explanation: string;
    confidence: number;
  };
  answer: string;
}

export function SmartAIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null);

  // 範例問題
  const exampleQuestions = [
    'Vicky 老師本月升高階的學生有哪些？',
    '這週有幾位學生上課？',
    '哪些學生有買課？',
    '本月成交金額是多少？'
  ];

  /**
   * 發送問題到後端
   */
  const handleSendQuestion = async (question: string) => {
    if (!question.trim()) return;

    // 添加使用者訊息
    const userMessage: Message = {
      role: 'user',
      content: question
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/smart-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '查詢失敗');
      }

      // 檢查是否為已學習的問題
      if (data.learned) {
        // 直接顯示答案（已學習，無需確認）
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.answer,
          learned: true,
          usageCount: data.usageCount
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // 新問題 - 需要確認
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.answer,
          learned: false
        };
        setMessages(prev => [...prev, assistantMessage]);

        // 顯示確認對話框
        if (data.needConfirmation && data.analysis) {
          setConfirmationData({
            question,
            analysis: data.analysis,
            answer: data.answer
          });
          setShowConfirmation(true);
        }
      }
    } catch (error) {
      console.error('AI 查詢錯誤:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ 查詢失敗：${error instanceof Error ? error.message : '未知錯誤'}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 確認 AI 的理解並儲存學習
   */
  const handleConfirmLearning = async (confirmed: boolean) => {
    if (!confirmationData) return;

    if (confirmed) {
      try {
        const response = await fetch('/api/ai/confirm-learning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: confirmationData.question,
            analysis: confirmationData.analysis,
            confirmed: true
          })
        });

        const data = await response.json();

        if (data.success) {
          // 顯示學習成功訊息
          const successMessage: Message = {
            role: 'assistant',
            content: '✅ **已記住！** 下次遇到類似問題就不用再確認了 🎉'
          };
          setMessages(prev => [...prev, successMessage]);
        }
      } catch (error) {
        console.error('儲存學習失敗:', error);
      }
    }

    setShowConfirmation(false);
    setConfirmationData(null);
  };

  /**
   * 使用範例問題
   */
  const handleExampleClick = (example: string) => {
    setInput(example);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* 訊息列表 */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">AI 智能助手</p>
            <p className="text-sm mt-2">問我任何問題，我會記住並學習你的需求</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <Card
                className={`max-w-[80%] ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-800'
                }`}
              >
                <CardContent className="p-3">
                  {/* 已學習標記 */}
                  {msg.role === 'assistant' && msg.learned && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>已學習（使用 {msg.usageCount} 次）</span>
                    </div>
                  )}

                  {/* 訊息內容 */}
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        )}

        {/* 載入中 */}
        {loading && (
          <div className="flex justify-start">
            <Card className="bg-white dark:bg-gray-800">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI 思考中...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* 範例問題 */}
      {messages.length === 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">試試這些問題：</p>
          <div className="grid grid-cols-2 gap-2">
            {exampleQuestions.map((example, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => handleExampleClick(example)}
                className="text-left justify-start h-auto py-2"
              >
                <Sparkles className="w-3 h-3 mr-2 flex-shrink-0" />
                <span className="text-xs">{example}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* 輸入框 */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendQuestion(input);
            }
          }}
          placeholder="問我任何問題..."
          disabled={loading}
          className="flex-1"
        />
        <Button
          onClick={() => handleSendQuestion(input)}
          disabled={loading || !input.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* AI 理解確認對話框 */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-500" />
              確認 AI 的理解
            </DialogTitle>
            <DialogDescription>
              這是我第一次遇到這個問題，請確認我的理解是否正確
            </DialogDescription>
          </DialogHeader>

          {confirmationData && (
            <div className="space-y-4">
              {/* 問題 */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  你的問題：
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  "{confirmationData.question}"
                </p>
              </div>

              {/* AI 的理解 */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  我的理解：
                </p>
                <Alert className="mt-2">
                  <AlertDescription>
                    <p className="font-medium">{confirmationData.analysis.intent}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {confirmationData.analysis.explanation}
                    </p>
                  </AlertDescription>
                </Alert>
              </div>

              {/* 信心度 */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  信心度：
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${confirmationData.analysis.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {Math.round(confirmationData.analysis.confidence * 100)}%
                  </span>
                </div>
              </div>

              {/* 提示 */}
              <Alert>
                <AlertDescription className="text-xs">
                  💡 如果我的理解正確，點擊「正確，記住」後，下次遇到類似問題我就會直接回答，不用再確認了！
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleConfirmLearning(false)}
            >
              理解錯誤
            </Button>
            <Button
              onClick={() => handleConfirmLearning(true)}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              正確，記住
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

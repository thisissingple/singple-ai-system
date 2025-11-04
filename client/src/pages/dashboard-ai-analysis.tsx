/**
 * AI 智能分析中心
 * CEO/COO 決策導向的數據分析頁面
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, TrendingUp, Users, DollarSign, AlertCircle, BarChart3, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  answer: string;
  data?: any;
  chartData?: any;
  confidence: number;
}

export default function DashboardAIAnalysis() {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { toast } = useToast();

  const sendQuestion = async () => {
    if (!question.trim()) {
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: question.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage.content,
          history: messages,
        }),
      });

      if (!response.ok) {
        throw new Error('AI 對話失敗');
      }

      const result = await response.json();
      const data: ChatResponse = result.data;

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.answer,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('AI Chat error:', error);
      toast({
        title: '❌ AI 對話失敗',
        description: error.message || '請稍後再試',
        variant: 'destructive',
      });

      // 移除使用者訊息（因為失敗了）
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuestion();
    }
  };

  const quickQuestions = [
    '本週哪個老師成交額最高？',
    '本月營收總計多少？',
    '哪位諮詢師成交率最高？',
    '目前有多少學員？',
    '本週體驗課轉換率是多少？',
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">🤖 AI 智能分析中心</h1>
          <p className="text-muted-foreground mt-1">自然語言問答 + 即時數據洞察</p>
        </div>
      </div>

      {/* AI 對話框 */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            AI 數據助理
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 對話歷史 */}
          <div className="min-h-[300px] max-h-[500px] overflow-y-auto border rounded-lg p-4 space-y-4 bg-muted/20">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">開始提問吧！</p>
                <p className="text-sm mt-2">例如：「本週哪個老師成交額最高？」</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-white dark:bg-gray-800 border'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 border rounded-lg p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* 快速問題 */}
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => setQuestion(q)}
                disabled={isLoading}
              >
                {q}
              </Button>
            ))}
          </div>

          {/* 輸入框 */}
          <div className="flex gap-2">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="輸入問題... (Shift + Enter 換行)"
              className="min-h-[60px]"
              disabled={isLoading}
            />
            <Button onClick={sendQuestion} disabled={isLoading || !question.trim()} size="lg">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 6 個核心卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. TOP 3 教師成交排行 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-blue-500" />
              TOP 3 教師成交排行
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">載入中...</p>
          </CardContent>
        </Card>

        {/* 2. TOP 3 諮詢師成交排行 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-green-500" />
              TOP 3 諮詢師成交排行
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">載入中...</p>
          </CardContent>
        </Card>

        {/* 3. 本月營收總覽 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-yellow-500" />
              本月營收總覽
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">載入中...</p>
          </CardContent>
        </Card>

        {/* 4. 待追蹤學員清單 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              待追蹤學員清單
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">載入中...</p>
          </CardContent>
        </Card>

        {/* 5. 資料品質警告 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-red-500" />
              資料品質警告
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">載入中...</p>
          </CardContent>
        </Card>

        {/* 6. 營收趨勢圖 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              營收趨勢圖
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">載入中...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

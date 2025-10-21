/**
 * AI Chat 精簡對話框組件
 * 參考 OpenAI/Claude 的對話框樣式
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatCompactProps {
  className?: string;
}

export function AIChatCompact({ className = '' }: AIChatCompactProps) {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { toast } = useToast();

  const sendQuestion = async () => {
    if (!question.trim()) return;

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMessage.content,
          history: messages,
        }),
      });

      if (!response.ok) throw new Error('AI 對話失敗');

      const result = await response.json();
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: result.data.answer,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('AI Chat error:', error);
      toast({
        title: '❌ AI 對話失敗',
        description: error.message || '請稍後再試',
        variant: 'destructive',
      });
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
  ];

  return (
    <div className={`flex flex-col ${className}`}>
      {/* 對話歷史 */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">開始提問吧！</p>
            <p className="text-xs mt-1">例如：「本週哪個老師成交額最高？」</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
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
            <div className="bg-muted rounded-lg px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* 快速問題 */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {quickQuestions.map((q, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              onClick={() => setQuestion(q)}
              disabled={isLoading}
              className="text-xs"
            >
              {q}
            </Button>
          ))}
        </div>
      )}

      {/* 輸入框 */}
      <div className="flex gap-2">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="輸入問題... (Shift + Enter 換行)"
          className="min-h-[50px] resize-none"
          disabled={isLoading}
        />
        <Button onClick={sendQuestion} disabled={isLoading || !question.trim()} size="icon">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

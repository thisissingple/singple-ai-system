import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Bot, User, BookmarkPlus, BookmarkCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Conversation {
  id: string;
  question: string;
  answer: string;
  isCached?: boolean;
  created_at: string;
  isSaved?: boolean; // Track if saved to KB
}

interface PresetQuestion {
  key: string;
  label: string;
  description: string;
}

interface AIChatBoxProps {
  studentEmail: string;
  studentName: string;
  totalClasses?: number;
  totalConsultations?: number;
}

export function AIChatBox({ studentEmail, studentName, totalClasses = 0, totalConsultations = 0 }: AIChatBoxProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [presetQuestions, setPresetQuestions] = useState<Record<string, PresetQuestion>>({});
  const [customQuestion, setCustomQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  // Load preset questions on mount
  useEffect(() => {
    loadPresetQuestions();
    loadConversationHistory();
  }, [studentEmail]);

  // Auto-scroll to latest message
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, isLoading]);

  const loadPresetQuestions = async () => {
    try {
      const response = await fetch('/api/teaching-quality/preset-questions');
      const data = await response.json();
      if (data.success) {
        setPresetQuestions(data.data);
      }
    } catch (error) {
      console.error('Failed to load preset questions:', error);
    }
  };

  const loadConversationHistory = async () => {
    try {
      const response = await fetch(`/api/teaching-quality/student/${encodeURIComponent(studentEmail)}/conversations?limit=10`);
      const data = await response.json();
      if (data.success) {
        // Reverse to show oldest first (top to bottom chronological order)
        setConversations(data.data.reverse());
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const askPresetQuestion = async (questionKey: string) => {
    const preset = presetQuestions[questionKey];
    if (!preset || isLoading) return;

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/teaching-quality/student/${encodeURIComponent(studentEmail)}/ask-preset`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionType: questionKey })
        }
      );

      const data = await response.json();

      if (data.success) {
        const newConv: Conversation = {
          id: data.data.conversationId,
          question: preset.label,
          answer: data.data.answer,
          isCached: data.data.isCached,
          created_at: new Date().toISOString()
        };
        // Add to end (top to bottom chronological order)
        setConversations(prev => [...prev, newConv]);
      } else {
        alert('查詢失敗：' + data.error);
      }
    } catch (error: any) {
      console.error('Failed to ask preset question:', error);
      alert('查詢失敗：' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const askCustomQuestion = async () => {
    if (!customQuestion.trim() || isLoading) return;

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/teaching-quality/student/${encodeURIComponent(studentEmail)}/ask-custom`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: customQuestion })
        }
      );

      const data = await response.json();

      if (data.success) {
        const newConv: Conversation = {
          id: data.data.conversationId,
          question: customQuestion,
          answer: data.data.answer,
          created_at: new Date().toISOString()
        };
        // Add to end (top to bottom chronological order)
        setConversations(prev => [...prev, newConv]);
        setCustomQuestion('');
      } else {
        alert('查詢失敗：' + data.error);
      }
    } catch (error: any) {
      console.error('Failed to ask custom question:', error);
      alert('查詢失敗：' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToKnowledgeBase = async (conv: Conversation) => {
    try {
      const response = await fetch(
        `/api/teaching-quality/student/${encodeURIComponent(studentEmail)}/save-insight`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: conv.id,
            question: conv.question,
            answer: conv.answer
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        // Mark as saved
        setConversations(prev =>
          prev.map(c => c.id === conv.id ? { ...c, isSaved: true } : c)
        );
      } else {
        alert('儲存失敗：' + data.error);
      }
    } catch (error: any) {
      console.error('Failed to save insight:', error);
      alert('儲存失敗：' + error.message);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI 策略助手
        </CardTitle>
        <CardDescription>
          已整合 {studentName} 的 {totalClasses} 堂上課記錄
          {totalConsultations > 0 && ` + ${totalConsultations} 次諮詢記錄`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Preset Questions */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">快速查詢</p>
          <div className="flex flex-wrap gap-2">
            {Object.values(presetQuestions).map((preset) => (
              <Button
                key={preset.key}
                variant="outline"
                size="sm"
                onClick={() => askPresetQuestion(preset.key)}
                disabled={isLoading}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Conversation History */}
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>點擊上方按鈕開始查詢</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div key={conv.id} className="space-y-3">
                {/* Question */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 bg-muted rounded-lg p-3">
                    <p className="text-sm font-medium">{conv.question}</p>
                  </div>
                </div>

                {/* Answer */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{conv.answer}</ReactMarkdown>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        {conv.isCached && (
                          <Badge variant="secondary">
                            快取回答（24 小時內有效）
                          </Badge>
                        )}
                        {conv.isSaved ? (
                          <Badge variant="default" className="bg-blue-600">
                            <BookmarkCheck className="h-3 w-3 mr-1" />
                            已儲存到知識庫
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => saveToKnowledgeBase(conv)}
                            className="text-xs"
                          >
                            <BookmarkPlus className="h-3 w-3 mr-1" />
                            儲存到知識庫
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <Loader2 className="h-4 w-4 text-green-600 animate-spin" />
              </div>
              <div className="flex-1 bg-green-50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">AI 思考中...</p>
              </div>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={conversationEndRef} />
        </div>

        {/* Custom Question Input */}
        <div className="space-y-2 pt-4 border-t">
          <p className="text-sm font-medium text-muted-foreground">自訂問題</p>
          <div className="flex gap-2">
            <Textarea
              placeholder="向 AI 提問關於這個學員的任何問題..."
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  askCustomQuestion();
                }
              }}
              rows={3}
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={askCustomQuestion}
            disabled={!customQuestion.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                查詢中...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                發送問題
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

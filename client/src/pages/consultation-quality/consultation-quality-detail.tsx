/**
 * Consultation Quality Detail Page - 3-Section Layout
 * Section 1: AI Analysis (with Save to KB button)
 * Section 2: Transcript (collapsible)
 * Section 3: AI Chat Interface (for Q&A)
 */

import { useState, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Bot,
  MessageSquare,
  Trash2,
  Save,
  Loader2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function ConsultationQualityDetailContent() {
  const { eodId } = useParams<{ eodId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // State management
  const [deleting, setDeleting] = useState(false);
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messageIdCounter = useRef(0);

  // Fetch consultation data
  const { data, isLoading: dataLoading, error } = useQuery<{ success: boolean; data: any }>({
    queryKey: ['consultation-quality-detail', eodId],
    queryFn: async () => {
      const response = await fetch(`/api/consultation-quality/${eodId}`);
      if (!response.ok) throw new Error('Failed to fetch consultation detail');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const record = data?.data;

  // Handle sending chat message
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${messageIdCounter.current++}`,
      role: 'user',
      content: inputMessage,
    };

    const currentInput = inputMessage;
    setInputMessage('');
    setChatMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/consultation-quality/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, userMessage].map(m => ({ role: m.role, content: m.content })),
          eodId,
          consultationTranscript: record?.consultation_transcript,
          aiAnalysis: record?.raw_markdown_output,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      // Read the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponseContent = '';

      const aiMessage: ChatMessage = {
        id: `assistant-${messageIdCounter.current++}`,
        role: 'assistant',
        content: '',
      };

      setChatMessages(prev => [...prev, aiMessage]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          aiResponseContent += chunk;

          // Update the last message (AI response) with accumulated content
          setChatMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              ...newMessages[newMessages.length - 1],
              content: aiResponseContent,
            };
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: '錯誤',
        description: '無法獲取 AI 回應',
        variant: 'destructive',
      });
      // Remove user message if error
      setChatMessages(prev => prev.filter(m => m.id !== userMessage.id));
      setInputMessage(currentInput); // Restore input
    } finally {
      setIsLoading(false);
    }
  };

  // Save to knowledge base mutation
  const saveToKBMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/consultation-quality/${eodId}/save-to-kb`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('儲存失敗');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '✅ 成功',
        description: '已儲存至知識庫',
      });
    },
    onError: (error: any) => {
      toast({
        title: '❌ 失敗',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle delete analysis
  const handleDelete = async () => {
    if (!confirm('確定要刪除此 AI 分析嗎？刪除後可重新分析。')) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/consultation-quality/${eodId}/analysis`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '刪除失敗');
      }

      alert('AI 分析已刪除');
      navigate('/reports/consultants');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setDeleting(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">載入中...</div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-destructive">載入資料時發生錯誤</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/reports/consultants')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
            <div>
              <h1 className="text-xl font-semibold">諮詢 AI 分析</h1>
              <p className="text-sm text-muted-foreground">
                {record.student_name} | {record.closer_name}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="h-4 w-4 mr-2" />
            {deleting ? '刪除中' : '刪除'}
          </Button>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Section 1: AI Analysis Result */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-600" />
                AI 分析結果
              </CardTitle>
              <Button
                onClick={() => saveToKBMutation.mutate()}
                disabled={saveToKBMutation.isPending}
                size="sm"
                variant="outline"
              >
                {saveToKBMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />儲存中</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" />存入知識庫</>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {record?.raw_markdown_output ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{record.raw_markdown_output}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-muted-foreground">無分析結果</p>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Transcript */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-gray-600" />
                諮詢逐字稿
              </CardTitle>
            </CardHeader>
            <CardContent>
              <button
                onClick={() => setTranscriptExpanded(!transcriptExpanded)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium mb-3"
              >
                {transcriptExpanded ? '▼ 隱藏逐字稿' : '▶ 顯示逐字稿'}
              </button>
              {transcriptExpanded && record?.consultation_transcript && (
                <div className="bg-gray-50 p-4 rounded-lg max-h-[500px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                    {record.consultation_transcript}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: AI Chat Interface - Clean & Minimal Design */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">AI 諮詢助手</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    詢問關於這次諮詢的任何問題
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              {/* Messages Area */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 min-h-[400px] max-h-[500px] overflow-y-auto">
                {chatMessages.length === 0 && (
                  <div className="flex items-center gap-3 text-gray-500">
                    <Bot className="h-5 w-5 flex-shrink-0" />
                    <p className="text-sm">請輸入你的問題，例如：「這位學員的核心痛點是什麼？」</p>
                  </div>
                )}

                <div className="space-y-4">
                  {chatMessages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                      {message.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-4 w-4 text-blue-600" />
                        </div>
                      )}
                      <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                        <div
                          className={`inline-block rounded-lg px-4 py-2.5 max-w-[85%] ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-200 text-gray-900'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                      {message.role === 'user' && (
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-medium">
                          你
                        </div>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="inline-block rounded-lg px-4 py-2.5 bg-white border border-gray-200">
                          <div className="flex gap-1.5">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Input Area */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="輸入你的問題..."
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && inputMessage.trim() && !isLoading) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <span className="text-sm font-medium">送出</span>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

export default function ConsultationQualityDetailPage() {
  return <ConsultationQualityDetailContent />;
}

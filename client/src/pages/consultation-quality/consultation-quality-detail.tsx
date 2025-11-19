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
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Bot,
  MessageSquare,
  Trash2,
  Loader2,
  FileText,
  Save,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/hooks/use-toast';
import { getGrade, getGradeColor } from '@/lib/calculate-overall-score';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tokensUsed?: number;
  apiCostUsd?: number;
  saved?: boolean; // 是否已儲存到知識庫
  saving?: boolean; // 是否正在儲存中
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
      let metadata: { tokensUsed?: number; apiCostUsd?: number; model?: string } = {};

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

          // Check if metadata is included (after <<<METADATA>>> delimiter)
          if (aiResponseContent.includes('\n<<<METADATA>>>\n')) {
            const parts = aiResponseContent.split('\n<<<METADATA>>>\n');
            const textContent = parts[0];
            const metadataJson = parts[1];

            try {
              metadata = JSON.parse(metadataJson);
            } catch (e) {
              console.error('Failed to parse metadata:', e);
            }

            // Update the message with text content only (exclude metadata)
            setChatMessages(prev => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                ...newMessages[newMessages.length - 1],
                content: textContent,
                tokensUsed: metadata.tokensUsed,
                apiCostUsd: metadata.apiCostUsd,
              };
              return newMessages;
            });
          } else {
            // Update the message with accumulated content (streaming in progress)
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


  // Handle saving individual conversation to KB
  const handleSaveConversation = async (messageId: string) => {
    const messageIndex = chatMessages.findIndex(m => m.id === messageId);
    if (messageIndex === -1 || messageIndex === 0) return; // Need at least question + answer

    const userMessage = chatMessages[messageIndex - 1];
    const aiMessage = chatMessages[messageIndex];

    if (userMessage.role !== 'user' || aiMessage.role !== 'assistant') return;

    // Mark as saving
    setChatMessages(prev =>
      prev.map(m =>
        m.id === messageId ? { ...m, saving: true } : m
      )
    );

    try {
      const response = await fetch(`/api/consultation-quality/chat/save-conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eodId,
          question: userMessage.content,
          answer: aiMessage.content,
          tokensUsed: aiMessage.tokensUsed,
          apiCostUsd: aiMessage.apiCostUsd,
        }),
      });

      if (!response.ok) throw new Error('儲存失敗');

      toast({
        title: '✅ 已儲存',
        description: '對話已存入知識庫',
      });

      // Mark as saved
      setChatMessages(prev =>
        prev.map(m =>
          m.id === messageId ? { ...m, saved: true, saving: false } : m
        )
      );
    } catch (error: any) {
      toast({
        title: '❌ 失敗',
        description: error.message,
        variant: 'destructive',
      });

      // Reset saving state
      setChatMessages(prev =>
        prev.map(m =>
          m.id === messageId ? { ...m, saving: false } : m
        )
      );
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

          {/* Overall Score Card */}
          {record?.overall_rating && (
            <Card className="border-2 border-primary/20 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">🏆 諮詢品質戰績報告</CardTitle>
                    <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <span>👤 學員：{record.student_name}</span>
                      <span>|</span>
                      <span>👨‍💼 諮詢師：{record.closer_name}</span>
                      <span>|</span>
                      <span>📅 {new Date(record.consultation_date || record.analyzed_at).toLocaleDateString('zh-TW')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">整體評分</div>
                      <div className="text-4xl font-bold">{Math.round(record.overall_rating * 10)}/100</div>
                    </div>
                    <Badge className={cn("h-16 px-6 text-2xl font-bold", getGradeColor(getGrade(record.overall_rating * 10)))}>
                      {getGrade(record.overall_rating * 10)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Four Dimension Score Cards */}
          {(record?.rapport_building_score || record?.needs_analysis_score ||
            record?.objection_handling_score || record?.closing_technique_score) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Rapport Building */}
              {record?.rapport_building_score && (
                <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      🤝 建立關係
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-blue-600">{record.rapport_building_score}/10</div>
                    {record.rapport_building_comment && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {record.rapport_building_comment}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Needs Analysis */}
              {record?.needs_analysis_score && (
                <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      🔍 需求分析
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-green-600">{record.needs_analysis_score}/10</div>
                    {record.needs_analysis_comment && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {record.needs_analysis_comment}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Objection Handling */}
              {record?.objection_handling_score && (
                <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-white hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-700">
                      🛡️ 異議處理
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-yellow-600">{record.objection_handling_score}/10</div>
                    {record.objection_handling_comment && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {record.objection_handling_comment}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Closing Technique */}
              {record?.closing_technique_score && (
                <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-700">
                      🎯 成交技巧
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-purple-600">{record.closing_technique_score}/10</div>
                    {record.closing_technique_comment && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {record.closing_technique_comment}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Status and Actions */}
          {record?.analyzed_at && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    <Badge className="bg-green-100 text-green-700">✅ 已分析</Badge>
                    <span className="text-muted-foreground">
                      📊 v{record.analysis_version || '1.0'}
                    </span>
                    <span className="text-muted-foreground">
                      🕐 {new Date(record.analyzed_at).toLocaleString('zh-TW')}
                    </span>
                    {record.strengths && (
                      <span className="text-muted-foreground">
                        ✨ {Array.isArray(record.strengths) ? record.strengths.length : 0} 條亮點
                      </span>
                    )}
                    {record.improvements && (
                      <span className="text-muted-foreground">
                        📝 {Array.isArray(record.improvements) ? record.improvements.length : 0} 條改進建議
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-md border border-green-200">
                      ✓ 已自動存入
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 1: AI Analysis Result */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-600" />
                AI 分析結果
              </CardTitle>
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

                        {/* AI response metadata: tokens, cost, and save button */}
                        {message.role === 'assistant' && (
                          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                            {message.tokensUsed && (
                              <span>🎯 {message.tokensUsed} tokens</span>
                            )}
                            {message.apiCostUsd && (
                              <span>💰 ${message.apiCostUsd.toFixed(4)}</span>
                            )}
                            <button
                              onClick={() => handleSaveConversation(message.id)}
                              disabled={message.saved || message.saving}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                message.saved
                                  ? 'bg-green-100 text-green-700 cursor-default'
                                  : message.saving
                                  ? 'bg-gray-100 text-gray-400 cursor-wait'
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              }`}
                            >
                              {message.saving ? '儲存中...' : message.saved ? '✓ 已存入' : '存入知識庫'}
                            </button>
                          </div>
                        )}
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
              <div className="space-y-3">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <textarea
                      placeholder="輸入你的問題... (⌘+Enter 或 Ctrl+Enter 送出)"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        // Command+Enter (Mac) or Ctrl+Enter (Windows/Linux) to send
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && inputMessage.trim() && !isLoading) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={isLoading}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <span className="text-sm font-medium">送出</span>
                    )}
                  </button>
                </div>

                {/* Total Statistics */}
                {chatMessages.length > 0 && (() => {
                  const totalTokens = chatMessages
                    .filter(m => m.role === 'assistant' && m.tokensUsed)
                    .reduce((sum, m) => sum + (m.tokensUsed || 0), 0);
                  const totalCost = chatMessages
                    .filter(m => m.role === 'assistant' && m.apiCostUsd)
                    .reduce((sum, m) => sum + (m.apiCostUsd || 0), 0);

                  return (
                    <div className="border-t pt-3 mt-3">
                      <div className="bg-blue-50 rounded-lg px-4 py-3">
                        <div className="text-sm font-medium text-blue-900 mb-2">📊 本次對話統計</div>
                        <div className="flex items-center gap-4 text-sm text-blue-700">
                          <span>總 tokens: <strong>{totalTokens}</strong></span>
                          <span className="text-blue-300">|</span>
                          <span>總花費: <strong>${totalCost.toFixed(4)}</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
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

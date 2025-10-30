/**
 * Know-it-all AI 聊天介面
 * RAG 驅動的智能問答系統
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Send,
  MessageSquare,
  BookOpen,
  Plus,
  Trash2,
  Brain,
  FileText,
  AlertCircle,
  Lock,
  Settings,
  Upload,
  FolderOpen
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import ReportsLayout from '../reports-layout';

interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    sources?: Array<{
      documentId: string;
      title: string;
      similarity: number;
    }>;
    tokensUsed?: number;
    cost?: number;
  };
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  lastMessageAt: string;
  messageCount: number;
}

export default function KnowItAllChatPage() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o-mini');
  const [useSmartMode, setUseSmartMode] = useState(false);
  const [knowledgeBaseStats, setKnowledgeBaseStats] = useState<any>(null);
  const [matchCount, setMatchCount] = useState(5);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // 計算當前對話的總成本和 token
  const conversationStats = messages.reduce((acc, msg) => {
    if (msg.role === 'assistant' && msg.metadata) {
      acc.totalTokens += msg.metadata.tokensUsed || 0;
      acc.totalCost += msg.metadata.cost || 0;
    }
    return acc;
  }, { totalTokens: 0, totalCost: 0 });

  // 模型價格（每 1M tokens，美元）
  const MODEL_PRICING: Record<string, { input: number; output: number }> = {
    'gpt-5': { input: 2.00, output: 6.00 },
    'gpt-5-mini': { input: 0.40, output: 1.20 },
    'gpt-5-nano': { input: 0.10, output: 0.30 },
    'o1': { input: 15.00, output: 60.00 },
    'o1-mini': { input: 3.00, output: 12.00 },
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  };

  // 計算預估費用
  const estimatedCost = knowledgeBaseStats ? (() => {
    const pricing = MODEL_PRICING[selectedModel] || MODEL_PRICING['gpt-4o-mini'];
    const avgTokensPerDoc = knowledgeBaseStats.avgTokensPerDoc || 500;
    const estimatedInputTokens = avgTokensPerDoc * matchCount + 500; // 知識庫 + 系統提示詞
    const estimatedOutputTokens = 500; // 假設平均回覆長度

    const inputCost = (estimatedInputTokens / 1000000) * pricing.input;
    const outputCost = (estimatedOutputTokens / 1000000) * pricing.output;
    return inputCost + outputCost;
  })() : null;

  // 自動滾動到最新訊息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 檢查存取權限
  useEffect(() => {
    checkAccess();
  }, []);

  // 載入對話列表和知識庫統計
  useEffect(() => {
    if (hasAccess) {
      loadConversations();
      loadKnowledgeBaseStats();
    }
  }, [hasAccess]);

  // 載入對話歷史
  useEffect(() => {
    if (currentConversationId) {
      loadConversationHistory(currentConversationId);
    }
  }, [currentConversationId]);

  const checkAccess = async () => {
    try {
      const response = await fetch('/api/know-it-all/check-access');
      const result = await response.json();
      setHasAccess(result.hasAccess);
    } catch (error) {
      console.error('Check access error:', error);
      setHasAccess(false);
    }
  };

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const response = await fetch('/api/know-it-all/conversations');
      if (!response.ok) throw new Error('載入對話列表失敗');

      const result = await response.json();
      setConversations(result.data.conversations);

      // 如果沒有選擇對話且有對話存在，自動選擇第一個
      if (!currentConversationId && result.data.conversations.length > 0) {
        setCurrentConversationId(result.data.conversations[0].id);
      }
    } catch (error: any) {
      console.error('Load conversations error:', error);
      toast({
        title: '❌ 載入對話列表失敗',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadConversationHistory = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/know-it-all/conversations/${conversationId}`);
      if (!response.ok) throw new Error('載入對話歷史失敗');

      const result = await response.json();
      setMessages(result.data.messages);
    } catch (error: any) {
      console.error('Load conversation history error:', error);
      toast({
        title: '❌ 載入對話歷史失敗',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const loadKnowledgeBaseStats = async () => {
    try {
      const response = await fetch('/api/know-it-all/knowledge-base/stats');
      if (!response.ok) {
        console.warn('知識庫統計暫時無法載入（可能資料庫表尚未建立）');
        return;
      }

      const result = await response.json();
      setKnowledgeBaseStats(result.data);
    } catch (error: any) {
      console.warn('Load knowledge base stats error:', error);
      // 不顯示錯誤，讓用戶正常使用其他功能
    }
  };

  const createNewConversation = async () => {
    try {
      const response = await fetch('/api/know-it-all/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '新對話',
        }),
      });

      if (!response.ok) throw new Error('建立對話失敗');

      const result = await response.json();
      const newConversation = result.data.conversation;

      setConversations([newConversation, ...conversations]);
      setCurrentConversationId(newConversation.id);
      setMessages([]);

      toast({
        title: '✅ 新對話已建立',
        description: '開始提問吧！',
      });
    } catch (error: any) {
      console.error('Create conversation error:', error);
      toast({
        title: '❌ 建立對話失敗',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!confirm('確定要刪除這個對話嗎？')) return;

    try {
      const response = await fetch(`/api/know-it-all/conversations/${conversationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('刪除對話失敗');

      setConversations(conversations.filter(c => c.id !== conversationId));

      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        setMessages([]);
      }

      toast({
        title: '✅ 對話已刪除',
      });
    } catch (error: any) {
      console.error('Delete conversation error:', error);
      toast({
        title: '❌ 刪除對話失敗',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const sendMessage = async () => {
    if (!question.trim()) return;

    // 如果沒有對話，先建立一個
    let conversationId = currentConversationId;
    if (!conversationId) {
      try {
        const response = await fetch('/api/know-it-all/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: question.slice(0, 50), // 用第一個問題作為標題
          }),
        });

        if (!response.ok) throw new Error('建立對話失敗');

        const result = await response.json();
        conversationId = result.data.conversation.id;
        setCurrentConversationId(conversationId);
        setConversations([result.data.conversation, ...conversations]);
      } catch (error: any) {
        toast({
          title: '❌ 建立對話失敗',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }
    }

    const userQuestion = question.trim();
    setQuestion('');
    setIsLoading(true);

    // 立即顯示使用者訊息
    const tempUserMessage: Message = {
      id: 'temp-user',
      conversationId: conversationId!,
      role: 'user',
      content: userQuestion,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const response = await fetch('/api/know-it-all/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          content: userQuestion,
          model: useSmartMode ? 'smart' : selectedModel,
          knowledgeMatchCount: matchCount,
        }),
      });

      if (!response.ok) throw new Error('AI 對話失敗');

      const result = await response.json();
      const { userMessage, assistantMessage } = result.data;

      // 更新訊息列表（移除臨時訊息，加入真實訊息）
      setMessages(prev => [
        ...prev.filter(m => m.id !== 'temp-user'),
        userMessage,
        assistantMessage,
      ]);

      // 更新對話列表
      loadConversations();

    } catch (error: any) {
      console.error('Send message error:', error);
      toast({
        title: '❌ AI 對話失敗',
        description: error.message,
        variant: 'destructive',
      });

      // 移除臨時訊息
      setMessages(prev => prev.filter(m => m.id !== 'temp-user'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter 或 Cmd+Enter 送出訊息
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendMessage();
    }
    // 純 Enter 不做任何事（讓它正常換行）
  };

  // 無存取權限
  if (hasAccess === false) {
    return (
      <ReportsLayout title="Know-it-all AI">
        <div className="flex items-center justify-center h-[70vh]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Lock className="h-5 w-5" />
                無存取權限
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                抱歉，您目前沒有權限使用 Know-it-all AI 系統。
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                如需開通權限，請聯繫系統管理員。
              </p>
            </CardContent>
          </Card>
        </div>
      </ReportsLayout>
    );
  }

  // 載入中
  if (hasAccess === null) {
    return (
      <ReportsLayout title="Know-it-all AI">
        <div className="flex items-center justify-center h-[70vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ReportsLayout>
    );
  }

  return (
    <ReportsLayout title="Know-it-all AI">
      <div className="h-[calc(100vh-120px)] flex gap-4">
        {/* 左側：對話列表與管理 */}
        <Card className="w-72 flex flex-col">
          <CardHeader className="pb-3 space-y-3">
            {/* 對話列表標題與新對話按鈕 */}
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                對話
              </CardTitle>
              <Button
                size="sm"
                onClick={createNewConversation}
                disabled={isLoadingConversations}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* 管理按鈕區域 */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.location.href = '/tools/know-it-all-documents'}
              >
                <FolderOpen className="h-4 w-4 mr-1" />
                <span className="text-xs">文件管理</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.location.href = '/tools/know-it-all-upload'}
              >
                <Upload className="h-4 w-4 mr-1" />
                <span className="text-xs">上傳文件</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoadingConversations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>尚無對話</p>
                <p className="text-xs mt-1">點擊「新對話」開始</p>
              </div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent group ${
                    currentConversationId === conv.id ? 'bg-accent border-primary' : ''
                  }`}
                  onClick={() => setCurrentConversationId(conv.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{conv.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {conv.messageCount} 則訊息
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(conv.lastMessageAt).toLocaleString('zh-TW')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 右側：聊天區域 */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Know-it-all AI
                {currentConversationId && (
                  <span className="text-sm text-muted-foreground font-normal ml-2">
                    {conversations.find(c => c.id === currentConversationId)?.title}
                  </span>
                )}
              </CardTitle>
              {currentConversationId && conversationStats.totalTokens > 0 && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="font-mono">💰</span>
                    <span className="font-medium">${conversationStats.totalCost.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="font-mono">🎯</span>
                    <span className="font-medium">{conversationStats.totalTokens.toLocaleString()} tokens</span>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-4">
            {/* 訊息區域 */}
            <div className="flex-1 overflow-y-auto border rounded-lg p-4 space-y-4 bg-muted/10 mb-4">
              {!currentConversationId ? (
                <div className="text-center text-muted-foreground py-16">
                  <Brain className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">歡迎使用 Know-it-all AI</p>
                  <p className="text-sm mt-2">建立新對話或選擇現有對話開始提問</p>
                  <div className="mt-6 text-left max-w-md mx-auto space-y-2">
                    <p className="text-xs font-semibold">💡 功能特色：</p>
                    <ul className="text-xs space-y-1 list-disc list-inside">
                      <li>基於您上傳的知識文件回答問題</li>
                      <li>自動檢索最相關的文件內容</li>
                      <li>顯示引用來源與相似度分數</li>
                      <li>保留完整對話歷史</li>
                    </ul>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-16">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">開始提問吧！</p>
                  <p className="text-sm mt-2">AI 會根據知識庫文件回答您的問題</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <div
                      key={msg.id || idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-4 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-white dark:bg-gray-800 border'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>

                            {/* 引用來源 */}
                            {msg.metadata?.sources && msg.metadata.sources.length > 0 && (
                              <div className="mt-4 pt-4 border-t text-xs space-y-2">
                                <p className="font-semibold flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  引用來源 ({msg.metadata.sources.length}):
                                </p>
                                {msg.metadata.sources.map((source, sourceIdx) => (
                                  <div key={sourceIdx} className="bg-muted/50 p-2 rounded">
                                    <p className="font-medium">{source.title}</p>
                                    <p className="text-muted-foreground">
                                      相似度: {(source.similarity * 100).toFixed(1)}%
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* 成本資訊 */}
                            {msg.metadata?.tokensUsed && (
                              <div className="mt-3 pt-3 border-t flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-1">
                                  <span className="font-mono">🎯</span>
                                  <span className="text-muted-foreground">
                                    {msg.metadata.tokensUsed.toLocaleString()} tokens
                                  </span>
                                </div>
                                {msg.metadata.cost && (
                                  <div className="flex items-center gap-1">
                                    <span className="font-mono">💰</span>
                                    <span className="text-green-600 dark:text-green-400 font-medium">
                                      ${msg.metadata.cost.toFixed(6)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* 輸入區域 */}
            <div className="space-y-2">
              {/* 模型設定區域 */}
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                {/* 智能模式開關 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-600" />
                    <label className="text-sm font-medium">智能模式</label>
                    <span className="text-xs text-muted-foreground">
                      自動根據問題複雜度選擇最佳模型
                    </span>
                  </div>
                  <Switch
                    checked={useSmartMode}
                    onCheckedChange={setUseSmartMode}
                  />
                </div>

                {/* 模型選擇器（智能模式關閉時） */}
                {!useSmartMode && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">AI 模型：</label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger className="w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-5">GPT-5（最新最強）</SelectItem>
                        <SelectItem value="gpt-5-mini">GPT-5 Mini（新一代）</SelectItem>
                        <SelectItem value="gpt-5-nano">GPT-5 Nano（輕量級）</SelectItem>
                        <SelectItem value="o1">o1（頂級推理）</SelectItem>
                        <SelectItem value="o1-mini">o1-mini（快速推理）</SelectItem>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="gpt-4o-mini">GPT-4o Mini（推薦）</SelectItem>
                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo（最快）</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">
                      {selectedModel === 'gpt-5' && '🌟 最新最強 GPT-5，全面超越 GPT-4'}
                      {selectedModel === 'gpt-5-mini' && '🚀 新一代 Mini，速度與品質兼具'}
                      {selectedModel === 'gpt-5-nano' && '⚡ 超快速輕量級模型'}
                      {selectedModel === 'o1' && '最強推理能力，適合複雜邏輯問題'}
                      {selectedModel === 'o1-mini' && '快速推理，適合中等難度問題'}
                      {selectedModel === 'gpt-4o' && 'GPT-4 系列最強對話模型'}
                      {selectedModel === 'gpt-4o-mini' && '平衡速度與品質，穩定推薦'}
                      {selectedModel === 'gpt-4-turbo' && '強大且快速'}
                      {selectedModel === 'gpt-3.5-turbo' && '快速回應，適合簡單問題'}
                    </span>
                  </div>
                )}

                {/* 智能模式提示 */}
                {useSmartMode && (
                  <div className="text-sm text-purple-600 bg-purple-50 dark:bg-purple-950/20 p-2 rounded">
                    🧠 智能模式已啟用：系統將自動選擇 GPT-5 Nano（簡單問題）、GPT-5 Mini（中等問題）或 GPT-5（複雜問題）
                  </div>
                )}

                {/* 知識庫檢索設定 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-muted-foreground">檢索文件數量：{matchCount} 份</label>
                    <span className="text-xs text-muted-foreground">
                      {matchCount <= 3 && '節省成本'}
                      {matchCount > 3 && matchCount <= 7 && '平衡推薦'}
                      {matchCount > 7 && '全面分析'}
                    </span>
                  </div>
                  <Slider
                    value={[matchCount]}
                    onValueChange={(value) => setMatchCount(value[0])}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* 費用預估 */}
                {estimatedCost !== null && (
                  <div className="flex items-center justify-between text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                    <span className="text-muted-foreground">預估單次費用：</span>
                    <span className="font-mono font-medium text-green-600 dark:text-green-400">
                      ${estimatedCost.toFixed(6)}
                    </span>
                  </div>
                )}

                {/* 知識庫統計 */}
                {knowledgeBaseStats && (
                  <div className="text-xs text-muted-foreground">
                    知識庫：{knowledgeBaseStats.totalDocuments} 份文件，約 {knowledgeBaseStats.estimatedTokens.toLocaleString()} tokens
                  </div>
                )}
              </div>

              {!currentConversationId && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p>發送訊息將自動建立新對話</p>
                </div>
              )}
              <div className="flex gap-2">
                <Textarea
                  placeholder="輸入您的問題... (Enter 換行，Ctrl+Enter 發送)"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="resize-none"
                  rows={3}
                />
                <Button
                  onClick={sendMessage}
                  disabled={isLoading || !question.trim()}
                  className="px-6"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      發送
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ReportsLayout>
  );
}

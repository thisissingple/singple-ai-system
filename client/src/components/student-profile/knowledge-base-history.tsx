/**
 * Knowledge Base History Component
 *
 * 顯示學員知識庫的資料來源歷程：
 * - 上課記錄（含逐字稿）
 * - 諮詢記錄
 * - AI 分析記錄
 * - 購買記錄
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Calendar,
  DollarSign,
  User,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface KnowledgeBaseHistoryProps {
  studentEmail: string;
  dataSources: any;
  trialClasses: any[];
  eodsRecords: any[];
  aiAnalyses: any[];
  consultationAnalyses: any[];
  aiConversations: any[];
  consultantConversations: any[];
  purchases: any[];
}

export function KnowledgeBaseHistory({
  studentEmail,
  dataSources,
  trialClasses,
  eodsRecords,
  aiAnalyses,
  consultationAnalyses,
  aiConversations,
  consultantConversations,
  purchases,
}: KnowledgeBaseHistoryProps) {
  const [expandedTranscripts, setExpandedTranscripts] = useState<Record<string, boolean>>({});

  const toggleTranscript = (id: string) => {
    setExpandedTranscripts((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // 合併並排序所有資料來源
  const allSources = [
    ...trialClasses.map((tc) => ({
      id: tc.id,
      type: 'trial_class' as const,
      date: tc.class_date,
      data: tc,
    })),
    ...eodsRecords.map((eod) => ({
      id: eod.id,
      type: 'eods' as const,
      date: eod.consultation_date || eod.created_at,
      data: eod,
    })),
    ...aiAnalyses.map((ai) => ({
      id: ai.id,
      type: 'ai_analysis' as const,
      date: ai.analyzed_at,
      data: ai,
    })),
    ...consultationAnalyses.map((ca) => ({
      id: ca.id,
      type: 'consultation_analysis' as const,
      date: ca.analyzed_at,
      data: ca,
    })),
    ...aiConversations.map((conv) => ({
      id: conv.id,
      type: 'ai_conversation' as const,
      date: conv.created_at,
      data: conv,
    })),
    ...consultantConversations.map((conv) => ({
      id: conv.id,
      type: 'consultant_conversation' as const,
      date: conv.created_at,
      data: conv,
    })),
    ...purchases.map((p) => ({
      id: p.id,
      type: 'purchase' as const,
      date: p.purchase_date,
      data: p,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Taipei',
    });
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '-';
    const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) : amount;
    return `NT$ ${num.toLocaleString()}`;
  };

  // 提取知識庫項目（簡化版，實際應從 profile_summary 提取）
  const extractKBItems = (source: any, type: string) => {
    const items: string[] = [];

    if (type === 'trial_class') {
      if (source.teacher_name) items.push(`負責老師：${source.teacher_name}`);
      if (source.class_transcript) items.push(`逐字稿：${source.class_transcript.length.toLocaleString()} 字`);
    } else if (type === 'eods') {
      if (source.plan_name) items.push(`諮詢方案：${source.plan_name}`);
      if (source.actual_amount) items.push(`金額：${formatCurrency(source.actual_amount)}`);
      if (source.is_show) items.push(`出席狀態：${source.is_show}`);
    } else if (type === 'purchase') {
      if (source.amount) items.push(`購買金額：${formatCurrency(source.amount)}`);
    }

    return items;
  };

  // 統計
  const stats = {
    trialClasses: trialClasses.length,
    consultations: eodsRecords.length,
    aiAnalyses: aiAnalyses.length,
    consultationAnalyses: consultationAnalyses.length,
    aiConversations: aiConversations.length,
    consultantConversations: consultantConversations.length,
    purchases: purchases.length,
  };

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📊 資料來源統計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{stats.trialClasses}</div>
              <div className="text-sm text-gray-600 mt-1">上課記錄</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">{stats.consultations}</div>
              <div className="text-sm text-gray-600 mt-1">諮詢記錄</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-3xl font-bold text-orange-600">{stats.aiAnalyses}</div>
              <div className="text-sm text-gray-600 mt-1">體驗課 AI 分析</div>
            </div>
            <div className="text-center p-4 bg-pink-50 rounded-lg">
              <div className="text-3xl font-bold text-pink-600">{stats.consultationAnalyses}</div>
              <div className="text-sm text-gray-600 mt-1">諮詢 AI 分析</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-3xl font-bold text-yellow-600">{stats.aiConversations}</div>
              <div className="text-sm text-gray-600 mt-1">老師 AI 對話</div>
            </div>
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <div className="text-3xl font-bold text-indigo-600">{stats.consultantConversations}</div>
              <div className="text-sm text-gray-600 mt-1">諮詢師 AI 對話</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{stats.purchases}</div>
              <div className="text-sm text-gray-600 mt-1">購買記錄</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 時間軸 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🕐 資料來源時間軸</CardTitle>
          <CardDescription>按時間倒序顯示所有知識庫資料來源</CardDescription>
        </CardHeader>
        <CardContent>
          {allSources.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>尚無資料記錄</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allSources.map((source, index) => (
                <div key={`${source.type}-${source.id}`} className="relative">
                  {/* 時間軸線 */}
                  {index < allSources.length - 1 && (
                    <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gray-200" />
                  )}

                  <div className="flex gap-4">
                    {/* 圖標 */}
                    <div className="flex-shrink-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                          source.type === 'trial_class'
                            ? 'bg-blue-500'
                            : source.type === 'eods'
                            ? 'bg-purple-500'
                            : source.type === 'ai_analysis'
                            ? 'bg-orange-500'
                            : source.type === 'consultation_analysis'
                            ? 'bg-pink-500'
                            : source.type === 'ai_conversation'
                            ? 'bg-yellow-500'
                            : source.type === 'consultant_conversation'
                            ? 'bg-indigo-500'
                            : 'bg-green-500'
                        }`}
                      >
                        {source.type === 'trial_class' && '🔵'}
                        {source.type === 'eods' && '🟣'}
                        {source.type === 'ai_analysis' && '🟠'}
                        {source.type === 'consultation_analysis' && '🌸'}
                        {source.type === 'ai_conversation' && '🟡'}
                        {source.type === 'consultant_conversation' && '🟪'}
                        {source.type === 'purchase' && '🟢'}
                      </div>
                    </div>

                    {/* 內容卡片 */}
                    <div className="flex-1">
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-4">
                          {/* Trial Class Record */}
                          {source.type === 'trial_class' && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-blue-500">上課記錄</Badge>
                                  <span className="text-sm font-semibold">
                                    {formatDate(source.data.class_date)}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-2 text-sm">
                                {source.data.teacher_name && (
                                  <div className="flex items-center gap-2 text-gray-700">
                                    <User className="h-4 w-4" />
                                    老師：{source.data.teacher_name}
                                  </div>
                                )}

                                {source.data.class_transcript && (
                                  <div>
                                    <div className="flex items-center gap-2 text-gray-700 mb-2">
                                      <FileText className="h-4 w-4" />
                                      逐字稿：{source.data.class_transcript.length.toLocaleString()} 字
                                    </div>

                                    {/* 逐字稿預覽 */}
                                    <div className="ml-6 bg-gray-50 rounded-lg p-3">
                                      <div className="text-xs text-gray-600 mb-2">
                                        💡 逐字稿摘要：
                                      </div>
                                      <p className="text-sm text-gray-800 line-clamp-3">
                                        {source.data.class_transcript.substring(0, 200)}...
                                      </p>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="mt-2 text-xs"
                                        onClick={() => toggleTranscript(`tc-${source.id}`)}
                                      >
                                        {expandedTranscripts[`tc-${source.id}`] ? (
                                          <>
                                            <ChevronUp className="h-3 w-3 mr-1" />
                                            收起完整逐字稿
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="h-3 w-3 mr-1" />
                                            查看完整逐字稿
                                          </>
                                        )}
                                      </Button>

                                      {expandedTranscripts[`tc-${source.id}`] && (
                                        <div className="mt-3 p-3 bg-white rounded border max-h-96 overflow-y-auto">
                                          <pre className="text-xs whitespace-pre-wrap text-gray-700">
                                            {source.data.class_transcript}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* 已存入知識庫項目 */}
                              <div className="ml-6 mt-3">
                                <div className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  已存入知識庫項目：
                                </div>
                                <div className="space-y-1">
                                  {extractKBItems(source.data, source.type).map((item, i) => (
                                    <div key={i} className="text-xs text-gray-700 pl-4">
                                      • {item}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* EODS Record */}
                          {source.type === 'eods' && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-purple-500">諮詢記錄</Badge>
                                  <span className="text-sm font-semibold">
                                    {formatDate(source.data.consultation_date || source.data.created_at)}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-2 text-sm">
                                {source.data.closer_name && (
                                  <div className="flex items-center gap-2 text-gray-700">
                                    <User className="h-4 w-4" />
                                    諮詢師：{source.data.closer_name}
                                  </div>
                                )}

                                {source.data.plan_name && (
                                  <div className="text-gray-700">📋 方案：{source.data.plan_name}</div>
                                )}

                                {source.data.actual_amount && (
                                  <div className="flex items-center gap-2 text-gray-700">
                                    <DollarSign className="h-4 w-4" />
                                    金額：{formatCurrency(source.data.actual_amount)}
                                  </div>
                                )}

                                {source.data.is_show && (
                                  <div className="flex items-center gap-2 text-gray-700">
                                    {source.data.is_show === '已上線' ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <AlertCircle className="h-4 w-4 text-red-500" />
                                    )}
                                    出席狀態：{source.data.is_show}
                                  </div>
                                )}

                                {/* 諮詢逐字稿 */}
                                {source.data.consultation_transcript && (
                                  <div>
                                    <div className="flex items-center gap-2 text-gray-700 mb-2">
                                      <FileText className="h-4 w-4" />
                                      逐字稿：{source.data.consultation_transcript.length.toLocaleString()} 字
                                    </div>

                                    {/* 逐字稿預覽 */}
                                    <div className="ml-6 bg-purple-50 rounded-lg p-3">
                                      <div className="text-xs text-gray-600 mb-2">
                                        💡 逐字稿摘要：
                                      </div>
                                      <p className="text-sm text-gray-800 line-clamp-3">
                                        {source.data.consultation_transcript.substring(0, 200)}...
                                      </p>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="mt-2 text-xs"
                                        onClick={() => toggleTranscript(`eod-${source.id}`)}
                                      >
                                        {expandedTranscripts[`eod-${source.id}`] ? (
                                          <>
                                            <ChevronUp className="h-3 w-3 mr-1" />
                                            收起完整逐字稿
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="h-3 w-3 mr-1" />
                                            查看完整逐字稿
                                          </>
                                        )}
                                      </Button>

                                      {expandedTranscripts[`eod-${source.id}`] && (
                                        <div className="mt-3 p-3 bg-white rounded border max-h-96 overflow-y-auto">
                                          <pre className="text-xs whitespace-pre-wrap text-gray-700">
                                            {source.data.consultation_transcript}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* 已存入知識庫項目 */}
                              <div className="ml-6 mt-3">
                                <div className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  已存入知識庫項目：
                                </div>
                                <div className="space-y-1">
                                  {extractKBItems(source.data, source.type).map((item, i) => (
                                    <div key={i} className="text-xs text-gray-700 pl-4">
                                      • {item}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* AI Analysis Record */}
                          {source.type === 'ai_analysis' && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-orange-500">體驗課 AI 分析</Badge>
                                  <span className="text-sm font-semibold">
                                    {formatDate(source.data.analyzed_at)}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-2 text-sm">
                                {source.data.overall_score && (
                                  <div className="text-gray-700">
                                    ⭐ 綜合評分：{source.data.overall_score}/10
                                  </div>
                                )}

                                {source.data.class_summary && (
                                  <div className="bg-gray-50 rounded p-3 text-gray-700">
                                    <div className="text-xs text-gray-600 mb-2">💡 課程摘要：</div>
                                    <p className="text-sm">{source.data.class_summary}</p>
                                  </div>
                                )}

                                {/* AI 分析完整內容 */}
                                {(() => {
                                  // Extract markdown report from conversion_suggestions
                                  let markdownReport = '';
                                  try {
                                    const conversionSuggestions = source.data.conversion_suggestions
                                      ? (typeof source.data.conversion_suggestions === 'string'
                                        ? JSON.parse(source.data.conversion_suggestions)
                                        : source.data.conversion_suggestions)
                                      : null;

                                    markdownReport = conversionSuggestions?.markdownOutput || '';
                                  } catch (e) {
                                    console.error('Failed to parse conversion_suggestions:', e);
                                  }

                                  // If no markdown report, don't show the button
                                  if (!markdownReport) return null;

                                  return (
                                    <div className="ml-6">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => toggleTranscript(`ai-${source.id}`)}
                                      >
                                        {expandedTranscripts[`ai-${source.id}`] ? (
                                          <>
                                            <ChevronUp className="h-3 w-3 mr-1" />
                                            收起完整分析
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="h-3 w-3 mr-1" />
                                            查看完整 AI 分析報告
                                          </>
                                        )}
                                      </Button>

                                      {expandedTranscripts[`ai-${source.id}`] && (
                                        <div className="mt-3 bg-gray-50 rounded-lg p-4 prose prose-sm max-w-none">
                                          <ReactMarkdown>{markdownReport}</ReactMarkdown>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          )}

                          {/* Consultation Analysis Record */}
                          {source.type === 'consultation_analysis' && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-pink-500">諮詢 AI 分析</Badge>
                                  <span className="text-sm font-semibold">
                                    {formatDate(source.data.analyzed_at)}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-2 text-sm">
                                {source.data.overall_rating && (
                                  <div className="text-gray-700">
                                    ⭐ 綜合評分：{source.data.overall_rating}/10
                                  </div>
                                )}

                                {source.data.overall_comment && (
                                  <div className="bg-pink-50 rounded p-3 text-gray-700">
                                    <div className="text-xs text-gray-600 mb-2">💡 諮詢摘要：</div>
                                    <p className="text-sm">{source.data.overall_comment}</p>
                                  </div>
                                )}

                                {/* Consultation AI 分析完整內容 */}
                                {source.data.raw_markdown_output && (
                                  <div className="ml-6">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => toggleTranscript(`consultation-${source.id}`)}
                                    >
                                      {expandedTranscripts[`consultation-${source.id}`] ? (
                                        <>
                                          <ChevronUp className="h-3 w-3 mr-1" />
                                          收起完整分析
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown className="h-3 w-3 mr-1" />
                                          查看完整諮詢分析報告
                                        </>
                                      )}
                                    </Button>

                                    {expandedTranscripts[`consultation-${source.id}`] && (
                                      <div className="mt-3 bg-pink-50 rounded-lg p-4 prose prose-sm max-w-none">
                                        <ReactMarkdown>{source.data.raw_markdown_output}</ReactMarkdown>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* AI Conversation Record */}
                          {source.type === 'ai_conversation' && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-yellow-500">老師 AI 對話</Badge>
                                  <span className="text-sm font-semibold">
                                    {formatDate(source.data.created_at)}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-2 text-sm">
                                {/* 問題類型 */}
                                <div className="flex items-center gap-2 text-gray-700">
                                  <MessageSquare className="h-4 w-4" />
                                  {source.data.question_type === 'preset' ? '預設問題' : '自訂問題'}
                                  {source.data.preset_question_key && (
                                    <Badge variant="outline" className="text-xs">
                                      {source.data.preset_question_key}
                                    </Badge>
                                  )}
                                </div>

                                {/* 問題 */}
                                <div className="bg-blue-50 rounded-lg p-3">
                                  <div className="text-xs text-gray-600 mb-1">👤 問：</div>
                                  <p className="text-sm text-gray-800">{source.data.question}</p>
                                </div>

                                {/* 回答預覽 */}
                                <div className="bg-green-50 rounded-lg p-3">
                                  <div className="text-xs text-gray-600 mb-1">🤖 答：</div>
                                  <p className="text-sm text-gray-800 line-clamp-3">
                                    {source.data.answer.substring(0, 150)}...
                                  </p>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 text-xs"
                                    onClick={() => toggleTranscript(`conv-${source.id}`)}
                                  >
                                    {expandedTranscripts[`conv-${source.id}`] ? (
                                      <>
                                        <ChevronUp className="h-3 w-3 mr-1" />
                                        收起完整回答
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-3 w-3 mr-1" />
                                        查看完整回答
                                      </>
                                    )}
                                  </Button>

                                  {expandedTranscripts[`conv-${source.id}`] && (
                                    <div className="mt-3 prose prose-sm max-w-none">
                                      <ReactMarkdown>{source.data.answer}</ReactMarkdown>
                                    </div>
                                  )}
                                </div>

                                {/* 統計資訊 */}
                                <div className="flex gap-4 text-xs text-gray-600 mt-2">
                                  {source.data.tokens_used && (
                                    <span>{source.data.tokens_used} tokens</span>
                                  )}
                                  {source.data.api_cost_usd && (
                                    <span>${parseFloat(source.data.api_cost_usd).toFixed(4)}</span>
                                  )}
                                  {source.data.is_cached && (
                                    <Badge variant="outline" className="text-xs">快取</Badge>
                                  )}
                                </div>
                              </div>

                              {/* 已存入知識庫項目 */}
                              <div className="ml-6 mt-3">
                                <div className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  已存入知識庫項目：
                                </div>
                                <div className="space-y-1">
                                  <div className="text-xs text-gray-700 pl-4">
                                    • 問題：{source.data.question}
                                  </div>
                                  <div className="text-xs text-gray-700 pl-4">
                                    • AI 回答：{source.data.answer.length.toLocaleString()} 字
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Consultant Conversation Record */}
                          {source.type === 'consultant_conversation' && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-indigo-500">諮詢師 AI 對話</Badge>
                                  <span className="text-sm font-semibold">
                                    {formatDate(source.data.created_at)}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-2 text-sm">
                                {/* 問題類型 */}
                                <div className="flex items-center gap-2 text-gray-700">
                                  <MessageSquare className="h-4 w-4" />
                                  {source.data.question_type === 'preset' ? '預設問題' : '自訂問題'}
                                  {source.data.preset_question_key && (
                                    <Badge variant="outline" className="text-xs">
                                      {source.data.preset_question_key}
                                    </Badge>
                                  )}
                                </div>

                                {/* 諮詢師資訊 */}
                                {source.data.consultant_id && (
                                  <div className="flex items-center gap-2 text-gray-700">
                                    <User className="h-4 w-4" />
                                    諮詢師：{source.data.consultant_id}
                                  </div>
                                )}

                                {/* 問題 */}
                                <div className="bg-indigo-50 rounded-lg p-3">
                                  <div className="text-xs text-gray-600 mb-1">👤 問：</div>
                                  <p className="text-sm text-gray-800">{source.data.question}</p>
                                </div>

                                {/* 回答預覽 */}
                                <div className="bg-purple-50 rounded-lg p-3">
                                  <div className="text-xs text-gray-600 mb-1">🤖 答：</div>
                                  <p className="text-sm text-gray-800 line-clamp-3">
                                    {source.data.answer.substring(0, 150)}...
                                  </p>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 text-xs"
                                    onClick={() => toggleTranscript(`consultant-conv-${source.id}`)}
                                  >
                                    {expandedTranscripts[`consultant-conv-${source.id}`] ? (
                                      <>
                                        <ChevronUp className="h-3 w-3 mr-1" />
                                        收起完整回答
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-3 w-3 mr-1" />
                                        查看完整回答
                                      </>
                                    )}
                                  </Button>

                                  {expandedTranscripts[`consultant-conv-${source.id}`] && (
                                    <div className="mt-3 prose prose-sm max-w-none">
                                      <ReactMarkdown>{source.data.answer}</ReactMarkdown>
                                    </div>
                                  )}
                                </div>

                                {/* 統計資訊 */}
                                <div className="flex gap-4 text-xs text-gray-600 mt-2">
                                  {source.data.tokens_used && (
                                    <span>{source.data.tokens_used} tokens</span>
                                  )}
                                  {source.data.api_cost_usd && (
                                    <span>${parseFloat(source.data.api_cost_usd).toFixed(4)}</span>
                                  )}
                                  {source.data.is_cached && (
                                    <Badge variant="outline" className="text-xs">快取</Badge>
                                  )}
                                </div>
                              </div>

                              {/* 已存入知識庫項目 */}
                              <div className="ml-6 mt-3">
                                <div className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  已存入知識庫項目：
                                </div>
                                <div className="space-y-1">
                                  <div className="text-xs text-gray-700 pl-4">
                                    • 問題：{source.data.question}
                                  </div>
                                  <div className="text-xs text-gray-700 pl-4">
                                    • AI 回答：{source.data.answer.length.toLocaleString()} 字
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Purchase Record */}
                          {source.type === 'purchase' && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-green-500">購買記錄</Badge>
                                  <span className="text-sm font-semibold">
                                    {formatDate(source.data.purchase_date)}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-2 text-sm">
                                {source.data.amount && (
                                  <div className="flex items-center gap-2 text-gray-700">
                                    <DollarSign className="h-4 w-4" />
                                    金額：{formatCurrency(source.data.amount)}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 知識庫完整性檢查 */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div className="flex-1">
              <div className="font-semibold text-gray-800">知識庫完整性檢查</div>
              <div className="text-sm text-gray-600 mt-1">
                {stats.trialClasses + stats.consultations + stats.purchases > 0 ? (
                  <>✅ 所有記錄已正確存入知識庫</>
                ) : (
                  <>⚠️ 尚無任何記錄</>
                )}
                {stats.aiAnalyses === 0 && stats.trialClasses > 0 && (
                  <div className="mt-1 text-amber-600">
                    💡 提示：有 {stats.trialClasses} 筆上課記錄尚未進行 AI 分析，建議進行分析以獲得更多洞察
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

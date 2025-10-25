/**
 * Sales Analysis Detail (Redesigned UX/UI - MVP: 蔡宇翔)
 * 推課分析詳情頁 - 全新遊戲化 UI
 */

import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLocation, useRoute } from 'wouter';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { sidebarConfig } from '@/config/sidebar-config';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCopy,
  Copy,
  FileText,
  MessageSquare,
} from 'lucide-react';

import type { TeachingQualityAnalysisDetail } from '@/types/teaching-quality';
import {
  formatDate,
  getConversionStatusColor,
  getConversionStatusLabel,
  getScoreBadgeColor,
} from '@/types/teaching-quality';
import { cn } from '@/lib/utils';
import { PainPointsSection } from '@/components/teaching-quality/pain-points-section';
import { SalesScriptsSection } from '@/components/teaching-quality/sales-scripts-section';
import { SalesScoreCard } from '@/components/teaching-quality/sales-score-card';
import { FloatingAIChat } from '@/components/teaching-quality/floating-ai-chat';
import { parseTeachingAnalysisMarkdown } from '@/lib/parse-teaching-analysis';

type ConversionSuggestionMarkdown = {
  markdownOutput: string;
  conversionProbability?: number;
};

interface ParsedScoreItem {
  label: string;
  value: number;
  evidence: string;
}

interface ParsedScript {
  id: string;
  title: string;
  body: string;
}

interface ParsedStudentProfile {
  basicInfo: {
    ageGenderOccupation?: string;
    decisionMaker?: { text: string; timestamp?: string };
    paymentCapacity?: { text: string; timestamp?: string };
  };
  voiceStatus?: { text: string; timestamp?: string };
  pastAttempts?: Array<{ text: string; timestamp?: string }>;
  currentPainPoints?: Array<{ text: string; timestamp?: string }>;
  dreamVision?: { text: string; timestamp?: string };
  motivation?: { text: string; timestamp?: string };
  useCase?: { text: string; timestamp?: string };
  needsToAsk?: string[];
}

interface ParsedAnalysis {
  rawMarkdown: string;
  studentProfile?: ParsedStudentProfile;
  metrics?: {
    scoreItems: ParsedScoreItem[];
    summary?: string;
  };
  missions?: string[];
  scripts?: ParsedScript[];
  probability?: {
    value?: number;
    body: string;
  };
}

function isMarkdownSuggestion(
  value: unknown
): value is ConversionSuggestionMarkdown {
  return (
    typeof value === 'object' &&
    value !== null &&
    'markdownOutput' in value &&
    typeof (value as any).markdownOutput === 'string'
  );
}

function extractSections(markdown: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const headingRegex = /^# (.+)$/gm;
  const matches: Array<{ title: string; start: number; bodyStart: number }> = [];

  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(markdown))) {
    const title = match[1].trim();
    const headingLineEnd = markdown.indexOf('\n', match.index);
    const bodyStart = headingLineEnd === -1 ? markdown.length : headingLineEnd + 1;
    matches.push({
      title,
      start: match.index,
      bodyStart,
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    const end = next ? next.start : markdown.length;
    const body = markdown.slice(current.bodyStart, end).trim();
    sections[current.title] = body;
  }

  return sections;
}

function parseMetrics(body?: string) {
  if (!body) return undefined;
  const lines = body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const scoreItems: ParsedScoreItem[] = [];
  let summary: string | undefined;

  lines.forEach((line) => {
    const scoreMatch = line.match(/^- (.+?)：(\d+)\/5（證據：(.+?)）/);
    if (scoreMatch) {
      scoreItems.push({
        label: scoreMatch[1].trim(),
        value: Number.parseInt(scoreMatch[2], 10),
        evidence: scoreMatch[3].trim(),
      });
      return;
    }

    const summaryMatch = line.match(/^- \*\*總評\*\*：(.+)/);
    if (summaryMatch) {
      summary = summaryMatch[1].trim();
    }
  });

  if (!scoreItems.length && !summary) return undefined;
  return { scoreItems, summary };
}

function parseMissions(body?: string) {
  if (!body) return undefined;
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^- /, '').trim());
}

function parseScripts(body?: string): ParsedScript[] | undefined {
  if (!body) return undefined;
  const scripts: ParsedScript[] = [];
  const scriptRegex =
    /(\d+)\.\s\*\*(.+?)\*\*\s*\n([\s\S]*?)(?=\n\d+\. \*\*|$)/g;

  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(body))) {
    const id = `variant-${match[1]}`;
    const title = match[2].trim();
    const scriptBody = match[3].trim();
    scripts.push({
      id,
      title,
      body: scriptBody,
    });
  }

  return scripts.length ? scripts : undefined;
}

function parseProbability(title?: string, body?: string) {
  if (!title) return undefined;
  const match = title.match(/(\d+)%/);
  const value = match ? Number.parseInt(match[1], 10) : undefined;
  return {
    value,
    body: (body ?? '').trim(),
  };
}

function extractTextWithTimestamp(text: string): { text: string; timestamp?: string } {
  // 支援兩種格式: (00:12:09) 或 00:12:09
  const timestampRegex = /[（(]?(\d{2}:\d{2}:\d{2})[）)]?/g;
  const matches = Array.from(text.matchAll(timestampRegex));

  if (matches.length > 0) {
    // 取最後一個時間戳
    const lastMatch = matches[matches.length - 1];
    return {
      text: text.replace(/[（(]?\d{2}:\d{2}:\d{2}[）)]?/g, '').trim(),
      timestamp: lastMatch[1],
    };
  }
  return { text: text.trim() };
}

function parseStudentProfile(body?: string): ParsedStudentProfile | undefined {
  if (!body) return undefined;

  const profile: ParsedStudentProfile = {
    basicInfo: {},
    pastAttempts: [],
    currentPainPoints: [],
  };

  // 解析基本資料（年齡/性別/職業）
  const basicInfoMatch = body.match(/年齡[／\/]性別[／\/]職業[／\/]角色：(.+)/);
  if (basicInfoMatch) {
    profile.basicInfo.ageGenderOccupation = basicInfoMatch[1].trim();
  }

  // 決策權
  const decisionMatch = body.match(/是否自己決定是否購課：(.+?)(?=\n|$)/);
  if (decisionMatch) {
    profile.basicInfo.decisionMaker = extractTextWithTimestamp(decisionMatch[1]);
  }

  // 付費能力
  const paymentMatch = body.match(/價格敏感度[／\/]付費能力：(.+?)(?=\n|$)/);
  if (paymentMatch) {
    profile.basicInfo.paymentCapacity = extractTextWithTimestamp(paymentMatch[1]);
  }

  // 聲音現況
  const voiceMatch = body.match(/\*\*🎤 聲音現況[^)]*\)\*\*\s*\n\s*(.+?)(?=\n\n|- \*\*)/);
  if (voiceMatch) {
    profile.voiceStatus = extractTextWithTimestamp(voiceMatch[1].trim());
  }

  // 過去嘗試
  const attemptsMatch = body.match(/\*\*📚 過去嘗試[^)]*\)\*\*\s*\n([\s\S]+?)(?=\n\n|- \*\*)/);
  if (attemptsMatch) {
    const attempts = attemptsMatch[1]
      .split('\n')
      .filter((line) => line.trim().startsWith('曾'));
    profile.pastAttempts = attempts.map((attempt) =>
      extractTextWithTimestamp(attempt.replace(/^\s*曾/, '').trim())
    );
  }

  // 現在最卡的地方
  const painMatch = body.match(/\*\*⛔️ 現在最卡的地方\*\*\s*\n([\s\S]+?)(?=\n\n|- \*\*)/);
  if (painMatch) {
    const pains = painMatch[1]
      .split('\n')
      .filter((line) => line.trim() && !line.includes('**'));
    profile.currentPainPoints = pains.map((pain) =>
      extractTextWithTimestamp(pain.trim())
    );
  }

  // 想成為的樣子
  const dreamMatch = body.match(/\*\*🏁 想成為什麼樣的自己[^)]*\)\*\*\s*\n\s*(.+?)(?=\n\n|- \*\*)/);
  if (dreamMatch) {
    profile.dreamVision = extractTextWithTimestamp(dreamMatch[1].trim());
  }

  // 當下動機
  const motivationMatch = body.match(/\*\*🎯 為什麼現在特別想學[^)]*\)\*\*\s*\n\s*(.+?)(?=\n\n|- \*\*)/);
  if (motivationMatch) {
    profile.motivation = extractTextWithTimestamp(motivationMatch[1].trim());
  }

  // 應用場景
  const useCaseMatch = body.match(/\*\*🎬 想把聲音用在哪裡[^)]*\)\*\*\s*\n\s*(.+?)(?=\n\n|- \*\*)/);
  if (useCaseMatch) {
    profile.useCase = extractTextWithTimestamp(useCaseMatch[1].trim());
  }

  // 仍需補問
  const needsMatch = body.match(/\*\*📝 仍需補問\*\*\s*\n([\s\S]+?)(?=\n\n|$)/);
  if (needsMatch) {
    const needs = needsMatch[1]
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.replace(/^\s*-\s*/, '').trim());
    profile.needsToAsk = needs;
  }

  return profile;
}

function parseAnalysisMarkdown(markdown: string): ParsedAnalysis {
  const sectionMap = extractSections(markdown);

  const profileTitle = Object.keys(sectionMap).find((title) =>
    title.includes('🧑‍🏫')
  );
  const metricsTitle = Object.keys(sectionMap).find((title) =>
    title.includes('🧮')
  );
  const missionsTitle = Object.keys(sectionMap).find((title) =>
    title.includes('🚀')
  );
  const scriptsTitle = Object.keys(sectionMap).find((title) =>
    title.includes('💬')
  );
  const probabilityTitle = Object.keys(sectionMap).find((title) =>
    title.startsWith('📈')
  );

  return {
    rawMarkdown: markdown,
    studentProfile: parseStudentProfile(profileTitle ? sectionMap[profileTitle] : undefined),
    metrics: parseMetrics(metricsTitle ? sectionMap[metricsTitle] : undefined),
    missions: parseMissions(missionsTitle ? sectionMap[missionsTitle] : undefined),
    scripts: parseScripts(scriptsTitle ? sectionMap[scriptsTitle] : undefined),
    probability: parseProbability(
      probabilityTitle,
      probabilityTitle ? sectionMap[probabilityTitle] : undefined
    ),
  };
}

function getMarkdownOutput(analysis: TeachingQualityAnalysisDetail | null) {
  if (!analysis) return null;
  const { conversion_suggestions: suggestions } = analysis;
  if (!suggestions) return null;
  if (isMarkdownSuggestion(suggestions)) {
    return suggestions.markdownOutput;
  }
  return null;
}

const markdownComponents: any = {
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc space-y-1 pl-6">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal space-y-1 pl-6">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="leading-relaxed">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="text-muted-foreground">{children}</em>
  ),
};

function MarkdownView({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  if (!content) return null;
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none text-foreground',
        className
      )}
    >
      <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
    </div>
  );
}

function TimestampLink({
  timestamp,
  onClick,
}: {
  timestamp?: string;
  onClick?: (timestamp: string) => void;
}) {
  if (!timestamp) return null;
  return (
    <button
      onClick={() => onClick?.(timestamp)}
      className="ml-1 inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200"
      title="點擊跳轉至逐字稿"
    >
      📍{timestamp}
    </button>
  );
}

function InfoWithTimestamp({
  text,
  timestamp,
  onTimestampClick,
  className,
}: {
  text: string;
  timestamp?: string;
  onTimestampClick?: (timestamp: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-1 flex-wrap", className)}>
      <span className="flex-1">{text}</span>
      <TimestampLink timestamp={timestamp} onClick={onTimestampClick} />
    </div>
  );
}

export default function TeachingQualityDetail() {
  const [, params] = useRoute('/teaching-quality/:id');
  const [, navigate] = useLocation();
  const analysisId = params?.id;

  const [analysis, setAnalysis] =
    useState<TeachingQualityAnalysisDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [copiedPlan, setCopiedPlan] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedProfile, setCopiedProfile] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [highlightedTimestamp, setHighlightedTimestamp] = useState<string | null>(null);

  useEffect(() => {
    if (analysisId) {
      void fetchAnalysisDetail();
    }
  }, [analysisId]);

  async function fetchAnalysisDetail() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/teaching-quality/analyses/${analysisId}`);
      if (!response.ok) throw new Error('Failed to fetch analysis');

      const data = await response.json();
      setAnalysis(data.data);
    } catch (err) {
      console.error('Error fetching analysis:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  const markdownOutput = useMemo(
    () => getMarkdownOutput(analysis),
    [analysis]
  );

  const parsedAnalysis = useMemo(
    () => (markdownOutput ? parseAnalysisMarkdown(markdownOutput) : null),
    [markdownOutput]
  );

  const newParsedAnalysis = useMemo(
    () => (markdownOutput ? parseTeachingAnalysisMarkdown(markdownOutput) : null),
    [markdownOutput]
  );

  const rawPlanText = useMemo(() => {
    if (parsedAnalysis) return parsedAnalysis.rawMarkdown;
    if (!analysis) return '尚無分析結果';
    return formatFallbackOutput(analysis.conversion_suggestions);
  }, [parsedAnalysis, analysis]);

  const probabilityFromData =
    analysis && isMarkdownSuggestion(analysis.conversion_suggestions)
      ? analysis.conversion_suggestions.conversionProbability
      : undefined;

  function formatFallbackOutput(rawSuggestions: any): string {
    if (!rawSuggestions) {
      return '無銷售分析資料（suggestions 是 null 或 undefined）';
    }

    if (typeof rawSuggestions === 'string') {
      return rawSuggestions;
    }

    try {
      return JSON.stringify(rawSuggestions, null, 2);
    } catch {
      return '無法顯示分析內容（JSON 解析失敗）';
    }
  }

  async function copyToClipboard(text: string, type: 'plan' | 'transcript' | 'profile') {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'plan') {
        setCopiedPlan(true);
        setTimeout(() => setCopiedPlan(false), 2000);
      } else if (type === 'transcript') {
        setCopiedTranscript(true);
        setTimeout(() => setCopiedTranscript(false), 2000);
      } else {
        setCopiedProfile(true);
        setTimeout(() => setCopiedProfile(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  function handleTimestampClick(timestamp: string) {
    setShowTranscript(true);
    setHighlightedTimestamp(timestamp);

    // 等待DOM更新後滾動並高亮
    setTimeout(() => {
      const transcriptSection = document.getElementById('transcript-section');
      if (transcriptSection) {
        transcriptSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // 尋找並滾動到對應時間戳
      const transcriptContent = document.getElementById('transcript-content');
      if (transcriptContent && analysis?.transcript_text) {
        const lines = analysis.transcript_text.split('\n');
        const targetLineIndex = lines.findIndex(line => line.includes(timestamp));

        if (targetLineIndex !== -1) {
          // 計算大約的滾動位置 (每行約 24px)
          const scrollPosition = targetLineIndex * 24;
          const transcriptPre = transcriptContent.querySelector('pre');
          if (transcriptPre) {
            transcriptPre.scrollTop = scrollPosition;
          }
        }
      }

      // 3秒後移除高亮
      setTimeout(() => setHighlightedTimestamp(null), 3000);
    }, 150);
  }

  if (loading) {
    return (
      <DashboardLayout sidebarSections={sidebarConfig}>
        <div className="flex h-64 items-center justify-center">
          <div className="text-lg text-muted-foreground">載入中...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !analysis) {
    return (
      <DashboardLayout sidebarSections={sidebarConfig}>
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <div className="text-lg text-red-600">載入失敗：{error || '找不到分析資料'}</div>
          <Button onClick={() => navigate('/teaching-quality')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回列表
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const probabilityValue =
    parsedAnalysis?.probability?.value ?? probabilityFromData;

  // 檢查是否有 AI 分析內容
  const hasValidAnalysis = markdownOutput && markdownOutput.length > 0;

  return (
    <DashboardLayout sidebarSections={sidebarConfig}>
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/teaching-quality')}
            className="w-fit"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回列表
          </Button>
          <h1 className="text-3xl font-bold">🎯 推課分析詳情</h1>
        </div>

        {/* 顯示基本資訊卡片（即使沒有 AI 分析也顯示） */}
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader className="space-y-4 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardTitle className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <span>🏆</span>
              推課戰績報告
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 px-3 py-1">
                👤 學員：{analysis.student_name}
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 px-3 py-1">
                👨‍🏫 教師：{analysis.teacher_name}
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 px-3 py-1">
                📅 課程日期：{new Date(analysis.class_date).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* 1. 教學評分 */}
              <div className="rounded-lg border-2 border-green-200 bg-gradient-to-br from-green-50 to-white p-5 shadow-md">
                <div className="text-xs font-semibold uppercase tracking-wide text-green-700">
                  教學評分
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-green-600">
                    {analysis.overall_score}
                  </span>
                  <span className="text-lg text-muted-foreground">/10</span>
                </div>
                <div className="mt-2 text-lg font-medium text-green-700">
                  {'★'.repeat(Math.round(analysis.overall_score / 2))}
                  {'☆'.repeat(5 - Math.round(analysis.overall_score / 2))}
                </div>
                <div className="mt-2 text-sm font-semibold text-green-800">
                  等級：{analysis.overall_score >= 9 ? 'S' : analysis.overall_score >= 7 ? 'A' : analysis.overall_score >= 5 ? 'B' : 'C'}
                </div>
              </div>

              {/* 2. 推課評分（使用新的 SalesScoreCard 組件） */}
              {newParsedAnalysis && newParsedAnalysis.scoreMetrics && newParsedAnalysis.scoreMetrics.length > 0 ? (
                <SalesScoreCard
                  totalScore={newParsedAnalysis.totalScore}
                  maxTotalScore={newParsedAnalysis.maxTotalScore}
                  metrics={newParsedAnalysis.scoreMetrics}
                  summary={newParsedAnalysis.scoreSummary}
                  onTimestampClick={handleTimestampClick}
                />
              ) : (
                <div className="rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5 shadow-md">
                  <div className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                    推課評分
                  </div>
                  <div className="mt-3 flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">尚無評分資料</span>
                  </div>
                </div>
              )}

              {/* 3. AI 預估成交率 */}
              <div className="rounded-lg border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white p-5 shadow-md">
                <div className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                  AI 預估成交率
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-orange-600">
                    {probabilityValue !== undefined ? probabilityValue : '—'}
                  </span>
                  {probabilityValue !== undefined && (
                    <span className="text-lg text-muted-foreground">%</span>
                  )}
                </div>
                {probabilityValue !== undefined && (
                  <div className="mt-2 text-sm font-semibold text-orange-800">
                    等級：{probabilityValue >= 80 ? '極高' : probabilityValue >= 60 ? '高' : probabilityValue >= 40 ? '中等' : probabilityValue >= 20 ? '偏低' : '低'}
                  </div>
                )}
              </div>

              {/* 4. 課程資訊 */}
              <div className="rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-md">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  課程資訊
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">方案：</span>
                    <span className="font-medium">{analysis.purchased_package || '待確認'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">剩餘：</span>
                    <span className="font-medium">
                      {analysis.remaining_lessons !== null && analysis.remaining_lessons !== undefined
                        ? `${analysis.remaining_lessons} 堂`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">轉換：</span>
                    <Badge
                      className={cn(
                        getConversionStatusColor(analysis.conversion_status),
                        'px-2 py-0.5 text-xs'
                      )}
                    >
                      {getConversionStatusLabel(analysis.conversion_status)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 右下角浮動 AI 策略助手 */}
        <FloatingAIChat
          studentEmail={analysis.student_email || `${analysis.student_name}@example.com`}
          studentName={analysis.student_name}
          totalClasses={1}
          totalConsultations={0}
        />

        {/* 如果沒有 AI 分析內容，顯示錯誤訊息 */}
        {!hasValidAnalysis ? (
          <Card className="border-2 border-yellow-300 bg-yellow-50 shadow-md">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="text-6xl">⚠️</div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-yellow-800 mb-2">AI 分析內容不完整</h3>
                <p className="text-yellow-700 mb-4">
                  這筆分析記錄的 AI 推課建議內容為空，可能是分析過程中發生錯誤。
                </p>
                <p className="text-sm text-yellow-600 mb-6">
                  分析 ID: {analysis.id}
                </p>
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => navigate('/teaching-quality')}
                    variant="outline"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    返回列表
                  </Button>
                  <Button
                    onClick={() => window.location.reload()}
                  >
                    重新載入
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : parsedAnalysis ? (
          <>


            {/* 學員檔案卡 - 完整結構化資訊 */}
            {parsedAnalysis?.studentProfile && (
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-foreground">
                      👤 學員檔案卡（快速掌握對象）
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      完整的學員背景、痛點、動機與夢想分析
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const profile = parsedAnalysis.studentProfile;
                      if (profile) {
                        const text = `# 學員檔案 - ${analysis.student_name}\n\n## 基本資料\n${profile.basicInfo.ageGenderOccupation || '待補問'}\n決策權：${profile.basicInfo.decisionMaker?.text || '未提供'}\n付費能力：${profile.basicInfo.paymentCapacity?.text || '未提供'}\n\n## 聲音現況\n${profile.voiceStatus?.text || '未提供'}\n\n## 過去嘗試\n${profile.pastAttempts?.map(a => `- ${a.text}`).join('\n') || '未提供'}\n\n## 現在最卡\n${profile.currentPainPoints?.map(p => `- ${p.text}`).join('\n') || '未提供'}\n\n## 夢想目標\n${profile.dreamVision?.text || '未提供'}\n\n## 當下動機\n${profile.motivation?.text || '未提供'}\n\n## 應用場景\n${profile.useCase?.text || '未提供'}`;
                        copyToClipboard(text, 'profile');
                      }
                    }}
                    className="gap-2"
                  >
                    {copiedProfile ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        已複製
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        複製檔案
                      </>
                    )}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 基本資料 */}
                  <div className="rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5">
                    <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground">
                      <span>📇</span>基本資料
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium text-muted-foreground">年齡 / 性別 / 職業：</span>
                        <div className={cn(
                          "mt-1 font-semibold",
                          parsedAnalysis.studentProfile.basicInfo.ageGenderOccupation?.includes('待補問') || parsedAnalysis.studentProfile.basicInfo.ageGenderOccupation?.includes('未明確')
                            ? "text-yellow-600"
                            : "text-foreground"
                        )}>
                          {parsedAnalysis.studentProfile.basicInfo.ageGenderOccupation || '待補問'}
                        </div>
                      </div>
                      {parsedAnalysis.studentProfile.basicInfo.decisionMaker && (
                        <div>
                          <span className="font-medium text-muted-foreground">🔑 決策權：</span>
                          <div className="mt-1 font-semibold text-foreground">
                            <InfoWithTimestamp
                              text={parsedAnalysis.studentProfile.basicInfo.decisionMaker.text}
                              timestamp={parsedAnalysis.studentProfile.basicInfo.decisionMaker.timestamp}
                              onTimestampClick={handleTimestampClick}
                            />
                          </div>
                        </div>
                      )}
                      {parsedAnalysis.studentProfile.basicInfo.paymentCapacity && (
                        <div>
                          <span className="font-medium text-muted-foreground">💰 付費能力：</span>
                          <div className="mt-1 font-semibold text-foreground">
                            <InfoWithTimestamp
                              text={parsedAnalysis.studentProfile.basicInfo.paymentCapacity.text}
                              timestamp={parsedAnalysis.studentProfile.basicInfo.paymentCapacity.timestamp}
                              onTimestampClick={handleTimestampClick}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 痛點與問題 */}
                  <div className="rounded-lg border-2 border-red-200 bg-gradient-to-br from-red-50 to-white p-5">
                    <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground">
                      <span>⛔️</span>痛點與問題
                    </h3>
                    <div className="space-y-4 text-sm">
                      {parsedAnalysis.studentProfile.voiceStatus && (
                        <div>
                          <span className="font-medium text-red-700">🎤 聲音現況：</span>
                          <div className="mt-1 font-semibold text-foreground">
                            <InfoWithTimestamp
                              text={parsedAnalysis.studentProfile.voiceStatus.text}
                              timestamp={parsedAnalysis.studentProfile.voiceStatus.timestamp}
                              onTimestampClick={handleTimestampClick}
                            />
                          </div>
                        </div>
                      )}
                      {parsedAnalysis.studentProfile.currentPainPoints && parsedAnalysis.studentProfile.currentPainPoints.length > 0 && (
                        <div>
                          <span className="font-medium text-red-700">❌ 現在最卡：</span>
                          <ul className="mt-2 space-y-2">
                            {parsedAnalysis.studentProfile.currentPainPoints.map((pain, index) => (
                              <li key={index} className="font-semibold text-foreground">
                                <InfoWithTimestamp
                                  text={`• ${pain.text}`}
                                  timestamp={pain.timestamp}
                                  onTimestampClick={handleTimestampClick}
                                />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {parsedAnalysis.studentProfile.pastAttempts && parsedAnalysis.studentProfile.pastAttempts.length > 0 && (
                        <div>
                          <span className="font-medium text-muted-foreground">📚 過去嘗試：</span>
                          <ul className="mt-2 space-y-2">
                            {parsedAnalysis.studentProfile.pastAttempts.map((attempt, index) => (
                              <li key={index} className="font-semibold text-foreground">
                                <InfoWithTimestamp
                                  text={`• ${attempt.text}`}
                                  timestamp={attempt.timestamp}
                                  onTimestampClick={handleTimestampClick}
                                />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 夢想與動機 */}
                  <div className="rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5">
                    <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground">
                      <span>🏁</span>夢想與動機
                    </h3>
                    <div className="space-y-4 text-sm">
                      {parsedAnalysis.studentProfile.dreamVision && (
                        <div>
                          <span className="font-medium text-purple-700">🌟 目標畫面：</span>
                          <div className="mt-2 rounded-md bg-white p-3 shadow-sm">
                            <div className="font-semibold italic text-foreground">
                              <InfoWithTimestamp
                                text={`"${parsedAnalysis.studentProfile.dreamVision.text}"`}
                                timestamp={parsedAnalysis.studentProfile.dreamVision.timestamp}
                                onTimestampClick={handleTimestampClick}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      {parsedAnalysis.studentProfile.motivation && (
                        <div>
                          <span className="font-medium text-purple-700">💡 當下動機：</span>
                          <div className="mt-1 font-semibold text-foreground">
                            <InfoWithTimestamp
                              text={parsedAnalysis.studentProfile.motivation.text}
                              timestamp={parsedAnalysis.studentProfile.motivation.timestamp}
                              onTimestampClick={handleTimestampClick}
                            />
                          </div>
                        </div>
                      )}
                      {parsedAnalysis.studentProfile.useCase && (
                        <div>
                          <span className="font-medium text-purple-700">🎬 應用場景：</span>
                          <div className="mt-1 font-semibold text-foreground">
                            <InfoWithTimestamp
                              text={parsedAnalysis.studentProfile.useCase.text}
                              timestamp={parsedAnalysis.studentProfile.useCase.timestamp}
                              onTimestampClick={handleTimestampClick}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 仍需補問 */}
                  {parsedAnalysis.studentProfile.needsToAsk && parsedAnalysis.studentProfile.needsToAsk.length > 0 && (
                    <div className="rounded-lg border-2 border-yellow-300 bg-yellow-50 p-4">
                      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-yellow-800">
                        <span>⚠️</span>還需要補問的資訊：
                      </h3>
                      <ul className="list-inside list-disc space-y-1 text-sm text-yellow-700">
                        {parsedAnalysis.studentProfile.needsToAsk.map((item, index) => (
                          <li key={index} className="font-medium">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 💔 深層痛點分析（5 層次） */}
            {newParsedAnalysis && newParsedAnalysis.painPoints && newParsedAnalysis.painPoints.length > 0 && (
              <PainPointsSection
                painPoints={newParsedAnalysis.painPoints}
                onTimestampClick={handleTimestampClick}
              />
            )}

            {/* 💬 完整成交話術總結 */}
            {newParsedAnalysis && newParsedAnalysis.salesScripts && newParsedAnalysis.salesScripts.length > 0 && (
              <SalesScriptsSection
                scripts={newParsedAnalysis.salesScripts}
                studentType={newParsedAnalysis.studentType}
              />
            )}

            {/* 原始 Markdown 報告 */}
            <Card className="shadow-sm">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ClipboardCopy className="h-5 w-5 text-primary" />
                  原始 Markdown 報告
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(rawPlanText, 'plan')}
                    className="gap-2"
                  >
                    {copiedPlan ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        已複製
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        複製
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRaw((prev) => !prev)}
                  >
                    {showRaw ? '收合' : '展開'}
                  </Button>
                </div>
              </CardHeader>
              {showRaw && (
                <CardContent>
                  <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
                    {rawPlanText}
                  </pre>
                </CardContent>
              )}
            </Card>
          </>
        ) : (
          <Card className="shadow-sm">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5 text-primary" />
                GPT 銷售分析（原始輸出）
              </CardTitle>
              <Button
                onClick={() => copyToClipboard(rawPlanText, 'plan')}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {copiedPlan ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    已複製
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    複製全文
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
                {rawPlanText}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* 完整逐字稿 - 支援時間戳高亮 */}
        <Card id="transcript-section" className="shadow-sm">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              📝 完整逐字稿
            </CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={() => copyToClipboard(analysis.transcript_text, 'transcript')}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {copiedTranscript ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    已複製
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    複製全文
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTranscript((prev) => !prev)}
              >
                {showTranscript ? '收合' : '展開'}
              </Button>
            </div>
          </CardHeader>
          {showTranscript && (
            <CardContent id="transcript-content">
              <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
                {analysis.transcript_text.split('\n').map((line, index) => {
                  const isHighlighted = highlightedTimestamp && line.includes(highlightedTimestamp);
                  return (
                    <div
                      key={index}
                      className={cn(
                        "transition-colors duration-300",
                        isHighlighted && "bg-yellow-200 font-semibold text-foreground"
                      )}
                    >
                      {line}
                    </div>
                  );
                })}
              </pre>
            </CardContent>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

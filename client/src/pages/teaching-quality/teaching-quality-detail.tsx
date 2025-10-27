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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCopy,
  Copy,
  FileText,
  MessageSquare,
  Info,
  ChevronDown,
  ChevronUp,
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
import { TeachingScoreCard } from '@/components/teaching-quality/teaching-score-card';
import { TeachingScoresDetailSection } from '@/components/teaching-quality/teaching-scores-detail-section';
import { SalesScoresDetailSection } from '@/components/teaching-quality/sales-scores-detail-section';
import { FloatingAIChat } from '@/components/teaching-quality/floating-ai-chat';
import { parseTeachingAnalysisMarkdown } from '@/lib/parse-teaching-analysis';
import { calculateOverallScore, getGradeColor } from '@/lib/calculate-overall-score';

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
  const [reanalyzing, setReanalyzing] = useState(false);

  const [copiedPlan, setCopiedPlan] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedProfile, setCopiedProfile] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [highlightedTimestamp, setHighlightedTimestamp] = useState<string | null>(null);

  // 收合狀態控制（預設：學員檔案卡、推課話術總結 展開；教學品質、成交策略 收合）
  const [showStudentProfile, setShowStudentProfile] = useState(true);
  const [showTeachingScoresDetail, setShowTeachingScoresDetail] = useState(false);
  const [showSalesScoresDetail, setShowSalesScoresDetail] = useState(false);
  const [showSalesScripts, setShowSalesScripts] = useState(true);

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

  async function handleReanalyze() {
    if (!analysis?.attendance_id) return;

    const confirmed = window.confirm('確定要重新分析此記錄嗎？這將覆蓋現有的分析結果。');
    if (!confirmed) return;

    try {
      setReanalyzing(true);
      const response = await fetch(`/api/teaching-quality/reanalyze/${analysisId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '重新分析失敗');
      }

      // 重新分析成功，完整重新載入頁面以顯示最新結果
      alert('重新分析完成！頁面即將重新載入。');
      window.location.reload();
    } catch (err) {
      console.error('Error reanalyzing:', err);
      alert(err instanceof Error ? err.message : '重新分析失敗');
      setReanalyzing(false);
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
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-2xl font-bold text-foreground">
                <span>🏆</span>
                推課戰績報告
              </CardTitle>

              {/* 整體評分顯示（右上角） */}
              {newParsedAnalysis && newParsedAnalysis.teachingTotalScore > 0 && newParsedAnalysis.salesTotalScore > 0 && newParsedAnalysis.probability > 0 && (() => {
                const overallScore = calculateOverallScore(
                  newParsedAnalysis.teachingTotalScore,
                  newParsedAnalysis.salesTotalScore,
                  newParsedAnalysis.probability
                );
                return (
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">整體評分</div>
                      <div className="flex items-center gap-2">
                        <div className="text-3xl font-bold text-foreground">
                          {overallScore.score}
                          <span className="text-lg text-muted-foreground">/100</span>
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-3">
                              <div className="font-semibold text-sm border-b pb-2">
                                評分細項（總分 {overallScore.score}/100）
                              </div>

                              {/* 教學貢獻 */}
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">📚 教學貢獻 (30%)</span>
                                  <span className="font-bold text-blue-600">
                                    {Math.round(overallScore.breakdown.teaching)}/30
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  來源：教學評分 {newParsedAnalysis.teachingTotalScore}/25
                                </div>
                              </div>

                              {/* 推課貢獻 */}
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">🎯 推課貢獻 (30%)</span>
                                  <span className="font-bold text-purple-600">
                                    {Math.round(overallScore.breakdown.sales)}/30
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  來源：推課評分 {newParsedAnalysis.salesTotalScore}/25
                                </div>
                              </div>

                              {/* 成交貢獻 */}
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">💰 成交貢獻 (40%)</span>
                                  <span className="font-bold text-orange-600">
                                    {Math.round(overallScore.breakdown.conversion)}/40
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  來源：AI 預估成交率 {newParsedAnalysis.probability}%
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <Badge className={cn("h-12 px-4 text-lg font-bold", getGradeColor(overallScore.grade))}>
                      {overallScore.grade}
                    </Badge>
                  </div>
                );
              })()}
            </div>
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
              {/* 1. 教學評分（使用新的 TeachingScoreCard 組件） */}
              {newParsedAnalysis && newParsedAnalysis.teachingMetrics && newParsedAnalysis.teachingMetrics.length > 0 ? (
                <TeachingScoreCard
                  metrics={newParsedAnalysis.teachingMetrics}
                  totalScore={newParsedAnalysis.teachingTotalScore}
                  maxScore={newParsedAnalysis.teachingMaxScore}
                  onTimestampClick={handleTimestampClick}
                  onClick={() => {
                    const element = document.getElementById('teaching-scores-detail');
                    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                />
              ) : (
                <div className="rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-md">
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    教學評分
                  </div>
                  <div className="mt-3 flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">尚無評分資料</span>
                  </div>
                </div>
              )}

              {/* 2. 推課評分（使用新的 SalesScoreCard 組件） */}
              {newParsedAnalysis && newParsedAnalysis.salesMetrics && newParsedAnalysis.salesMetrics.length > 0 ? (
                <SalesScoreCard
                  totalScore={newParsedAnalysis.salesTotalScore}
                  maxTotalScore={newParsedAnalysis.salesMaxScore}
                  metrics={newParsedAnalysis.salesMetrics}
                  summary={newParsedAnalysis.scoreSummary}
                  onTimestampClick={handleTimestampClick}
                  onClick={() => {
                    const element = document.getElementById('sales-scores-detail');
                    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
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

              {/* 3. AI 預估成交率（統一風格） */}
              <Card className="border-2 border-orange-500/30 bg-gradient-to-br from-orange-50 to-white">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="text-orange-600">📊</span>
                    預估成交率
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-4xl font-bold text-orange-600">
                        {probabilityValue !== undefined ? probabilityValue : '—'}
                        {probabilityValue !== undefined && (
                          <span className="text-2xl text-muted-foreground">%</span>
                        )}
                      </div>
                      {probabilityValue !== undefined && (
                        <Badge className="mt-2" variant="secondary">
                          {probabilityValue >= 80 ? '極高' : probabilityValue >= 60 ? '高' : probabilityValue >= 40 ? '中等' : probabilityValue >= 20 ? '偏低' : '低'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 4. 課程資訊（統一風格） */}
              <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-50 to-white">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="text-green-600">📚</span>
                    課程資訊
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">方案：</span>
                      <span className="font-semibold">{analysis.purchased_package || '待確認'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">剩餘：</span>
                      <span className="font-semibold">
                        {analysis.remaining_lessons !== null && analysis.remaining_lessons !== undefined
                          ? `${analysis.remaining_lessons} 堂`
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
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
                </CardContent>
              </Card>
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
                    onClick={handleReanalyze}
                    disabled={reanalyzing}
                  >
                    {reanalyzing ? '分析中...' : '重新分析'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : parsedAnalysis ? (
          <>


            {/* 學員檔案卡 - 完整結構化資訊 (NEW FORMAT) */}
            {newParsedAnalysis?.studentProfile && (
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div className="space-y-1.5">
                    <CardTitle className="text-lg font-semibold text-foreground">
                      👤 學員檔案卡（快速掌握對象）
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      從對話中推斷的生活型態、練習環境、購課決策與學習動機
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const profile = newParsedAnalysis.studentProfile;
                        if (profile) {
                          const text = `# 學員檔案 - ${analysis.student_name}\n\n## 基本資料\n${profile.lifestyle?.map(l => `- ${l.text}`).join('\n') || '未提供'}\n\n## 練習環境\n${profile.environment?.map(e => `- ${e.text}`).join('\n') || '未提供'}\n\n## 購課決策\n${profile.purchaseDecision?.map(p => `- ${p.text}`).join('\n') || '未提供'}\n${profile.pushNote ? `\n推斷說明：${profile.pushNote}` : ''}\n\n## 聲音現況\n${profile.voiceStatus?.text || '未提供'}\n\n## 過去嘗試\n${profile.pastAttempts?.map(a => `- ${a.text}`).join('\n') || '未提供'}\n\n## 夢想目標\n${profile.dreamVision?.text || '未提供'}\n\n## 當下動機\n${profile.motivation?.text || '未提供'}\n\n## 應用場景\n${profile.useCase?.text || '未提供'}`;
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowStudentProfile(!showStudentProfile)}
                    >
                      {showStudentProfile ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                {showStudentProfile && (
                  <CardContent className="space-y-6">
                  {/* 基本資料 (生活型態、練習環境、購課決策) */}
                  <div className="rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5">
                    <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground">
                      <span>📇</span>基本資料（從對話中推斷生活型態）
                    </h3>
                    <div className="space-y-4 text-sm">
                      {newParsedAnalysis.studentProfile.lifestyle && newParsedAnalysis.studentProfile.lifestyle.length > 0 && (
                        <div>
                          <span className="font-semibold text-blue-700">生活型態與時間結構：</span>
                          <ul className="mt-2 space-y-1.5">
                            {newParsedAnalysis.studentProfile.lifestyle.map((item, index) => (
                              <li key={index} className="text-foreground">
                                <InfoWithTimestamp
                                  text={`• ${item.text}`}
                                  timestamp={item.timestamp}
                                  onTimestampClick={handleTimestampClick}
                                />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {newParsedAnalysis.studentProfile.environment && newParsedAnalysis.studentProfile.environment.length > 0 && (
                        <div>
                          <span className="font-semibold text-blue-700">練習環境與限制：</span>
                          <ul className="mt-2 space-y-1.5">
                            {newParsedAnalysis.studentProfile.environment.map((item, index) => (
                              <li key={index} className="text-foreground">
                                <InfoWithTimestamp
                                  text={`• ${item.text}`}
                                  timestamp={item.timestamp}
                                  onTimestampClick={handleTimestampClick}
                                />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {newParsedAnalysis.studentProfile.purchaseDecision && newParsedAnalysis.studentProfile.purchaseDecision.length > 0 && (
                        <div>
                          <span className="font-semibold text-blue-700">購課決策與付費指標：</span>
                          <ul className="mt-2 space-y-1.5">
                            {newParsedAnalysis.studentProfile.purchaseDecision.map((item, index) => (
                              <li key={index} className="text-foreground">
                                <InfoWithTimestamp
                                  text={`• ${item.text}`}
                                  timestamp={item.timestamp}
                                  onTimestampClick={handleTimestampClick}
                                />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {newParsedAnalysis.studentProfile.pushNote && (
                        <div className="mt-3 rounded-md bg-blue-100/50 p-3 text-sm italic text-blue-900">
                          💡 推斷說明：{newParsedAnalysis.studentProfile.pushNote}
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
                      {/* 五層痛點分析 */}
                      {newParsedAnalysis.painPoints && newParsedAnalysis.painPoints.length > 0 && (
                        <div className="space-y-3">
                          <div className="font-semibold text-red-700 border-b pb-2">
                            💔 深層痛點分析（銷售核心）
                          </div>
                          {newParsedAnalysis.painPoints.map((painPoint, index) => {
                            const levelColors: Record<string, string> = {
                              '目標層': 'bg-purple-50 border-purple-300 text-purple-800',
                              '社交層': 'bg-blue-50 border-blue-300 text-blue-800',
                              '情緒層': 'bg-red-50 border-red-300 text-red-800',
                              '環境層': 'bg-green-50 border-green-300 text-green-800',
                              '技術層': 'bg-gray-50 border-gray-300 text-gray-800',
                            };
                            const levelEmojis: Record<string, string> = {
                              '目標層': '🎯',
                              '社交層': '👥',
                              '情緒層': '💔',
                              '環境層': '🏠',
                              '技術層': '🔧',
                            };
                            const colorClass = levelColors[painPoint.level] || levelColors['技術層'];
                            const emoji = levelEmojis[painPoint.level] || '•';

                            return painPoint.isExplored ? (
                              <div key={index} className={`rounded-md border p-3 ${colorClass}`}>
                                <div className="font-semibold mb-1.5">
                                  {emoji} {painPoint.level}痛點
                                </div>
                                <div className="text-foreground space-y-2">
                                  <div>
                                    <span className="font-medium">內心痛點：</span>
                                    {painPoint.painDescription}
                                    {painPoint.timestamp && (
                                      <button
                                        onClick={() => handleTimestampClick(painPoint.timestamp!)}
                                        className="ml-2 inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-200"
                                      >
                                        📍{painPoint.timestamp}
                                      </button>
                                    )}
                                  </div>
                                  {painPoint.evidence && (
                                    <div>
                                      <span className="font-medium">行為證據：</span>
                                      {painPoint.evidence}
                                    </div>
                                  )}
                                  <div className="bg-white/70 rounded p-2 border border-green-300">
                                    <span className="font-medium text-green-700">✅ 一對一教練價值：</span>
                                    <span className="text-foreground">{painPoint.coachingValue}</span>
                                  </div>
                                </div>
                              </div>
                            ) : null;
                          })}
                          {newParsedAnalysis.painPoints.some(p => !p.isExplored) && (
                            <div className="rounded-md bg-yellow-50 border border-yellow-300 p-3">
                              <div className="font-semibold text-yellow-800 mb-1">⚠️ 未探索的痛點層次：</div>
                              <ul className="text-yellow-700 space-y-1">
                                {newParsedAnalysis.painPoints.filter(p => !p.isExplored).map((p, i) => (
                                  <li key={i}>• {p.level}（建議補問）</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {newParsedAnalysis.studentProfile.voiceStatus && (
                        <div className="pt-3 border-t">
                          <span className="font-medium text-red-700">🎤 聲音現況：</span>
                          <div className="mt-1 font-semibold text-foreground">
                            <InfoWithTimestamp
                              text={newParsedAnalysis.studentProfile.voiceStatus.text}
                              timestamp={newParsedAnalysis.studentProfile.voiceStatus.timestamp}
                              onTimestampClick={handleTimestampClick}
                            />
                          </div>
                        </div>
                      )}
                      {newParsedAnalysis.studentProfile.pastAttempts && newParsedAnalysis.studentProfile.pastAttempts.length > 0 && (
                        <div>
                          <span className="font-medium text-muted-foreground">📚 過去嘗試：</span>
                          <ul className="mt-2 space-y-2">
                            {newParsedAnalysis.studentProfile.pastAttempts.map((attempt, index) => (
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
                      {newParsedAnalysis.studentProfile.dreamVision && (
                        <div>
                          <span className="font-medium text-purple-700">🌟 想成為什麼樣的自己：</span>
                          <div className="mt-2 rounded-md bg-white p-3 shadow-sm">
                            <div className="font-semibold italic text-foreground">
                              <InfoWithTimestamp
                                text={`"${newParsedAnalysis.studentProfile.dreamVision.text}"`}
                                timestamp={newParsedAnalysis.studentProfile.dreamVision.timestamp}
                                onTimestampClick={handleTimestampClick}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      {newParsedAnalysis.studentProfile.motivation && (
                        <div>
                          <span className="font-medium text-purple-700">💡 為什麼現在特別想學：</span>
                          <div className="mt-1 font-semibold text-foreground">
                            <InfoWithTimestamp
                              text={newParsedAnalysis.studentProfile.motivation.text}
                              timestamp={newParsedAnalysis.studentProfile.motivation.timestamp}
                              onTimestampClick={handleTimestampClick}
                            />
                          </div>
                        </div>
                      )}
                      {newParsedAnalysis.studentProfile.useCase && (
                        <div>
                          <span className="font-medium text-purple-700">🎬 想把聲音用在哪裡：</span>
                          <div className="mt-1 font-semibold text-foreground">
                            <InfoWithTimestamp
                              text={newParsedAnalysis.studentProfile.useCase.text}
                              timestamp={newParsedAnalysis.studentProfile.useCase.timestamp}
                              onTimestampClick={handleTimestampClick}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 仍需補問 */}
                  {newParsedAnalysis.studentProfile.needsToAsk && newParsedAnalysis.studentProfile.needsToAsk.length > 0 && (
                    <div className="rounded-lg border-2 border-yellow-300 bg-yellow-50 p-4">
                      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-yellow-800">
                        <span>⚠️</span>還需要補問的資訊：
                      </h3>
                      <ul className="list-inside list-disc space-y-1 text-sm text-yellow-700">
                        {newParsedAnalysis.studentProfile.needsToAsk.map((item, index) => (
                          <li key={index} className="font-medium">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
                )}
              </Card>
            )}

            {/* 💔 深層痛點分析（5 層次） */}
            {newParsedAnalysis && newParsedAnalysis.painPoints && newParsedAnalysis.painPoints.length > 0 && (
              <PainPointsSection
                painPoints={newParsedAnalysis.painPoints}
                onTimestampClick={handleTimestampClick}
              />
            )}

            {/* 📚 教學品質評估 - 5 大指標詳情 */}
            {newParsedAnalysis && newParsedAnalysis.teachingMetrics && newParsedAnalysis.teachingMetrics.length > 0 && (
              <TeachingScoresDetailSection
                metrics={newParsedAnalysis.teachingMetrics}
                totalScore={newParsedAnalysis.teachingTotalScore}
                maxScore={newParsedAnalysis.teachingMaxScore}
                onTimestampClick={handleTimestampClick}
              />
            )}

            {/* 🎯 成交策略評估 - 5 大指標詳情 */}
            {newParsedAnalysis && newParsedAnalysis.salesMetrics && newParsedAnalysis.salesMetrics.length > 0 && (
              <SalesScoresDetailSection
                metrics={newParsedAnalysis.salesMetrics}
                totalScore={newParsedAnalysis.salesTotalScore}
                maxScore={newParsedAnalysis.salesMaxScore}
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

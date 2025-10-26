/**
 * Sales Scripts Section Component
 *
 * Displays the 3 personalized sales scripts with sensory language
 * 完整成交話術總結組件（3 種版本）
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Copy,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface SalesScript {
  id: string;
  title: string; // 版本標題（例如：版本 A - 已付費/高投入型）
  body: string; // 話術內容（Markdown）
  targetAudience: string; // 目標受眾描述
  technique: string; // 使用的技巧（例如：價值重構、損失規避、未來錨定）
}

interface SalesScriptsSectionProps {
  scripts: SalesScript[];
  studentType?: string; // 學員類型（用於推薦哪個版本）
}

const SCRIPT_ICONS = {
  'A': Sparkles,
  'B': AlertTriangle,
  'C': Target,
};

const SCRIPT_COLORS = {
  'A': 'border-purple-300 bg-gradient-to-br from-purple-50 to-white',
  'B': 'border-orange-300 bg-gradient-to-br from-orange-50 to-white',
  'C': 'border-blue-300 bg-gradient-to-br from-blue-50 to-white',
};

const SCRIPT_TEXT_COLORS = {
  'A': 'text-purple-700',
  'B': 'text-orange-700',
  'C': 'text-blue-700',
};

const markdownComponents: any = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-4 text-base leading-relaxed text-foreground">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc space-y-2 pl-6 mb-4">{children}</ul>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-base leading-relaxed text-foreground">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-primary pl-4 italic text-base leading-relaxed text-foreground my-4">
      {children}
    </blockquote>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic text-muted-foreground">{children}</em>
  ),
};

function ScriptCard({ script }: { script: SalesScript }) {
  const [copied, setCopied] = useState(false);

  // Extract version letter from ID (e.g., "variant-1" -> "A")
  const versionLetter = script.id.includes('1') ? 'A' : script.id.includes('2') ? 'B' : 'C';
  const Icon = SCRIPT_ICONS[versionLetter as keyof typeof SCRIPT_ICONS] || Sparkles;
  const colorClass = SCRIPT_COLORS[versionLetter as keyof typeof SCRIPT_COLORS] || SCRIPT_COLORS.A;
  const textColor = SCRIPT_TEXT_COLORS[versionLetter as keyof typeof SCRIPT_TEXT_COLORS] || SCRIPT_TEXT_COLORS.A;

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(script.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  return (
    <div className={cn('rounded-lg border-2 p-6 shadow-sm', colorClass)}>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-white p-2 shadow-sm">
            <Icon className={cn('h-6 w-6', textColor)} />
          </div>
          <div>
            <h3 className={cn('text-lg font-bold', textColor)}>{script.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{script.targetAudience}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={copyToClipboard}
          className="gap-2 shrink-0"
        >
          {copied ? (
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
      </div>

      {/* Technique Badge */}
      <div className="mb-4">
        <Badge variant="outline" className={cn('text-xs', textColor, 'border-current')}>
          NLP 技巧：{script.technique}
        </Badge>
      </div>

      {/* Script Content */}
      <div className="rounded-lg border border-border/60 bg-white/80 p-6 shadow-sm">
        <div className="prose prose-base max-w-none">
          <ReactMarkdown components={markdownComponents}>{script.body}</ReactMarkdown>
        </div>
      </div>

      {/* Highlights */}
      <div className="mt-4 rounded-md bg-white/50 p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2">💡 使用指引</p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>✅ 包含感官小段（視覺、聽覺、動覺）</li>
          <li>✅ 結尾設計 Double Bind（雙重束縛）</li>
          <li>✅ 高度個人化，引用學員獨特情境</li>
          <li>✅ 連結深層痛點與一對一教練課程價值</li>
        </ul>
      </div>
    </div>
  );
}

export function SalesScriptsSection({ scripts, studentType }: SalesScriptsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true); // 預設展開
  const [copiedAll, setCopiedAll] = useState(false);

  async function copyAllScripts() {
    try {
      const allScripts = scripts
        .map((script, index) => {
          return `\n${'='.repeat(60)}\n${script.title}\n${'='.repeat(60)}\n\n${script.body}\n`;
        })
        .join('\n');
      await navigator.clipboard.writeText(allScripts);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">
              💬 完整成交話術總結（可照念）
            </CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              三種不同版本的推課話術，針對不同學員類型設計。每個版本都包含感官語言與 NLP 技巧，可根據情境靈活運用。
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={copyAllScripts}
              className="gap-2"
            >
              {copiedAll ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  已複製全部
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  複製全部話術
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
      <CardContent className="space-y-6">
        {/* Important Notice */}
        <div className="rounded-lg border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-white p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-orange-600" />
            <div className="flex-1">
              <p className="font-semibold text-orange-800 mb-2">⚠️ 推課方向</p>
              <div className="text-sm text-orange-700 space-y-2">
                <p className="font-medium">
                  必須推「<strong>升級到一對一教練課程</strong>」，不是推學員現有方案。
                </p>
                <div>
                  <p className="font-medium mb-1">核心價值：</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li><strong>隨時隨地練習</strong></li>
                    <li><strong>即時指導</strong></li>
                    <li><strong>練習頻率提升</strong></li>
                    <li><strong>確保做對</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Student Type Indicator */}
        {studentType && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm font-medium text-blue-800">
              📊 AI 推薦：此學員適合使用 <strong>{studentType}</strong>
            </p>
          </div>
        )}

        {/* Scripts Tabs */}
        <Tabs defaultValue={scripts[0]?.id} className="space-y-0">
          <TabsList className="grid w-full grid-cols-3 gap-2 bg-transparent p-0">
            {scripts.map((script, index) => {
              const versionLetter = script.id.includes('1') ? 'A' : script.id.includes('2') ? 'B' : 'C';
              const textColor = SCRIPT_TEXT_COLORS[versionLetter as keyof typeof SCRIPT_TEXT_COLORS];

              return (
                <TabsTrigger
                  key={script.id}
                  value={script.id}
                  className={cn(
                    'rounded-lg border-2 border-border/80 bg-background px-4 py-3 text-sm font-medium text-muted-foreground transition-all',
                    'data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:shadow-sm',
                    `data-[state=active]:${textColor}`
                  )}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-bold">版本 {versionLetter}</span>
                    <span className="text-xs">{script.technique}</span>
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {scripts.map((script) => (
            <TabsContent key={script.id} value={script.id} className="mt-8">
              <ScriptCard script={script} />
            </TabsContent>
          ))}
        </Tabs>

        {/* Key Principles */}
        <div className="rounded-lg border-2 border-green-300 bg-gradient-to-r from-green-50 to-white p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
            <div>
              <p className="font-semibold text-green-800">✅ 個人化要求（必須遵守）</p>
              <ul className="mt-2 space-y-1 text-sm text-green-700">
                <li>1. 開頭必須引用「該學員的獨特情境」（不是泛泛的痛點）</li>
                <li>2. 中段連結「深層痛點」與「一對一教練課程價值」</li>
                <li>3. 結尾的 Double Bind 要結合「該學員已展現的行為」</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
      )}
    </Card>
  );
}

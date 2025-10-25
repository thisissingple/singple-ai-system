/**
 * Sales Score Card Component
 *
 * Displays the sales strategy score with popup dialog details
 * 推課評分卡片組件（彈出視窗顯示 5 大指標）
 */

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  Target,
  TrendingUp,
  Zap,
  Heart,
  Clock,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';
import { useState } from 'react';

interface ScoreMetric {
  label: string;
  value: number;
  maxValue: number;
  evidence: string;
  reasoning?: string;
  timestamps?: string[];
}

interface SalesScoreCardProps {
  totalScore: number;
  maxTotalScore: number;
  metrics: ScoreMetric[];
  summary?: string;
  onTimestampClick?: (timestamp: string) => void;
}

const METRIC_ICONS = {
  '呼應痛點程度': Target,
  '推課引導力度': TrendingUp,
  'Double Bind / NLP 應用': Zap,
  '情緒共鳴與信任': Heart,
  '節奏與收斂完整度': Clock,
};

function getScoreColor(value: number, maxValue: number): string {
  const percentage = (value / maxValue) * 100;
  if (percentage >= 90) return 'text-green-600 bg-green-50 border-green-300';
  if (percentage >= 70) return 'text-blue-600 bg-blue-50 border-blue-300';
  if (percentage >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-300';
  if (percentage >= 30) return 'text-orange-600 bg-orange-50 border-orange-300';
  return 'text-red-600 bg-red-50 border-red-300';
}

function getScoreLabel(value: number, maxValue: number): string {
  const percentage = (value / maxValue) * 100;
  if (percentage >= 90) return '優秀';
  if (percentage >= 70) return '良好';
  if (percentage >= 50) return '尚可';
  if (percentage >= 30) return '需改進';
  return '急需改進';
}

function extractTimestamp(text: string): string | undefined {
  const match = text.match(/[（(]?(\d{2}:\d{2}:\d{2})[）)]?/);
  return match ? match[1] : undefined;
}

function TimestampBadge({
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
      className="ml-1 inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200"
      title="點擊跳轉至逐字稿"
    >
      📍{timestamp}
    </button>
  );
}

/**
 * Render text with clickable timestamps
 */
function TextWithTimestamps({
  text,
  onTimestampClick,
}: {
  text: string;
  onTimestampClick?: (timestamp: string) => void;
}) {
  // Split text by timestamps and render with clickable badges
  const timestampRegex = /[（(]?(\d{2}:\d{2}:\d{2})[）)]?/g;
  const parts: Array<{ type: 'text' | 'timestamp'; content: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = timestampRegex.exec(text)) !== null) {
    // Add text before timestamp
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }
    // Add timestamp
    parts.push({
      type: 'timestamp',
      content: match[1],
    });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return (
    <span>
      {parts.map((part, index) =>
        part.type === 'timestamp' ? (
          <TimestampBadge
            key={index}
            timestamp={part.content}
            onClick={onTimestampClick}
          />
        ) : (
          <span key={index}>{part.content}</span>
        )
      )}
    </span>
  );
}

export function SalesScoreCard({
  totalScore,
  maxTotalScore,
  metrics,
  summary,
  onTimestampClick,
}: SalesScoreCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const percentage = (totalScore / maxTotalScore) * 100;
  const scoreColor = getScoreColor(totalScore, maxTotalScore);
  const scoreLabel = getScoreLabel(totalScore, maxTotalScore);

  return (
    <div className="rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5 shadow-md">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-purple-700">
          推課評分
        </div>
        <Badge variant="outline" className={cn('text-xs', scoreColor)}>
          {scoreLabel}
        </Badge>
      </div>

      {/* Score Display */}
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-5xl font-bold text-purple-600">{totalScore}</span>
        <span className="text-lg text-muted-foreground">/{maxTotalScore}</span>
      </div>

      {/* Progress Bar */}
      <Progress value={percentage} className="mb-4 h-3" />

      {/* Dialog Trigger Button */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
          >
            <BarChart3 className="h-4 w-4" />
            <span>查看 5 大指標詳情</span>
          </Button>
        </DialogTrigger>

        {/* Dialog Content (Popup) */}
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BarChart3 className="h-6 w-6 text-purple-600" />
              推課評分詳細分析
            </DialogTitle>
          </DialogHeader>

          {/* Score Summary */}
          <div className="rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  總分
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-purple-600">
                    {totalScore}
                  </span>
                  <span className="text-xl text-muted-foreground">
                    /{maxTotalScore}
                  </span>
                </div>
              </div>
              <Badge variant="outline" className={cn('px-4 py-2 text-base', scoreColor)}>
                {scoreLabel}
              </Badge>
            </div>
            <Progress value={percentage} className="mt-3 h-3" />
          </div>

          {/* Metrics Details */}
          <div className="mt-4 space-y-4">
            {metrics.map((metric, index) => {
              const Icon =
                METRIC_ICONS[metric.label as keyof typeof METRIC_ICONS] ||
                CheckCircle2;
              const metricPercentage = (metric.value / metric.maxValue) * 100;
              const metricColor = getScoreColor(metric.value, metric.maxValue);

              return (
                <div
                  key={index}
                  className="rounded-lg border-2 border-border/60 bg-white p-4 shadow-sm"
                >
                  {/* Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-purple-100 p-2">
                        <Icon className="h-5 w-5 text-purple-600" />
                      </div>
                      <span className="text-base font-semibold text-foreground">
                        {metric.label}
                      </span>
                    </div>
                    <Badge variant="outline" className={cn('text-sm', metricColor)}>
                      {metric.value}/{metric.maxValue}
                    </Badge>
                  </div>

                  {/* Progress Bar */}
                  <Progress value={metricPercentage} className="mb-4 h-2.5" />

                  {/* Evidence */}
                  {metric.evidence && (
                    <div className="mb-3 text-sm">
                      <div className="mb-1 font-semibold text-foreground">證據：</div>
                      <div className="leading-relaxed text-muted-foreground">
                        <TextWithTimestamps
                          text={metric.evidence}
                          onTimestampClick={onTimestampClick}
                        />
                      </div>
                    </div>
                  )}

                  {/* Reasoning */}
                  {metric.reasoning && (
                    <div className="text-sm">
                      <div className="mb-1 font-semibold text-foreground">理由：</div>
                      <div className="leading-relaxed text-muted-foreground">
                        <TextWithTimestamps
                          text={metric.reasoning}
                          onTimestampClick={onTimestampClick}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary */}
          {summary && (
            <div className="mt-4 rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📝</span>
                <div className="flex-1">
                  <strong className="text-base font-bold text-foreground">
                    總評：
                  </strong>
                  <p className="mt-2 text-sm leading-relaxed text-foreground">
                    {summary}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

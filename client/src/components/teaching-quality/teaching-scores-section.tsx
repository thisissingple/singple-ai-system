/**
 * Teaching Scores Section Component
 *
 * Displays the 5 key metrics for sales strategy evaluation
 * 成交策略評估 - 5 大指標組件
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Target,
  TrendingUp,
  Zap,
  Heart,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface ScoreMetric {
  label: string; // 指標名稱
  value: number; // 分數（0-5）
  maxValue: number; // 最大值（通常是 5）
  evidence: string; // 證據說明
  timestamp?: string; // 時間戳
  criteria?: string; // 評分標準說明
}

interface TeachingScoresSectionProps {
  metrics: ScoreMetric[];
  totalScore: number; // 總分（例如：20/25）
  maxTotalScore: number; // 總分上限（例如：25）
  summary?: string; // 總評說明
  onTimestampClick?: (timestamp: string) => void;
}

const METRIC_ICONS = {
  '呼應痛點程度': Target,
  '推課引導力度': TrendingUp,
  'Double Bind / NLP 應用': Zap,
  '情緒共鳴與信任': Heart,
  '節奏與收斂完整度': Clock,
};

const METRIC_COLORS = {
  5: 'text-green-600 bg-green-50 border-green-300',
  4: 'text-blue-600 bg-blue-50 border-blue-300',
  3: 'text-yellow-600 bg-yellow-50 border-yellow-300',
  2: 'text-orange-600 bg-orange-50 border-orange-300',
  1: 'text-red-600 bg-red-50 border-red-300',
};

function getScoreColor(value: number, maxValue: number): string {
  const percentage = (value / maxValue) * 100;
  if (percentage >= 90) return METRIC_COLORS[5];
  if (percentage >= 70) return METRIC_COLORS[4];
  if (percentage >= 50) return METRIC_COLORS[3];
  if (percentage >= 30) return METRIC_COLORS[2];
  return METRIC_COLORS[1];
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
      className="ml-2 inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200"
      title="點擊跳轉至逐字稿"
    >
      📍{timestamp}
    </button>
  );
}

function MetricCard({
  metric,
  onTimestampClick,
}: {
  metric: ScoreMetric;
  onTimestampClick?: (timestamp: string) => void;
}) {
  const Icon =
    METRIC_ICONS[metric.label as keyof typeof METRIC_ICONS] || AlertCircle;
  const scoreColor = getScoreColor(metric.value, metric.maxValue);
  const scoreLabel = getScoreLabel(metric.value, metric.maxValue);
  const percentage = (metric.value / metric.maxValue) * 100;
  const extractedTimestamp = metric.timestamp || extractTimestamp(metric.evidence);

  return (
    <div className="rounded-lg border-2 border-border/80 bg-gradient-to-br from-background to-muted/20 p-5 shadow-sm transition-all hover:shadow-md">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">{metric.label}</h3>
            <Badge variant="outline" className={cn('mt-1 text-xs', scoreColor)}>
              {scoreLabel}
            </Badge>
          </div>
        </div>
      </div>

      {/* Score Display */}
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-4xl font-bold text-primary">{metric.value}</span>
        <span className="text-lg text-muted-foreground">/ {metric.maxValue}</span>
      </div>

      {/* Progress Bar */}
      <Progress value={percentage} className="mb-4 h-3" />

      {/* Evidence */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <CheckCircle2 className="h-3 w-3" />
          證據
        </div>
        <div className="flex flex-wrap items-start gap-1 rounded-md bg-muted/30 p-3 text-xs leading-relaxed text-foreground">
          <span>{metric.evidence}</span>
          <TimestampBadge timestamp={extractedTimestamp} onClick={onTimestampClick} />
        </div>
      </div>
    </div>
  );
}

export function TeachingScoresSection({
  metrics,
  totalScore,
  maxTotalScore,
  summary,
  onTimestampClick,
}: TeachingScoresSectionProps) {
  const totalPercentage = (totalScore / maxTotalScore) * 100;
  const totalScoreColor = getScoreColor(totalScore, maxTotalScore);
  const totalScoreLabel = getScoreLabel(totalScore, maxTotalScore);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">
              📊 成交策略評估（5 大指標）
            </CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              量化評估教學過程中的銷售策略應用，從痛點呼應到成交收斂的完整分析。
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-primary">{totalScore}</span>
              <span className="text-lg text-muted-foreground">/ {maxTotalScore}</span>
            </div>
            <Badge variant="outline" className={cn('text-sm', totalScoreColor)}>
              總評：{totalScoreLabel}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric, index) => (
            <MetricCard
              key={index}
              metric={metric}
              onTimestampClick={onTimestampClick}
            />
          ))}
        </div>

        {/* Total Score Progress */}
        <div className="rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">總分進度</h3>
            <span className="text-sm font-medium text-muted-foreground">
              {totalPercentage.toFixed(0)}%
            </span>
          </div>
          <Progress value={totalPercentage} className="mb-4 h-4" />
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-green-500 bg-green-50 text-green-700">
              優秀：≥ 90%
            </Badge>
            <Badge variant="outline" className="border-blue-500 bg-blue-50 text-blue-700">
              良好：70-89%
            </Badge>
            <Badge variant="outline" className="border-yellow-500 bg-yellow-50 text-yellow-700">
              尚可：50-69%
            </Badge>
            <Badge variant="outline" className="border-orange-500 bg-orange-50 text-orange-700">
              需改進：30-49%
            </Badge>
            <Badge variant="outline" className="border-red-500 bg-red-50 text-red-700">
              急需改進：&lt; 30%
            </Badge>
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div className="rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📝</span>
              <div className="flex-1">
                <strong className="block text-base font-bold text-foreground mb-2">
                  總評說明
                </strong>
                <p className="text-sm leading-relaxed text-foreground">{summary}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

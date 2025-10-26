/**
 * Teaching Score Card Component
 *
 * Displays 5 teaching quality metrics in a Dialog popup
 * Similar to SalesScoreCard but for teaching evaluation
 */

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { GraduationCap, BarChart3 } from 'lucide-react';

interface ScoreMetric {
  label: string;
  value: number;
  maxValue: number;
  evidence: string;
  reasoning?: string;
  timestamps?: string[];
}

interface TeachingScoreCardProps {
  metrics: ScoreMetric[];
  totalScore: number;
  maxScore: number;
  onTimestampClick?: (timestamp: string) => void;
  onClick?: () => void;
}

/**
 * Timestamp Badge Component (clickable)
 */
function TimestampBadge({
  timestamp,
  onClick,
}: {
  timestamp: string;
  onClick?: (timestamp: string) => void;
}) {
  return (
    <Badge
      variant="outline"
      className="cursor-pointer hover:bg-blue-100 hover:border-blue-500 transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(timestamp);
      }}
    >
      {timestamp}
    </Badge>
  );
}

/**
 * Parse text and render timestamps as clickable badges
 */
function TextWithTimestamps({
  text,
  onTimestampClick,
}: {
  text: string;
  onTimestampClick?: (timestamp: string) => void;
}) {
  const timestampRegex = /[（(]?(\d{2}:\d{2}:\d{2})[）)]?/g;
  const parts: Array<{ type: 'text' | 'timestamp'; content: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = timestampRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }
    parts.push({
      type: 'timestamp',
      content: match[1],
    });
    lastIndex = match.index + match[0].length;
  }

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

/**
 * Get color for score value
 */
function getScoreColor(value: number, maxValue: number): string {
  const percentage = (value / maxValue) * 100;
  if (percentage >= 90) return 'text-green-600';
  if (percentage >= 70) return 'text-blue-600';
  if (percentage >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Get rating label for score
 */
function getRatingLabel(value: number, maxValue: number): string {
  const percentage = (value / maxValue) * 100;
  if (percentage >= 90) return '優秀';
  if (percentage >= 70) return '良好';
  if (percentage >= 50) return '中等';
  return '需改進';
}

export function TeachingScoreCard({
  metrics,
  totalScore,
  maxScore,
  onTimestampClick,
  onClick,
}: TeachingScoreCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const percentage = (totalScore / maxScore) * 100;
  const colorClass = getScoreColor(totalScore, maxScore);
  const ratingLabel = getRatingLabel(totalScore, maxScore);

  return (
    <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <GraduationCap className="h-5 w-5 text-blue-600" />
          教學評分
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Score Display */}
        <div className="flex items-baseline justify-between">
          <div>
            <div className={`text-4xl font-bold ${colorClass}`}>
              {totalScore}
              <span className="text-2xl text-muted-foreground">/{maxScore}</span>
            </div>
            <Badge className="mt-2" variant="secondary">
              {ratingLabel}
            </Badge>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>教學品質</span>
            <span>{percentage.toFixed(0)}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>

        {/* View Details Button */}
        {onClick ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-2"
            onClick={onClick}
          >
            <BarChart3 className="h-4 w-4" />
            <span>查看 5 大指標詳情</span>
          </Button>
        ) : (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full gap-2">
                <BarChart3 className="h-4 w-4" />
                <span>查看 5 大指標詳情</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                教學品質評估 - 5 大指標
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Metrics */}
              {metrics.map((metric, index) => {
                const metricPercentage = (metric.value / metric.maxValue) * 100;
                const metricColor = getScoreColor(metric.value, metric.maxValue);

                return (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-base">
                        <span>{metric.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-2xl font-bold ${metricColor}`}>
                            {metric.value}
                          </span>
                          <span className="text-lg text-muted-foreground">
                            /{metric.maxValue}
                          </span>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Progress Bar */}
                      <Progress value={metricPercentage} className="h-2" />

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
                    </CardContent>
                  </Card>
                );
              })}

              {/* Total Summary */}
              <Card className="border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-white">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>教學品質總分</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-3xl font-bold ${colorClass}`}>
                        {totalScore}
                      </span>
                      <span className="text-xl text-muted-foreground">
                        /{maxScore}
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Progress value={percentage} className="h-3" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <Badge variant="secondary">{ratingLabel}</Badge>
                      <span>{percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Conversion Probability Section Component
 *
 * Displays the conversion probability with detailed calculation breakdown
 * 成交機率儀表板組件
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ProbabilityFactor {
  type: 'add' | 'subtract' | 'base';
  label: string;
  value: number; // 加分或減分的百分比
  description: string;
  isApplied: boolean; // 是否符合此項
}

interface ConversionProbabilitySectionProps {
  probability: number; // 總成交機率（0-100）
  factors?: ProbabilityFactor[]; // 各項加減分因素
  reasoning?: string; // 推理說明（Markdown）
  onTimestampClick?: (timestamp: string) => void;
}

function getProbabilityColor(probability: number): string {
  if (probability >= 80) return 'text-green-600 bg-green-50 border-green-300';
  if (probability >= 60) return 'text-blue-600 bg-blue-50 border-blue-300';
  if (probability >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-300';
  if (probability >= 20) return 'text-orange-600 bg-orange-50 border-orange-300';
  return 'text-red-600 bg-red-50 border-red-300';
}

function getProbabilityLabel(probability: number): string {
  if (probability >= 80) return '極高';
  if (probability >= 60) return '高';
  if (probability >= 40) return '中等';
  if (probability >= 20) return '偏低';
  return '低';
}

function ProbabilityGauge({ probability }: { probability: number }) {
  const colorClass = getProbabilityColor(probability);
  const label = getProbabilityLabel(probability);

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Circular Gauge */}
      <div className="relative mb-4 h-48 w-48">
        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
          {/* Background Circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
          />
          {/* Progress Circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeDasharray={`${probability * 2.51} 251`}
            strokeLinecap="round"
            className={cn(
              'transition-all duration-1000',
              probability >= 80 ? 'text-green-500' :
              probability >= 60 ? 'text-blue-500' :
              probability >= 40 ? 'text-yellow-500' :
              probability >= 20 ? 'text-orange-500' :
              'text-red-500'
            )}
          />
        </svg>
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold text-foreground">{probability}%</span>
          <span className="mt-1 text-sm font-medium text-muted-foreground">{label}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full">
        <Progress value={probability} className="h-4" />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}

function FactorCard({ factor }: { factor: ProbabilityFactor }) {
  const Icon =
    factor.type === 'add' ? CheckCircle2 :
    factor.type === 'subtract' ? XCircle :
    Minus;

  const iconColor =
    factor.type === 'add' ? 'text-green-600' :
    factor.type === 'subtract' ? 'text-red-600' :
    'text-gray-600';

  const borderColor =
    factor.type === 'add' ? 'border-green-200' :
    factor.type === 'subtract' ? 'border-red-200' :
    'border-gray-200';

  const bgColor =
    factor.type === 'add' ? 'from-green-50 to-white' :
    factor.type === 'subtract' ? 'from-red-50 to-white' :
    'from-gray-50 to-white';

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border-2 bg-gradient-to-br p-4 shadow-sm',
        borderColor,
        bgColor,
        !factor.isApplied && 'opacity-40'
      )}
    >
      <div className={cn('mt-0.5 shrink-0', iconColor)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-foreground">{factor.label}</span>
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              factor.type === 'add' && 'border-green-500 bg-green-50 text-green-700',
              factor.type === 'subtract' && 'border-red-500 bg-red-50 text-red-700',
              factor.type === 'base' && 'border-gray-500 bg-gray-50 text-gray-700'
            )}
          >
            {factor.type === 'add' && '+'}
            {factor.type === 'subtract' && '-'}
            {factor.value}%
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{factor.description}</p>
        {!factor.isApplied && (
          <p className="mt-1 text-xs text-yellow-700">❌ 此項未達成</p>
        )}
      </div>
    </div>
  );
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
    <p className="mb-2 leading-relaxed">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
};

export function ConversionProbabilitySection({
  probability,
  factors,
  reasoning,
  onTimestampClick,
}: ConversionProbabilitySectionProps) {
  const colorClass = getProbabilityColor(probability);

  const addFactors = factors?.filter((f) => f.type === 'add' && f.isApplied) || [];
  const subtractFactors = factors?.filter((f) => f.type === 'subtract' && f.isApplied) || [];
  const missedFactors = factors?.filter((f) => !f.isApplied) || [];

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">
              📈 預估成交機率（量化指標計算）
            </CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              基於學員行為、互動頻率、購課狀態等多項指標進行量化評估。
            </p>
          </div>
          <Badge variant="outline" className={cn('text-base font-bold', colorClass)}>
            {probability}% ({getProbabilityLabel(probability)})
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Gauge Display */}
        <div className="flex justify-center">
          <ProbabilityGauge probability={probability} />
        </div>

        {/* Factors Breakdown */}
        {factors && factors.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground">計算公式拆解</h3>

            {/* Base Score */}
            {factors.filter((f) => f.type === 'base').map((factor, index) => (
              <FactorCard key={`base-${index}`} factor={factor} />
            ))}

            {/* Add Factors */}
            {addFactors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                  <TrendingUp className="h-4 w-4" />
                  加分項（已達成）
                </div>
                {addFactors.map((factor, index) => (
                  <FactorCard key={`add-${index}`} factor={factor} />
                ))}
              </div>
            )}

            {/* Subtract Factors */}
            {subtractFactors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
                  <TrendingDown className="h-4 w-4" />
                  減分項（已觸發）
                </div>
                {subtractFactors.map((factor, index) => (
                  <FactorCard key={`subtract-${index}`} factor={factor} />
                ))}
              </div>
            )}

            {/* Missed Factors */}
            {missedFactors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-yellow-700">
                  <AlertCircle className="h-4 w-4" />
                  尚未達成的項目（可改進空間）
                </div>
                {missedFactors.map((factor, index) => (
                  <FactorCard key={`missed-${index}`} factor={factor} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reasoning (Markdown) */}
        {reasoning && (
          <div className="rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div className="flex-1">
                <strong className="block text-base font-bold text-foreground mb-3">
                  AI 推理說明
                </strong>
                <div className="prose prose-sm max-w-none text-foreground">
                  <ReactMarkdown components={markdownComponents}>
                    {reasoning}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

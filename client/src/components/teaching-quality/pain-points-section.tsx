/**
 * Pain Points Section Component
 *
 * Displays the 5-layer deep pain point analysis from GPT teaching quality analysis
 * 5層次深層痛點分析組件
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Target,
  Users,
  Heart,
  Home,
  Wrench,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface PainPoint {
  level: string; // 層次名稱
  painDescription: string; // 內心痛點
  evidence?: string; // 行為證據
  timestamp?: string; // 時間戳
  coachingValue: string; // 一對一教練價值
  isExplored: boolean; // 是否已探索
  needsToAsk?: string; // 需要補問的問題
}

interface PainPointsSectionProps {
  painPoints: PainPoint[];
  onTimestampClick?: (timestamp: string) => void;
}

const PAIN_POINT_ICONS = {
  '目標層': Target,
  '社交層': Users,
  '情緒層': Heart,
  '環境層': Home,
  '技術層': Wrench,
};

const PAIN_POINT_COLORS = {
  '目標層': 'border-purple-300 bg-gradient-to-br from-purple-50 to-white',
  '社交層': 'border-blue-300 bg-gradient-to-br from-blue-50 to-white',
  '情緒層': 'border-red-300 bg-gradient-to-br from-red-50 to-white',
  '環境層': 'border-green-300 bg-gradient-to-br from-green-50 to-white',
  '技術層': 'border-gray-300 bg-gradient-to-br from-gray-50 to-white',
};

const PAIN_POINT_TEXT_COLORS = {
  '目標層': 'text-purple-700',
  '社交層': 'text-blue-700',
  '情緒層': 'text-red-700',
  '環境層': 'text-green-700',
  '技術層': 'text-gray-700',
};

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

function PainPointCard({
  painPoint,
  onTimestampClick,
}: {
  painPoint: PainPoint;
  onTimestampClick?: (timestamp: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const Icon = PAIN_POINT_ICONS[painPoint.level as keyof typeof PAIN_POINT_ICONS] || AlertCircle;
  const colorClass = PAIN_POINT_COLORS[painPoint.level as keyof typeof PAIN_POINT_COLORS] || PAIN_POINT_COLORS['技術層'];
  const textColor = PAIN_POINT_TEXT_COLORS[painPoint.level as keyof typeof PAIN_POINT_TEXT_COLORS] || PAIN_POINT_TEXT_COLORS['技術層'];

  return (
    <div className={cn('rounded-lg border-2 p-5 shadow-sm', colorClass)}>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('rounded-full p-2', painPoint.isExplored ? 'bg-white' : 'bg-yellow-100')}>
            <Icon className={cn('h-5 w-5', textColor)} />
          </div>
          <div>
            <h3 className={cn('text-lg font-bold', textColor)}>
              {painPoint.level}痛點
            </h3>
            {!painPoint.isExplored && (
              <Badge variant="outline" className="mt-1 border-yellow-500 bg-yellow-50 text-yellow-700">
                ⚠️ 未探索（教學品質扣分）
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 w-8 p-0"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="space-y-4">
          {/* 內心痛點 */}
          {painPoint.isExplored ? (
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                內心痛點
              </div>
              <p className="rounded-md bg-white p-3 text-sm font-medium leading-relaxed text-foreground shadow-sm">
                {painPoint.painDescription}
              </p>
            </div>
          ) : (
            <div className="rounded-md border-2 border-yellow-300 bg-yellow-50 p-3">
              <p className="text-sm font-medium text-yellow-800">
                ❌ 對話中未探索此層次痛點
              </p>
              {painPoint.needsToAsk && (
                <p className="mt-2 text-sm text-yellow-700">
                  建議補問：{painPoint.needsToAsk}
                </p>
              )}
            </div>
          )}

          {/* 行為證據 */}
          {painPoint.isExplored && painPoint.evidence && (
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                行為證據
              </div>
              <div className="flex flex-wrap items-start gap-1 rounded-md bg-white/70 p-3 text-sm leading-relaxed text-foreground">
                <span>{painPoint.evidence}</span>
                <TimestampBadge timestamp={painPoint.timestamp} onClick={onTimestampClick} />
              </div>
            </div>
          )}

          {/* 一對一教練價值 */}
          {painPoint.isExplored && (
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-green-700">
                <Target className="h-4 w-4" />
                一對一教練課程如何解決
              </div>
              <div className="rounded-md border-2 border-green-200 bg-gradient-to-r from-green-50 to-white p-3 shadow-sm">
                <p className="text-sm font-medium leading-relaxed text-foreground">
                  {painPoint.coachingValue}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-green-500 bg-green-50 text-green-700 text-xs">
                    ✅ 隨時隨地練習
                  </Badge>
                  <Badge variant="outline" className="border-green-500 bg-green-50 text-green-700 text-xs">
                    ✅ 即時解惑
                  </Badge>
                  <Badge variant="outline" className="border-green-500 bg-green-50 text-green-700 text-xs">
                    ✅ 確保做對
                  </Badge>
                  <Badge variant="outline" className="border-green-500 bg-green-50 text-green-700 text-xs">
                    ✅ 提升練習頻率
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PainPointsSection({ painPoints, onTimestampClick }: PainPointsSectionProps) {
  const exploredCount = painPoints.filter((p) => p.isExplored).length;
  const totalCount = painPoints.length;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">
              💔 深層痛點分析（5 層次架構）
            </CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              痛點 ≠ 技術問題，痛點 = 內心深層的情緒、社交、目標困擾。<br />
              每個痛點必須連結「一對一教練課程如何解決」。
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'text-sm',
              exploredCount === totalCount
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-yellow-500 bg-yellow-50 text-yellow-700'
            )}
          >
            已探索：{exploredCount}/{totalCount} 層
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {painPoints.map((painPoint, index) => (
          <PainPointCard
            key={index}
            painPoint={painPoint}
            onTimestampClick={onTimestampClick}
          />
        ))}

        {/* 重要提醒 */}
        <div className="rounded-lg border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-white p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-orange-600" />
            <div>
              <p className="font-semibold text-orange-800">⚠️ 重要提醒</p>
              <p className="mt-1 text-sm leading-relaxed text-orange-700">
                技術問題只是表層症狀，<strong>推課重點是上述 1-4 層的內心痛點</strong>，
                不是「我幫你解決高音」，而是「我幫你在社交場合自信唱歌」。
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

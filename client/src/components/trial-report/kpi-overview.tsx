/**
 * KPI Overview Component
 * Displays summary metrics in card format
 */

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle, Info } from 'lucide-react';
import type { SummaryMetrics } from '@/types/trial-report';
import { KPIDefinitionDialog } from './kpi-definition-dialog';
import { getKPIDefinition } from '@/config/kpi-definitions';

interface KPIOverviewProps {
  metrics: SummaryMetrics;
  onRedefineKPI?: (kpiName: string, currentValue: number) => void;
  onRevenueClick?: () => void;
}

interface KPICardProps {
  kpiId?: string;  // KPI ID for definition lookup
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  isAbnormal?: boolean;
  onShowDefinition?: () => void;
  onClick?: () => void;
}

function KPICard({
  kpiId,
  title,
  value,
  subtitle,
  trend,
  trendValue,
  isAbnormal,
  onShowDefinition,
  onClick,
}: KPICardProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  };

  const definition = kpiId ? getKPIDefinition(kpiId) : undefined;
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseMove = (e: React.MouseEvent) => {
    if (definition) {
      setTooltipPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseEnter = () => {
    if (definition) {
      timeoutRef.current = setTimeout(() => {
        setShowTooltip(true);
      }, 300);
    }
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowTooltip(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      <Card
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        className={`h-full min-h-[170px] flex flex-col ${isAbnormal ? 'border-orange-300 shadow-sm' : ''} ${
          onClick ? 'cursor-pointer transition-transform hover:-translate-y-0.5 hover:shadow-lg' : ''
        }`}
      >
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {isAbnormal && (
              <Badge variant="destructive" className="w-fit text-xs py-0 px-1.5">
                <AlertTriangle className="h-3 w-3 mr-1" />
                異常
              </Badge>
            )}
          </div>
          {onShowDefinition && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowDefinition();
              }}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors hover:text-primary hover:border-primary/30"
              aria-label="查看完整定義"
            >
              <Info className="h-4 w-4" />
            </button>
          )}
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-between gap-3 pt-0">
          <div>
            <div className="text-3xl font-semibold tracking-tight">{value}</div>
            {subtitle && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{subtitle}</p>}
          </div>
          {trend && trendValue && (
            <div className={`flex items-center gap-1 text-xs ${trendColors[trend]}`}>
              <TrendingUp
                className={`h-3 w-3 ${trend === 'down' ? 'rotate-180' : ''}`}
              />
              <span>{trendValue}</span>
            </div>
          )}
        </CardContent>
      </Card>

          {/* Custom tooltip that follows cursor */}
          {definition && showTooltip && (
            <div
              className="fixed z-50 max-w-xs rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md pointer-events-none"
              style={{
                left: `${tooltipPos.x + 15}px`,
                top: `${tooltipPos.y + 15}px`,
              }}
            >
              <p className="text-sm">{definition.shortDesc}</p>
              <p className="text-xs text-muted-foreground mt-1">
                點擊 <Info className="inline h-3 w-3" /> 查看完整定義
              </p>
            </div>
          )}
        </div>
  );
}

export function KPIOverview({ metrics, onRedefineKPI: _onRedefineKPI, onRevenueClick }: KPIOverviewProps) {
  const isConversionRateAbnormal = metrics.conversionRate > 100;
  const [definitionDialog, setDefinitionDialog] = useState<{
    open: boolean;
    kpiId: string;
    value?: number | string;
  }>({ open: false, kpiId: '' });

  const showDefinition = (kpiId: string, value?: number | string) => {
    setDefinitionDialog({ open: true, kpiId, value });
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard
          kpiId="conversionRate"
          title="轉換率"
          value={`${metrics.conversionRate.toFixed(1)}%`}
          subtitle="體驗課轉換為付費課程"
          trend={metrics.conversionRate >= 50 ? 'up' : 'neutral'}
          trendValue={metrics.conversionRate >= 50 ? '超過目標' : '持續優化中'}
          isAbnormal={isConversionRateAbnormal}
          onShowDefinition={() => showDefinition('conversionRate', metrics.conversionRate.toFixed(1))}
        />

        <KPICard
          kpiId="avgConversionTime"
          title="平均轉換時間"
          value={`${metrics.avgConversionTime.toFixed(1)} 天`}
          subtitle="從體驗到成交的平均天數"
          trend={metrics.avgConversionTime <= 7 ? 'up' : 'neutral'}
          trendValue={metrics.avgConversionTime <= 7 ? '效率良好' : '可再優化'}
          onShowDefinition={() => showDefinition('avgConversionTime', metrics.avgConversionTime.toFixed(1))}
        />

        <KPICard
          kpiId="trialCompletionRate"
          title="體驗課完成率"
          value={`${metrics.trialCompletionRate.toFixed(1)}%`}
          subtitle="已上完課 / 所有體驗課學員"
          trend={metrics.trialCompletionRate >= 85 ? 'up' : 'neutral'}
          trendValue={metrics.trialCompletionRate >= 85 ? '表現優異' : '需要關注'}
          onShowDefinition={() => showDefinition('trialCompletionRate', metrics.trialCompletionRate.toFixed(1))}
        />

        <KPICard
          kpiId="pendingStudents"
          title="待跟進學生"
          value={metrics.pendingStudents}
          subtitle="需要進一步聯繫的學生數"
          onShowDefinition={() => showDefinition('pendingStudents', metrics.pendingStudents)}
        />

        <KPICard
          kpiId="potentialRevenue"
          title="已轉高實收金額"
          value={`NT$ ${metrics.potentialRevenue.toLocaleString()}`}
          subtitle="已轉高學生的高階方案總額"
          onClick={onRevenueClick}
          onShowDefinition={() => showDefinition('potentialRevenue', `NT$ ${metrics.potentialRevenue.toLocaleString()}`)}
        />

        <KPICard
          kpiId="totalStudents"
          title="總學生數"
          value={metrics.totalStudents ?? metrics.totalTrials}
          subtitle={`已成交 ${metrics.totalConversions} 筆`}
          onShowDefinition={() => showDefinition('totalStudents', metrics.totalStudents ?? metrics.totalTrials)}
        />
      </div>

      {/* KPI Definition Dialog */}
      <KPIDefinitionDialog
        open={definitionDialog.open}
        onClose={() => setDefinitionDialog({ open: false, kpiId: '' })}
        kpiId={definitionDialog.kpiId}
        currentValue={definitionDialog.value}
      />
    </>
  );
}

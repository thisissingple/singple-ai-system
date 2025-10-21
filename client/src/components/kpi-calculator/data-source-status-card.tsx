/**
 * Data Source Status Card (Shared Component)
 * Can be used in both Total Report and KPI Calculator pages
 */

import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, Clock, Calculator, RefreshCw, Settings } from 'lucide-react';
import { format } from 'date-fns';

interface DataSourceStatusCardProps {
  mode: 'supabase' | 'storage' | 'mock';
  attendanceCount: number;
  purchasesCount: number;
  dealsCount: number;
  dateRange?: { start: string; end: string };
  lastSync?: string | null;
  showKPIButton?: boolean;
  showMetricSettingsButton?: boolean;
  onRefresh?: () => void;
  onOpenMetricSettings?: () => void;
}

export function DataSourceStatusCard({
  mode,
  attendanceCount,
  purchasesCount,
  dealsCount,
  dateRange,
  lastSync,
  showKPIButton = false,
  showMetricSettingsButton = false,
  onRefresh,
  onOpenMetricSettings,
}: DataSourceStatusCardProps) {
  const getModeConfig = () => {
    switch (mode) {
      case 'supabase':
        return {
          label: 'Supabase 即時資料',
          color: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
          badgeVariant: 'default' as const,
          icon: <Database className="h-5 w-5 text-green-600 dark:text-green-400" />,
        };
      case 'storage':
        return {
          label: '本地儲存',
          color: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
          badgeVariant: 'secondary' as const,
          icon: <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
        };
      case 'mock':
        return {
          label: '模擬資料',
          color: 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700',
          badgeVariant: 'outline' as const,
          icon: <Database className="h-5 w-5 text-gray-600 dark:text-gray-400" />,
        };
    }
  };

  const config = getModeConfig();

  const buttonCount = (showKPIButton ? 1 : 0) + (showMetricSettingsButton ? 1 : 0);
  const gridColsClass = buttonCount >= 2
    ? 'md:grid-cols-5'
    : buttonCount === 1
      ? 'md:grid-cols-4'
      : 'md:grid-cols-3';

  return (
    <Card className={config.color}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {config.icon}
            資料來源狀態
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={config.badgeVariant}>{config.label}</Badge>
            {onRefresh && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRefresh}
                className="h-8"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                重新整理
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={`grid gap-3 grid-cols-1 sm:grid-cols-2 ${gridColsClass}`}>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">體驗課上課</div>
            <div className="text-2xl font-bold">{attendanceCount} <span className="text-xs font-normal text-muted-foreground">筆</span></div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">體驗課購買</div>
            <div className="text-2xl font-bold">{purchasesCount} <span className="text-xs font-normal text-muted-foreground">筆</span></div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">成交記錄 (Google Sheets)</div>
            <div className="text-2xl font-bold">{dealsCount} <span className="text-xs font-normal text-muted-foreground">筆</span></div>
          </div>
          {showKPIButton && (
            <div className="space-y-1">
              <Link href="/dashboard/kpi-calculator">
                <Button variant="default" className="w-full h-full">
                  <Calculator className="h-4 w-4 mr-2" />
                  查看 KPI 計算詳情
                </Button>
              </Link>
            </div>
          )}
          {showMetricSettingsButton && (
            <div className="space-y-1">
              <Button
                variant="secondary"
                className="w-full h-full"
                onClick={() => onOpenMetricSettings?.()}
              >
                <Settings className="h-4 w-4 mr-2" />
                指標設定
              </Button>
            </div>
          )}
        </div>

        {dateRange && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            資料期間：{format(new Date(dateRange.start), 'yyyy-MM-dd')} ~ {format(new Date(dateRange.end), 'yyyy-MM-dd')}
          </div>
        )}

        {lastSync && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <Clock className="h-3 w-3" />
            <span>最後同步：{format(new Date(lastSync), 'yyyy-MM-dd HH:mm:ss')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

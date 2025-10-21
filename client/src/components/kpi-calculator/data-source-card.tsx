/**
 * Data Source Card Component
 * Displays data source information with color-coded status
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface DataSourceCardProps {
  mode: 'supabase' | 'storage' | 'mock';
  rawDataSummary: {
    source: string;
    attendance: { count: number; source: string };
    purchases: { count: number; source: string };
    deals: { count: number; source: string };
    dateRange: { start: string; end: string };
    lastSync: string | null;
  };
}

export function DataSourceCard({ mode, rawDataSummary }: DataSourceCardProps) {
  const getModeConfig = () => {
    switch (mode) {
      case 'supabase':
        return {
          label: 'Supabase',
          color: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
          badgeVariant: 'default' as const,
          textColor: 'text-green-800 dark:text-green-200',
          icon: <Database className="h-5 w-5 text-green-600 dark:text-green-400" />,
        };
      case 'storage':
        return {
          label: 'Local Storage',
          color: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
          badgeVariant: 'secondary' as const,
          textColor: 'text-blue-800 dark:text-blue-200',
          icon: <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
        };
      case 'mock':
        return {
          label: '模擬資料',
          color: 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700',
          badgeVariant: 'outline' as const,
          textColor: 'text-gray-800 dark:text-gray-200',
          icon: <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />,
        };
    }
  };

  const config = getModeConfig();

  return (
    <Card className={config.color}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {config.icon}
            資料來源
          </CardTitle>
          <Badge variant={config.badgeVariant}>{config.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">體驗課上課</div>
            <div className="text-2xl font-bold">{rawDataSummary.attendance.count}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">體驗課購買</div>
            <div className="text-2xl font-bold">{rawDataSummary.purchases.count}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">成交記錄</div>
            <div className="text-2xl font-bold">{rawDataSummary.deals.count}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">資料期間</div>
            <div className="text-sm font-mono">
              {format(new Date(rawDataSummary.dateRange.start), 'yyyy-MM-dd')} ~{' '}
              {format(new Date(rawDataSummary.dateRange.end), 'yyyy-MM-dd')}
            </div>
          </div>
        </div>

        {rawDataSummary.lastSync && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <Clock className="h-3 w-3" />
            <span>最後同步：{format(new Date(rawDataSummary.lastSync), 'yyyy-MM-dd HH:mm:ss')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Simple Data Source Status - Single Line Display
 * Shows data source status in a compact, glanceable format
 */

import { Link } from 'wouter';
import { Database, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SimpleDataSourceStatusProps {
  mode: 'supabase' | 'storage' | 'mock';
  attendanceCount: number;
  purchasesCount: number;
  dealsCount: number;
}

export function SimpleDataSourceStatus({
  mode,
  attendanceCount,
  purchasesCount,
  dealsCount,
}: SimpleDataSourceStatusProps) {
  const getModeConfig = () => {
    switch (mode) {
      case 'supabase':
        return {
          label: 'Supabase',
          description: '即時資料',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-950/30',
          borderColor: 'border-green-200 dark:border-green-800',
          badgeVariant: 'default' as const,
        };
      case 'storage':
        return {
          label: '本地儲存',
          description: '快取資料',
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-950/30',
          borderColor: 'border-blue-200 dark:border-blue-800',
          badgeVariant: 'secondary' as const,
        };
      case 'mock':
        return {
          label: '模擬資料',
          description: '測試用',
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-900/30',
          borderColor: 'border-gray-200 dark:border-gray-700',
          badgeVariant: 'outline' as const,
        };
    }
  };

  const config = getModeConfig();
  const totalCount = attendanceCount + purchasesCount + dealsCount;

  return (
    <div className="flex gap-2">
      {/* 主要資料來源狀態卡片 */}
      <div
        className={cn(
          'flex-1 flex items-center justify-between p-4 rounded-lg border',
          config.bgColor,
          config.borderColor
        )}
      >
        <div className="flex items-center gap-3">
          <Database className={cn('h-5 w-5', config.color)} />
          <div className="flex items-center gap-2">
            <span className="font-medium">資料來源：</span>
            <Badge variant={config.badgeVariant}>
              {config.label}
            </Badge>
            <span className={cn('text-sm', config.color)}>
              ({config.description})
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
            <span>•</span>
            <span>
              {attendanceCount} 上課 | {purchasesCount} 購買 | {dealsCount} 成交
            </span>
            <span className="text-xs">
              (共 {totalCount} 筆)
            </span>
          </div>
        </div>
      </div>

      {/* 管理資料來源按鈕 */}
      <div className="flex gap-2">
        <Link href="/settings/google-sheets-sync">
          <div
            className="group flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent hover:shadow-md transition-all cursor-pointer h-full"
          >
            <span className="text-sm font-medium whitespace-nowrap">Google Sheets 同步</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </Link>
        <Link href="/tools/database-browser">
          <div
            className="group flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent hover:shadow-md transition-all cursor-pointer h-full"
          >
            <span className="text-sm font-medium whitespace-nowrap">資料庫瀏覽器</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  );
}

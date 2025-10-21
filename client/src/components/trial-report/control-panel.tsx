/**
 * Control Panel Component
 * Provides period switching, date selection, search, sorting, export, and refresh controls
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Download, RefreshCw, Search, ArrowUpDown, Database, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { PeriodType, MultiSortConfig } from '@/types/trial-report';

interface ControlPanelProps {
  period: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
  selectedDate: Date;
  onDateChange: (date: Date | undefined) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortConfigs: MultiSortConfig[];
  onSortChange: (configs: MultiSortConfig[]) => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  // New props
  onIntrospectFields?: () => void;
  onOpenMetricSettings?: () => void;
  isIntrospecting?: boolean;
  dataSource?: 'supabase' | 'storage';
  lastIntrospection?: {
    timestamp: string;
    tableCount: number;
  } | null;
}

const SORT_FIELD_OPTIONS = [
  { value: 'conversionRate', label: '轉換率' },
  { value: 'classCount', label: '授課數' },
  { value: 'avgSatisfaction', label: '滿意度' },
  { value: 'totalRevenue', label: '總收入' },
  { value: 'intentScore', label: '意向分數' },
  { value: 'classDate', label: '上課日期' },
];

export function ControlPanel({
  period,
  onPeriodChange,
  selectedDate,
  onDateChange,
  searchTerm,
  onSearchChange,
  sortConfigs,
  onSortChange,
  onExportCSV,
  onExportJSON,
  onRefresh,
  isRefreshing = false,
  onIntrospectFields,
  onOpenMetricSettings,
  isIntrospecting = false,
  dataSource = 'storage',
  lastIntrospection,
}: ControlPanelProps) {
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleAddSort = () => {
    if (!sortField) return;

    const newConfig: MultiSortConfig = {
      field: sortField,
      direction: sortDirection,
      priority: sortConfigs.length + 1,
    };

    onSortChange([...sortConfigs, newConfig]);
    setSortField('');
  };

  const handleRemoveSort = (index: number) => {
    const updated = sortConfigs.filter((_, i) => i !== index);
    // Re-prioritize
    updated.forEach((config, i) => {
      config.priority = i + 1;
    });
    onSortChange(updated);
  };

  const handleClearAllSorts = () => {
    onSortChange([]);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Row 1: Period Toggle + Date Picker */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">報表週期:</span>
              <ToggleGroup
                type="single"
                value={period}
                onValueChange={(value) => value && onPeriodChange(value as PeriodType)}
              >
                <ToggleGroupItem value="daily" aria-label="日報">
                  日報
                </ToggleGroupItem>
                <ToggleGroupItem value="weekly" aria-label="週報">
                  週報
                </ToggleGroupItem>
                <ToggleGroupItem value="monthly" aria-label="月報">
                  月報
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(selectedDate, 'yyyy-MM-dd')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={onDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="搜尋教師、學生、備註..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Sorting Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">排序:</span>

            <Select value={sortField} onValueChange={setSortField}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="選擇欄位" />
              </SelectTrigger>
              <SelectContent>
                {SORT_FIELD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <ToggleGroup
              type="single"
              value={sortDirection}
              onValueChange={(value) => value && setSortDirection(value as 'asc' | 'desc')}
            >
              <ToggleGroupItem value="asc" aria-label="升序">
                升序
              </ToggleGroupItem>
              <ToggleGroupItem value="desc" aria-label="降序">
                降序
              </ToggleGroupItem>
            </ToggleGroup>

            <Button
              size="sm"
              variant="outline"
              onClick={handleAddSort}
              disabled={!sortField}
              className="gap-1"
            >
              <ArrowUpDown className="h-3 w-3" />
              新增排序
            </Button>

            {sortConfigs.length > 0 && (
              <Button size="sm" variant="ghost" onClick={handleClearAllSorts}>
                清除全部
              </Button>
            )}

            <div className="flex flex-wrap gap-2">
              {sortConfigs.map((config, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="gap-1 pr-1 cursor-pointer hover:bg-secondary/80"
                >
                  <span className="text-xs">
                    {SORT_FIELD_OPTIONS.find((opt) => opt.value === config.field)?.label ||
                      config.field}
                  </span>
                  <span className="text-xs opacity-60">
                    ({config.direction === 'asc' ? '↑' : '↓'})
                  </span>
                  <button
                    onClick={() => handleRemoveSort(index)}
                    className="ml-1 rounded-full hover:bg-secondary-foreground/20 p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Row 3: Tools + Export + Refresh */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
            {/* Data Source Badge */}
            <Badge variant={dataSource === 'supabase' ? 'default' : 'secondary'} className="gap-1">
              {dataSource === 'supabase' ? '🟢 Supabase' : '⚠️ Local Storage'}
            </Badge>

            {/* Field Introspection */}
            {onIntrospectFields && (
              <Button
                size="sm"
                variant="outline"
                onClick={onIntrospectFields}
                disabled={isIntrospecting}
                className="gap-2"
              >
                <Database className={`h-4 w-4 ${isIntrospecting ? 'animate-pulse' : ''}`} />
                欄位盤點
              </Button>
            )}

            {/* Metric Settings */}
            {onOpenMetricSettings && (
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenMetricSettings}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                指標設定
              </Button>
            )}

            {/* Last Introspection Info */}
            {lastIntrospection && (
              <span className="text-xs text-muted-foreground">
                最後盤點：{format(new Date(lastIntrospection.timestamp), 'MM/dd HH:mm')}
                （{lastIntrospection.tableCount} 表）
              </span>
            )}

            <div className="flex-1" />

            {/* Export Buttons */}
            <Button size="sm" variant="outline" onClick={onExportCSV} className="gap-2">
              <Download className="h-4 w-4" />
              匯出 CSV
            </Button>
            <Button size="sm" variant="outline" onClick={onExportJSON} className="gap-2">
              <Download className="h-4 w-4" />
              匯出 JSON
            </Button>

            {/* Refresh Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              重新整理
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

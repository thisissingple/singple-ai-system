/**
 * Teacher Insights Component (全新商業指標版)
 * Displays teacher performance with revenue-focused metrics
 */

import { useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChevronDown,
  ChevronUp,
  Trophy,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Target,
  Calendar,
  HelpCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { TeacherInsight, StudentInsight } from '@/types/trial-report';
import { getTopN } from '@/lib/trial-report-utils';
import { format } from 'date-fns';

export interface TeacherClassRecord {
  id: string;
  teacherName: string;
  studentName: string;
  classDate?: string;
  status?: string;
  topic?: string;
}

interface TeacherInsightsProps {
  teachers: TeacherInsight[];
  students?: StudentInsight[];
  classRecords?: TeacherClassRecord[];
}

type SortField =
  | 'classCount'
  | 'studentCount'
  | 'conversionRate'
  | 'totalRevenue'
  | 'avgDealAmount'
  | 'revenuePerClass'
  | 'performanceScore';

// KPI 指標說明
const KPI_DEFINITIONS = {
  classCount: '該教師授課的總堂數（來自體驗課上課記錄）',
  studentCount: '該教師教過的學生總數（去重後）',
  conversionRate: '已轉高學生數 ÷ (已轉高 + 未轉高) × 100%\n只計算已完成體驗課的學生',
  totalRevenue: '該教師所有「已轉高」學生在 EODs 中「高階一對一」或「高音」方案的實收金額總和',
  avgDealAmount: '實收金額 ÷ 已轉高學生數\n平均每位成交學生帶來的收入',
  revenuePerClass: '實收金額 ÷ 授課數\n每堂課帶來的平均收入，衡量教學效率',
  pendingStudents: '狀態為「體驗中」或「未開始」的學生數\n這些學生需要積極跟進',
  lastClassDate: '該教師最近一次授課的日期\n用於判斷教師活躍度',
  performanceScore: '綜合績效評分（0-100分）\n計算公式：\n• 轉換率 40%（50%轉換率=滿分）\n• ROI效率 30%（3萬/堂=滿分）\n• 完課率 20%（100%完課=滿分）\n• 活躍度 10%（有最近上課=滿分）',
  aiSummary: '根據績效評分自動生成的建議\n⭐⭐⭐ = 80分以上\n⭐⭐ = 60-80分\n⭐ = 40-60分',
};

const normalizeTeacherName = (name?: string | null) => (name ? name.trim() : '').toLowerCase() || '未分配';

// Tooltip 包裝組件
function MetricTooltip({ children, definition }: { children: React.ReactNode; definition: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 cursor-help text-sm font-medium leading-tight text-left text-foreground/90 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
        >
          {children}
          <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs whitespace-pre-line">
        <p className="text-sm">{definition}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function TeacherInsights({ teachers, students, classRecords }: TeacherInsightsProps) {
  const [sortConfigs, setSortConfigs] = useState<Array<{ field: SortField; direction: 'asc' | 'desc' }>>([
    { field: 'performanceScore', direction: 'desc' },
  ]);

  const handleSort = (event: ReactMouseEvent<HTMLTableCellElement | HTMLDivElement>, field: SortField) => {
    const isMulti = event.shiftKey;

    setSortConfigs((prev) => {
      const working = isMulti ? [...prev] : [...prev.filter((config) => config.field === field)];
      const existingIndex = working.findIndex((config) => config.field === field);

      if (existingIndex === -1) {
        const base = isMulti ? [...prev, { field, direction: 'desc' }] : [{ field, direction: 'desc' }];
        return base;
      }

      const current = working[existingIndex];
      if (current.direction === 'desc') {
        working[existingIndex] = { ...current, direction: 'asc' };
      } else {
        working.splice(existingIndex, 1);
      }

      if (!isMulti) {
        return working;
      }

      const nonDuplicated = [...prev.filter((config) => config.field !== field), ...working];
      return nonDuplicated;
    });
  };

  const activeSorts = sortConfigs;

  const sortedTeachers = useMemo(() => {
    if (!activeSorts.length) {
      return [...teachers];
    }

    return [...teachers].sort((a, b) => {
      for (const config of activeSorts) {
        const aValue = a[config.field];
        const bValue = b[config.field];

        if (aValue === bValue) continue;

        const comparison = aValue > bValue ? 1 : -1;
        return config.direction === 'asc' ? comparison : -comparison;
      }
      return 0;
    });
  }, [teachers, activeSorts]);

  const renderSortIcon = (field: SortField) => {
    const index = activeSorts.findIndex((config) => config.field === field);
    if (index === -1) return null;

    return (
      <span className="ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
        {activeSorts[index].direction === 'asc' ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        {activeSorts.length > 1 && (
          <span className="rounded bg-muted px-1 text-[10px] font-semibold text-muted-foreground/80">
            {index + 1}
          </span>
        )}
      </span>
    );
  };

  const teacherStudentMap = useMemo(() => {
    if (!students || students.length === 0) return null;

    const map = new Map<string, StudentInsight[]>();
    students.forEach((student) => {
      const normalizedKey = normalizeTeacherName(
        student.teacherName && student.teacherName !== '未知教師' ? student.teacherName : undefined
      );

      if (!map.has(normalizedKey)) {
        map.set(normalizedKey, []);
      }
      map.get(normalizedKey)!.push(student);
    });

    map.forEach((studentList) => {
      // 依照最近上課日期排序，最新的在最上面
      studentList.sort((a, b) => {
        const dateA = a.lastClassDate ? new Date(a.lastClassDate).getTime() : 0;
        const dateB = b.lastClassDate ? new Date(b.lastClassDate).getTime() : 0;
        return dateB - dateA; // 降序：最新的在前面
      });
    });

    return map;
  }, [students]);

  const teacherClassMap = useMemo(() => {
    if (!classRecords || classRecords.length === 0) return null;

    const map = new Map<string, TeacherClassRecord[]>();
    classRecords.forEach((record) => {
      const key = normalizeTeacherName(record.teacherName);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(record);
    });

    map.forEach((records) => {
      records.sort((a, b) => {
        if (!a.classDate && !b.classDate) return 0;
        if (!a.classDate) return 1;
        if (!b.classDate) return -1;
        const aDate = new Date(a.classDate);
        const bDate = new Date(b.classDate);
        if (Number.isNaN(aDate.getTime()) || Number.isNaN(bDate.getTime())) {
          return a.classDate > b.classDate ? -1 : 1;
        }
        return bDate.getTime() - aDate.getTime();
      });
    });

    return map;
  }, [classRecords]);

  type DetailModalState =
    | { open: false }
    | { open: true; type: 'classes' | 'students' | 'inTrial' | 'converted'; teacher: TeacherInsight };

  const [detailModal, setDetailModal] = useState<DetailModalState>({ open: false });

  const openDetailModal = (type: 'classes' | 'students' | 'inTrial' | 'converted', teacher: TeacherInsight) => {
    setDetailModal({ open: true, type, teacher });
  };

  const closeDetailModal = () => setDetailModal({ open: false });

  const classRecordsForModal = useMemo(() => {
    if (!detailModal.open || detailModal.type !== 'classes') return [];
    if (!teacherClassMap) return [];
    const key = normalizeTeacherName(detailModal.teacher.teacherName);
    return teacherClassMap.get(key) ?? [];
  }, [detailModal, teacherClassMap]);

  const studentRecordsForModal = useMemo(() => {
    if (!detailModal.open) return [];
    if (detailModal.type === 'classes') return [];
    if (!teacherStudentMap) return [];

    const key = normalizeTeacherName(detailModal.teacher.teacherName);
    const allStudents = teacherStudentMap.get(key) ?? [];

    // 根據類型篩選學生
    if (detailModal.type === 'inTrial') {
      return allStudents.filter(s => s.currentStatus === '體驗中' || s.currentStatus === '未開始');
    } else if (detailModal.type === 'converted') {
      return allStudents.filter(s => s.currentStatus === '已轉高');
    }

    // 'students' 類型顯示全部學生
    return allStudents;
  }, [detailModal, teacherStudentMap]);

  const formatDateDisplay = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return format(date, 'yyyy-MM-dd');
  };

  // 前三名（按績效評分）
  const topTeachers = getTopN(
    [...teachers].sort((a, b) => b.performanceScore - a.performanceScore),
    3
  );

  const formatMoney = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return amount.toString();
  };

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case '已轉高':
        return 'default' as const;
      case '體驗中':
        return 'secondary' as const;
      case '未轉高':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6">
        {/* Top Teachers Summary Cards */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-orange-400" />
            優秀教師榜
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            {topTeachers.map((teacher, index) => {
              // 計算獎牌：根據分數相同與否決定
              let medal = '🥇';
              let medalColor = 'text-yellow-600';

              if (index === 0) {
                medal = '🥇';
                medalColor = 'text-yellow-600';
              } else if (teacher.performanceScore === topTeachers[0].performanceScore) {
                // 與第一名同分，也給金牌
                medal = '🥇';
                medalColor = 'text-yellow-600';
              } else if (index === 1 || teacher.performanceScore === topTeachers[1]?.performanceScore) {
                medal = '🥈';
                medalColor = 'text-gray-400';
              } else {
                medal = '🥉';
                medalColor = 'text-orange-700';
              }

              return (
                <Card key={teacher.teacherId} className="relative overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{teacher.teacherName}</span>
                      <span className={`text-2xl ${medalColor}`}>{medal}</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      <MetricTooltip definition={KPI_DEFINITIONS.performanceScore}>
                        績效評分: {teacher.performanceScore} 分
                      </MetricTooltip>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">轉換率 40%</span>
                        <span className="font-semibold">
                          {teacher.conversionRate.toFixed(1)}%
                          <span className="text-xs text-muted-foreground ml-1">
                            ({Math.min(100, (teacher.conversionRate / 50 * 100)).toFixed(0)}分)
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-orange-400 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(100, teacher.conversionRate / 50 * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">ROI效率 30%</span>
                        <span className="font-semibold">
                          {formatMoney(teacher.revenuePerClass)}/堂
                          <span className="text-xs text-muted-foreground ml-1">
                            ({Math.min(100, (teacher.revenuePerClass / 30000 * 100)).toFixed(0)}分)
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-orange-400 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(100, teacher.revenuePerClass / 30000 * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">完課率 20%</span>
                        <span className="font-semibold">
                          {teacher.completionRate?.toFixed(1) || 0}%
                          <span className="text-xs text-muted-foreground ml-1">
                            ({Math.min(100, ((teacher.completionRate || 0) / 100 * 100)).toFixed(0)}分)
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-orange-400 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (teacher.completionRate || 0))}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">活躍度 10%</span>
                        <span className="font-semibold">
                          {teacher.lastClassDate ? '活躍' : '未活躍'}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({teacher.lastClassDate ? '100' : '0'}分)
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-orange-400 h-1.5 rounded-full transition-all"
                          style={{ width: teacher.lastClassDate ? '100%' : '0%' }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

      {/* Teachers Table */}
      <Card>
        <CardHeader>
          <CardTitle>教師績效詳細列表</CardTitle>
          <CardDescription>點擊欄位標題切換排序 • Shift+點擊可疊加多欄排序 • 再點一次即可清除排序</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">教師</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={(event) => handleSort(event, 'classCount')}
                  >
                    <div className="flex items-center gap-1">
                      <MetricTooltip definition={KPI_DEFINITIONS.classCount}>
                        授課數
                      </MetricTooltip>
                      {renderSortIcon('classCount')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={(event) => handleSort(event, 'studentCount')}
                  >
                    <MetricTooltip definition={KPI_DEFINITIONS.studentCount}>
                      學生數
                    </MetricTooltip>
                    {renderSortIcon('studentCount')}
                  </TableHead>
                  <TableHead>體驗中學生數</TableHead>
                  <TableHead>已成交學生數</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={(event) => handleSort(event, 'conversionRate')}
                  >
                    <MetricTooltip definition={KPI_DEFINITIONS.conversionRate}>
                      轉換率
                    </MetricTooltip>
                    {renderSortIcon('conversionRate')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={(event) => handleSort(event, 'totalRevenue')}
                  >
                    <MetricTooltip definition={KPI_DEFINITIONS.totalRevenue}>
                      實收金額
                    </MetricTooltip>
                    {renderSortIcon('totalRevenue')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={(event) => handleSort(event, 'avgDealAmount')}
                  >
                    <MetricTooltip definition={KPI_DEFINITIONS.avgDealAmount}>
                      平均客單價
                    </MetricTooltip>
                    {renderSortIcon('avgDealAmount')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={(event) => handleSort(event, 'revenuePerClass')}
                  >
                    <MetricTooltip definition={KPI_DEFINITIONS.revenuePerClass}>
                      ROI效率
                    </MetricTooltip>
                    {renderSortIcon('revenuePerClass')}
                  </TableHead>
                  <TableHead>
                    <MetricTooltip definition={KPI_DEFINITIONS.lastClassDate}>
                      最近上課
                    </MetricTooltip>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={(event) => handleSort(event, 'performanceScore')}
                  >
                    <MetricTooltip definition={KPI_DEFINITIONS.performanceScore}>
                      績效評分
                    </MetricTooltip>
                    {renderSortIcon('performanceScore')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTeachers.map((teacher) => (
                  <TableRow key={teacher.teacherId} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-sm text-foreground">
                      {teacher.teacherName}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openDetailModal('classes', teacher)}
                          className="text-sm font-semibold text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
                        >
                          {teacher.classCount}
                        </button>
                        {teacher.comparison?.classCount && (
                          <span className={`text-xs ${
                            teacher.comparison.classCount.trend === 'up'
                              ? 'text-green-600'
                              : teacher.comparison.classCount.trend === 'down'
                              ? 'text-red-600'
                              : 'text-gray-500'
                          }`}>
                            {teacher.comparison.classCount.trend === 'up' && '↑'}
                            {teacher.comparison.classCount.trend === 'down' && '↓'}
                            {teacher.comparison.classCount.trend === 'stable' && '→'}
                            {Math.abs(teacher.comparison.classCount.change)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => openDetailModal('students', teacher)}
                        className="text-sm font-semibold text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
                      >
                        {teacher.studentCount}
                      </button>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => openDetailModal('inTrial', teacher)}
                        className="text-sm font-semibold text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
                      >
                        {teacher.inTrialStudents || 0}
                      </button>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => openDetailModal('converted', teacher)}
                        className="text-sm font-semibold text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
                      >
                        {teacher.convertedStudents || 0}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {teacher.conversionRate.toFixed(1)}%
                        </Badge>
                        {teacher.comparison?.conversionRate && (
                          <span className={`text-xs ${
                            teacher.comparison.conversionRate.trend === 'up'
                              ? 'text-green-600'
                              : teacher.comparison.conversionRate.trend === 'down'
                              ? 'text-red-600'
                              : 'text-gray-500'
                          }`}>
                            {teacher.comparison.conversionRate.trend === 'up' && '↑'}
                            {teacher.comparison.conversionRate.trend === 'down' && '↓'}
                            {teacher.comparison.conversionRate.trend === 'stable' && '→'}
                            {Math.abs(teacher.comparison.conversionRate.change).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-sm font-semibold">
                          <DollarSign className="h-3 w-3" />
                          {teacher.totalRevenue.toLocaleString()}
                        </div>
                        {teacher.comparison?.totalRevenue && (
                          <span className={`text-xs ${
                            teacher.comparison.totalRevenue.trend === 'up'
                              ? 'text-green-600'
                              : teacher.comparison.totalRevenue.trend === 'down'
                              ? 'text-red-600'
                              : 'text-gray-500'
                          }`}>
                            {teacher.comparison.totalRevenue.trend === 'up' && '↑'}
                            {teacher.comparison.totalRevenue.trend === 'down' && '↓'}
                            {teacher.comparison.totalRevenue.trend === 'stable' && '→'}
                            {formatMoney(Math.abs(teacher.comparison.totalRevenue.change))}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        NT$ {teacher.avgDealAmount.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <TrendingUp className="h-3 w-3" />
                        {formatMoney(teacher.revenuePerClass)}/堂
                      </div>
                    </TableCell>
                    <TableCell>
                      {teacher.lastClassDate ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {teacher.lastClassDate}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-orange-400"
                              style={{ width: `${teacher.performanceScore}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold">{teacher.performanceScore}</span>
                        </div>
                        {teacher.comparison?.performanceScore && (
                          <span className={`text-xs ${
                            teacher.comparison.performanceScore.trend === 'up'
                              ? 'text-green-600'
                              : teacher.comparison.performanceScore.trend === 'down'
                              ? 'text-red-600'
                              : 'text-gray-500'
                          }`}>
                            {teacher.comparison.performanceScore.trend === 'up' && '↑'}
                            {teacher.comparison.performanceScore.trend === 'down' && '↓'}
                            {teacher.comparison.performanceScore.trend === 'stable' && '→'}
                            {Math.abs(teacher.comparison.performanceScore.change).toFixed(0)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {sortedTeachers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              目前沒有符合條件的教師資料
            </div>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            顯示 {sortedTeachers.length} 位教師
          </div>
        </CardContent>
      </Card>
      </div>
      <Dialog
        open={detailModal.open}
        onOpenChange={(open) => {
          if (!open) {
            closeDetailModal();
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          {detailModal.open && detailModal.type === 'classes' && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {detailModal.teacher.teacherName} 的授課紀錄
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[480px] pr-2">
                {classRecordsForModal.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    目前沒有找到授課紀錄
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>學生</TableHead>
                        <TableHead>上課日期</TableHead>
                        <TableHead>狀態</TableHead>
                        <TableHead>課程主題</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classRecordsForModal.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.studentName}</TableCell>
                          <TableCell>{formatDateDisplay(record.classDate)}</TableCell>
                          <TableCell>
                            {record.status ? (
                              <Badge variant={getStatusBadgeVariant(record.status)}>{record.status}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>{record.topic || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </>
          )}

          {detailModal.open && (detailModal.type === 'students' || detailModal.type === 'inTrial' || detailModal.type === 'converted') && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {detailModal.teacher.teacherName} 的
                  {detailModal.type === 'inTrial' && '體驗中學生清單'}
                  {detailModal.type === 'converted' && '已成交學生清單'}
                  {detailModal.type === 'students' && '學生清單'}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[480px] pr-2">
                {studentRecordsForModal.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    目前沒有學生資料
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>學生</TableHead>
                        <TableHead>狀態</TableHead>
                        <TableHead>體驗開始</TableHead>
                        <TableHead>最近上課</TableHead>
                        <TableHead>總/剩餘堂數</TableHead>
                        <TableHead>方案</TableHead>
                        <TableHead>購買日期</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentRecordsForModal.map((student) => {
                        const total = student.totalTrialClasses ?? undefined;
                        const remaining = student.remainingTrialClasses ?? undefined;
                        const totalText = total !== undefined ? total : '—';
                        const remainingText = remaining !== undefined ? remaining : '—';
                        return (
                          <TableRow key={student.studentId}>
                            <TableCell className="font-medium">{student.studentName}</TableCell>
                            <TableCell>
                              {student.currentStatus ? (
                                <Badge variant={getStatusBadgeVariant(student.currentStatus)}>
                                  {student.currentStatus}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>{formatDateDisplay(student.classDate)}</TableCell>
                            <TableCell>{formatDateDisplay(student.lastClassDate)}</TableCell>
                            <TableCell className="text-sm">
                              {totalText} 堂 / 剩 {remainingText}
                            </TableCell>
                            <TableCell>{student.packageName || '—'}</TableCell>
                            <TableCell>{formatDateDisplay(student.purchaseDate)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

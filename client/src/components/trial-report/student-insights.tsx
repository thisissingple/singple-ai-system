/**
 * Student Insights Component
 * Displays student data with status tracking and recommended actions
 *
 * Design System: Gray + Orange (Apple/Notion style)
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Mail,
  Calendar,
  X,
  Copy,
  Check,
  Search,
  Phone,
  ShoppingCart,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import type { StudentInsight } from '@/types/trial-report';
import { differenceInDays, parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
interface StudentInsightsProps {
  students: StudentInsight[];
  initialFilter?: string | 'all';
}

type StudentSortField =
  | 'priority'
  | 'studentName'
  | 'purchaseDate'
  | 'packageName'
  | 'teacherName'
  | 'remainingClasses'
  | 'lastClassDate'
  | 'currentStatus'
  | 'dealAmount';

interface SortConfig {
  field: StudentSortField;
  direction: 'asc' | 'desc';
}

// 實際資料庫的狀態值
type ActualStatus = '未開始' | '體驗中' | '已轉高' | '未轉高' | '測試範本';

const STATUS_CONFIG: Record<
  ActualStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  '未開始': { label: '未開始', variant: 'outline' },
  '體驗中': { label: '體驗中', variant: 'secondary' },
  '已轉高': { label: '已轉高', variant: 'default' },
  '未轉高': { label: '未轉高', variant: 'destructive' },
  '測試範本': { label: '測試範本', variant: 'outline' },
};

// 優先級類型
type PriorityLevel = 'high' | 'medium' | 'low';

// 優先級配置
const PRIORITY_CONFIG: Record<PriorityLevel, {
  label: string;
  dotColor: string;
  color: string;
  textColor: string;
}> = {
  high: {
    label: '高優先',
    dotColor: 'bg-orange-500',
    color: 'border-orange-200',
    textColor: 'text-gray-600',
  },
  medium: {
    label: '中優先',
    dotColor: 'bg-orange-300',
    color: 'border-orange-100',
    textColor: 'text-gray-600',
  },
  low: {
    label: '低優先',
    dotColor: 'bg-gray-300',
    color: 'border-gray-100',
    textColor: 'text-gray-600',
  },
};

/**
 * 計算學生優先級（新規則 2025-10-13 v2.1）
 *
 * 📋 分群邏輯：
 * 第一層：未完課學生（未開始 + 體驗中）← 最優先！
 * 第二層：已完課學生（未轉高 + 已轉高）
 *
 * 🔴 高優先：
 *   未完課：
 *     - 未開始 + 購買 7 天內（熱度最高）
 *     - 體驗中 + 剩 1 堂（即將完課，準備轉換）
 *   已完課：
 *     - 未轉高 + 完課 1-3 天（剛完課，趁熱打鐵）
 *
 * 🟡 中優先：
 *   未完課：
 *     - 未開始 + 購買 8-14 天
 *     - 體驗中 + 剩 2-3 堂
 *   已完課：
 *     - 未轉高 + 完課 4-7 天（一週內跟進）
 *
 * 🟢 低優先：
 *   未完課：
 *     - 未開始 + 購買 15+ 天
 *     - 體驗中 + 剩 4+ 堂
 *   已完課：
 *     - 未轉高 + 完課 8-14 天（持續關注）
 *     - 未轉高 + 完課 15+ 天（確定流失）
 *     - 已轉高（已成交）
 */
function calculatePriority(student: StudentInsight): PriorityLevel {
  const status = student.currentStatus;
  const remaining = student.remainingTrialClasses || 0;

  // 計算購買天數
  let daysSincePurchase = 0;
  if (student.purchaseDate) {
    try {
      const purchaseDate = parseISO(student.purchaseDate);
      daysSincePurchase = differenceInDays(new Date(), purchaseDate);
    } catch {
      daysSincePurchase = 0;
    }
  }

  // 計算完課天數（對未轉高學生）
  let daysSinceLastClass = 0;
  if (student.lastClassDate) {
    try {
      const lastClass = parseISO(student.lastClassDate);
      daysSinceLastClass = differenceInDays(new Date(), lastClass);
    } catch {
      daysSinceLastClass = 0;
    }
  }

  // ===== 未完課學生（最優先處理）=====
  if (status === '未開始') {
    if (daysSincePurchase <= 7) return 'high';      // 🔴 7天內，熱度最高
    if (daysSincePurchase <= 14) return 'medium';   // 🟡 8-14天
    return 'low';                                    // 🟢 15天+
  }

  if (status === '體驗中') {
    if (remaining === 1) return 'high';              // 🔴 剩1堂，準備轉換
    if (remaining >= 2 && remaining <= 3) return 'medium'; // 🟡 剩2-3堂
    return 'low';                                    // 🟢 剩4+堂
  }

  // ===== 已完課學生 =====
  if (status === '未轉高') {
    if (daysSinceLastClass <= 3) return 'high';      // 🔴 完課1-3天，趁熱打鐵
    if (daysSinceLastClass <= 7) return 'medium';    // 🟡 完課4-7天，一週內跟進
    if (daysSinceLastClass <= 14) return 'low';      // 🟢 完課8-14天，持續關注
    return 'low';                                     // ⚫ 完課15+天，確定流失（仍顯示為低優先）
  }

  if (status === '已轉高') {
    return 'low';                                    // 🟢 已成交，低優先
  }

  // 預設低優先
  return 'low';
}

/**
 * 計算學生排序權重
 * 用於群組內排序：未完課 > 已完課，同群組內按優先級和剩餘堂數排序
 */
function calculateSortWeight(student: StudentInsight): {
  group: number;      // 群組順序：1=未完課, 2=已完課
  priority: number;   // 優先級順序：1=high, 2=medium, 3=low
  subOrder: number;   // 子排序：未開始=購買天數，體驗中=剩餘堂數，未轉高=完課天數
} {
  const status = student.currentStatus;
  const priority = calculatePriority(student);
  const remaining = student.remainingTrialClasses || 0;

  // 優先級數字
  const priorityNum = priority === 'high' ? 1 : priority === 'medium' ? 2 : 3;

  // 計算購買天數
  let daysSincePurchase = 999;
  if (student.purchaseDate) {
    try {
      const purchaseDate = parseISO(student.purchaseDate);
      daysSincePurchase = differenceInDays(new Date(), purchaseDate);
    } catch {
      daysSincePurchase = 999;
    }
  }

  // 計算完課天數
  let daysSinceLastClass = 0;
  if (student.lastClassDate) {
    try {
      const lastClass = parseISO(student.lastClassDate);
      daysSinceLastClass = differenceInDays(new Date(), lastClass);
    } catch {
      daysSinceLastClass = 0;
    }
  }

  // 群組1：未完課學生（未開始 + 體驗中）
  if (status === '未開始' || status === '體驗中') {
    if (status === '未開始') {
      // 未開始：購買天數少的優先（7天內最優先）
      return { group: 1, priority: priorityNum, subOrder: daysSincePurchase };
    } else {
      // 體驗中：剩餘堂數少的優先（1堂最優先）
      return { group: 1, priority: priorityNum, subOrder: remaining };
    }
  }

  // 群組2：已完課學生（未轉高 + 已轉高）
  if (status === '未轉高') {
    // 未轉高：完課天數多的優先（越久越危險）
    return { group: 2, priority: priorityNum, subOrder: -daysSinceLastClass };
  }

  // 已轉高：最低優先
  return { group: 2, priority: priorityNum, subOrder: 999 };
}

// 優先級說明組件
function PriorityExplanationDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="h-8 px-3 text-xs rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5" />
          <span>優先級說明</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg text-gray-900">學生跟進優先級規則</DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            電話人員專用：幫助你快速識別需要優先聯繫的學生
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 分群說明 */}
          <div className="border-l-4 border-gray-300 pl-4 py-2 bg-gray-50 rounded-r-lg">
            <h3 className="font-semibold text-gray-900 mb-1 text-sm">學生分群</h3>
            <p className="text-sm text-gray-700">
              第一優先：<strong>未完課學生</strong>（未開始 + 體驗中）<br />
              第二優先：<strong>已完課學生</strong>（未轉高 + 已轉高）
            </p>
          </div>

          {/* 高優先 */}
          <div className="border-l-4 border-orange-400 pl-4 py-2 bg-orange-50 rounded-r-lg">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-2 text-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
              高優先（立即處理）
            </h3>
            <div className="space-y-1.5 text-sm text-gray-700">
              <p><strong>未完課：</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                <li><strong>未開始</strong> + 購買 <strong>7 天內</strong> → 熱度最高，趁熱打鐵</li>
                <li><strong>體驗中</strong> + 剩 <strong>1 堂課</strong> → 即將完課，準備跟進轉換</li>
              </ul>
              <p className="mt-2"><strong>已完課：</strong></p>
              <ul className="list-disc list-inside ml-2">
                <li><strong>未轉高</strong> + 完課 <strong>1-3 天</strong> → 剛完課，趁熱打鐵</li>
              </ul>
            </div>
          </div>

          {/* 中優先 */}
          <div className="border-l-4 border-orange-300 pl-4 py-2 bg-orange-50/50 rounded-r-lg">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-2 text-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-300"></div>
              中優先（本週內處理）
            </h3>
            <div className="space-y-1.5 text-sm text-gray-700">
              <p><strong>未完課：</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                <li><strong>未開始</strong> + 購買 <strong>8-14 天</strong> → 開始冷卻，加快聯繫</li>
                <li><strong>體驗中</strong> + 剩 <strong>2-3 堂課</strong> → 快完課，提前準備</li>
              </ul>
              <p className="mt-2"><strong>已完課：</strong></p>
              <ul className="list-disc list-inside ml-2">
                <li><strong>未轉高</strong> + 完課 <strong>4-7 天</strong> → 一週內跟進</li>
              </ul>
            </div>
          </div>

          {/* 低優先 */}
          <div className="border-l-4 border-gray-300 pl-4 py-2 bg-gray-50 rounded-r-lg">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-2 text-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
              低優先（持續關注）
            </h3>
            <div className="space-y-1.5 text-sm text-gray-700">
              <p><strong>未完課：</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                <li><strong>未開始</strong> + 購買 <strong>15+ 天</strong> → 已冷淡，重新評估策略</li>
                <li><strong>體驗中</strong> + 剩 <strong>4+ 堂課</strong> → 正常進行中</li>
              </ul>
              <p className="mt-2"><strong>已完課：</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                <li><strong>未轉高</strong> + 完課 <strong>8-14 天</strong> → 持續關注</li>
                <li><strong>未轉高</strong> + 完課 <strong>15+ 天</strong> → 確定流失</li>
                <li><strong>已轉高</strong> → 已成交，後續服務</li>
              </ul>
            </div>
          </div>

          {/* 排序說明 */}
          <div className="border-l-4 border-gray-400 pl-4 py-2 bg-gray-100 rounded-r-lg">
            <h3 className="font-semibold text-gray-900 mb-2 text-sm">表格排序邏輯</h3>
            <div className="space-y-1 text-sm text-gray-700">
              <p><strong>1. 群組排序：</strong>未完課學生 → 已完課學生</p>
              <p><strong>2. 優先級排序：</strong>高優先 → 中優先 → 低優先</p>
              <p><strong>3. 細部排序：</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-0.5">
                <li>未開始：購買天數<strong>少</strong>的優先（7天內最前面）</li>
                <li>體驗中：剩餘堂數<strong>少</strong>的優先（1堂最前面）</li>
                <li>未轉高：完課天數<strong>多</strong>的優先（越久越危險）</li>
              </ul>
            </div>
          </div>

          {/* 使用建議 */}
          <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">使用建議</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• 每天優先處理 <span className="inline-flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>高優先</span> 學生</li>
              <li>• 未開始學生：7天內是黃金期，盡快聯繫分配教師</li>
              <li>• 體驗中學生：剩1堂時提前準備轉換話術</li>
              <li>• 未轉高學生：<strong>完課後3天內是黃金期</strong>，趁熱打鐵</li>
              <li>• 完課超過15天未轉高視為確定流失</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function StudentInsights({ students, initialFilter = 'all' }: StudentInsightsProps) {
  // 多欄位排序：支援疊加排序（Shift+Click）
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([
    { field: 'lastClassDate', direction: 'desc' } // 預設按最近上課日期從新到舊排序
  ]);
  const [statusFilter, setStatusFilter] = useState<ActualStatus | 'all'>('all');
  const [teacherFilter, setTeacherFilter] = useState<string | 'all'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Ref for scrolling to table
  const tableRef = useRef<HTMLDivElement>(null);

  // Scroll to table function
  const scrollToTable = () => {
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Update filter when initialFilter changes
  useEffect(() => {
    if (initialFilter && initialFilter !== 'all') {
      setStatusFilter(initialFilter as ActualStatus);
    }
  }, [initialFilter]);

  // 複製 Email 功能
  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch (err) {
      console.error('Failed to copy email:', err);
    }
  };

  // 計算每個方案的轉換率
  const calculatePackageConversionRate = (packageName: string): string => {
    const packageStudents = students.filter(s => s.packageName === packageName);
    const completed = packageStudents.filter(s =>
      s.currentStatus === '已轉高' || s.currentStatus === '未轉高'
    ).length;
    const converted = packageStudents.filter(s => s.currentStatus === '已轉高').length;

    if (completed === 0) return '無資料';
    const rate = (converted / completed * 100).toFixed(1);
    return `${rate}%`;
  };

  // 多欄位排序處理（支援 Shift+Click 疊加排序）
  const handleSort = (field: StudentSortField, event?: React.MouseEvent) => {
    const isShiftClick = event?.shiftKey;

    setSortConfigs((prev) => {
      // 檢查是否已經在排序欄位中
      const existingIndex = prev.findIndex((config) => config.field === field);

      if (existingIndex !== -1) {
        // 已存在：切換排序方向或移除
        const existing = prev[existingIndex];
        if (existing.direction === 'asc') {
          // asc → desc
          const newConfigs = [...prev];
          newConfigs[existingIndex] = { field, direction: 'desc' };
          return newConfigs;
        } else {
          // desc → 移除此排序
          if (isShiftClick) {
            // Shift+Click：移除但保留其他排序
            return prev.filter((_, i) => i !== existingIndex);
          } else {
            // 一般點擊：移除所有排序
            return [];
          }
        }
      } else {
        // 不存在：新增排序
        if (isShiftClick) {
          // Shift+Click：疊加排序
          return [...prev, { field, direction: 'asc' }];
        } else {
          // 一般點擊：取代為單一排序
          return [{ field, direction: 'asc' }];
        }
      }
    });
  };

  // 疊加篩選邏輯
  const filteredStudents = students.filter((student) => {
    // 搜尋篩選（姓名或 Email）
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const nameMatch = student.studentName?.toLowerCase().includes(query);
      const emailMatch = student.email?.toLowerCase().includes(query);
      if (!nameMatch && !emailMatch) {
        return false;
      }
    }

    // 狀態篩選
    if (statusFilter !== 'all' && student.currentStatus !== statusFilter) {
      return false;
    }

    // 教師篩選
    const normalizedTeacherName =
      student.teacherName && student.teacherName !== '未知教師'
        ? student.teacherName
        : '未分配';

    if (teacherFilter !== 'all' && normalizedTeacherName !== teacherFilter) {
      return false;
    }

    // 日期範圍篩選（使用最近一次上課日）
    if (startDate || endDate) {
      const classDate = student.lastClassDate || student.classDate;
      if (!classDate) return false;

      if (startDate && classDate < startDate) return false;
      if (endDate && classDate > endDate) return false;
    }

    return true;
  });

  // 多欄位排序邏輯（按 sortConfigs 順序依次比較）
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    // 如果沒有自訂排序，使用預設的優先級排序
    if (sortConfigs.length === 0) {
      const aWeight = calculateSortWeight(a);
      const bWeight = calculateSortWeight(b);
      if (aWeight.group !== bWeight.group) return aWeight.group - bWeight.group;
      if (aWeight.priority !== bWeight.priority) return aWeight.priority - bWeight.priority;
      return aWeight.subOrder - bWeight.subOrder;
    }

    // 依次應用每個排序規則
    for (const config of sortConfigs) {
      let comparison = 0;

      switch (config.field) {
        case 'priority': {
          const aPriority = calculatePriority(a);
          const bPriority = calculatePriority(b);
          const priorityOrder = { high: 1, medium: 2, low: 3 };
          comparison = priorityOrder[aPriority] - priorityOrder[bPriority];
          break;
        }
        case 'studentName':
          comparison = (a.studentName || '').localeCompare(b.studentName || '');
          break;
        case 'purchaseDate':
          comparison = (a.purchaseDate || '').localeCompare(b.purchaseDate || '');
          break;
        case 'packageName':
          comparison = (a.packageName || '').localeCompare(b.packageName || '');
          break;
        case 'teacherName':
          comparison = (a.teacherName || '').localeCompare(b.teacherName || '');
          break;
        case 'remainingClasses':
          comparison = (a.remainingTrialClasses || 0) - (b.remainingTrialClasses || 0);
          break;
        case 'lastClassDate':
          comparison = (a.lastClassDate || '').localeCompare(b.lastClassDate || '');
          break;
        case 'currentStatus':
          comparison = (a.currentStatus || '').localeCompare(b.currentStatus || '');
          break;
        case 'dealAmount':
          comparison = (a.dealAmount || 0) - (b.dealAmount || 0);
          break;
      }

      // 應用排序方向
      if (comparison !== 0) {
        return config.direction === 'asc' ? comparison : -comparison;
      }
    }

    return 0;
  });

  // 渲染排序圖示（支援多欄位排序優先級顯示）
  const renderSortIcon = (field: StudentSortField) => {
    const configIndex = sortConfigs.findIndex((config) => config.field === field);
    if (configIndex === -1) return null;

    const config = sortConfigs[configIndex];
    const priority = sortConfigs.length > 1 ? configIndex + 1 : null;

    return (
      <span className="inline-flex items-center gap-0.5">
        {config.direction === 'asc' ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        {priority !== null && (
          <span className="text-[10px] font-bold bg-primary/20 rounded-full w-4 h-4 flex items-center justify-center">
            {priority}
          </span>
        )}
      </span>
    );
  };

  // 計算狀態統計（不含測試範本）
  const statusCounts = {
    all: students.filter((s) => s.currentStatus !== '測試範本').length,
    '未開始': students.filter((s) => s.currentStatus === '未開始').length,
    '體驗中': students.filter((s) => s.currentStatus === '體驗中').length,
    '已轉高': students.filter((s) => s.currentStatus === '已轉高').length,
    '未轉高': students.filter((s) => s.currentStatus === '未轉高').length,
  };

  const teacherCounts = useMemo(() => {
    const counts = new Map<string, number>();

    students.forEach((student) => {
      if (student.currentStatus === '測試範本') return;

      const teacherName =
        student.teacherName && student.teacherName !== '未知教師'
          ? student.teacherName
          : '未分配';

      counts.set(teacherName, (counts.get(teacherName) ?? 0) + 1);
    });

    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [students]);

  // 清除所有篩選
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTeacherFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || teacherFilter !== 'all' || startDate || endDate;

  // 計算老師行動追蹤指標 + 未分配學生
  const getTeacherActionStats = () => {
    const stats: Record<string, {
      未開始: number;
      體驗中: number;
      未轉高: number;
      total: number;
      高優先: number;
      中優先: number;
      低優先: number;
    }> = {};

    // 特殊處理：未分配學生（未開始的學生沒有教師）
    let unassignedCount = {
      total: 0,
      高優先: 0,
      中優先: 0,
      低優先: 0,
    };

    students.forEach(student => {
      const priority = calculatePriority(student);
      const teacherName = student.teacherName;

      // 未分配學生（未開始且沒有教師）
      if (student.currentStatus === '未開始' && (!teacherName || teacherName === '未知教師')) {
        unassignedCount.total++;
        if (priority === 'high') unassignedCount.高優先++;
        else if (priority === 'medium') unassignedCount.中優先++;
        else unassignedCount.低優先++;
        return; // 不計入教師統計
      }

      // 已分配教師的學生
      if (!teacherName || teacherName === '未知教師') return;

      if (!stats[teacherName]) {
        stats[teacherName] = { 未開始: 0, 體驗中: 0, 未轉高: 0, total: 0, 高優先: 0, 中優先: 0, 低優先: 0 };
      }

      if (student.currentStatus === '未開始') {
        stats[teacherName].未開始++;
        stats[teacherName].total++;
      } else if (student.currentStatus === '體驗中') {
        stats[teacherName].體驗中++;
        stats[teacherName].total++;
      } else if (student.currentStatus === '未轉高') {
        stats[teacherName].未轉高++;
        stats[teacherName].total++;
      }

      // 統計優先級
      if (priority === 'high') stats[teacherName].高優先++;
      else if (priority === 'medium') stats[teacherName].中優先++;
      else stats[teacherName].低優先++;
    });

    return { teacherStats: stats, unassigned: unassignedCount };
  };

  const { teacherStats: teacherActionStats, unassigned: unassignedStudents } = getTeacherActionStats();

  return (
    <div className="space-y-4">
      {/* ARCHIVED: 待分配學生卡片 - 2025-10-23
          理由：用戶要求移除此卡片以簡化視覺
      {unassignedStudents.total > 0 && (
        <Card
          className="border-orange-200 bg-orange-50/50 cursor-pointer hover:bg-orange-100/50 transition-colors"
          onClick={() => {
            setTeacherFilter('未知教師');
            setStatusFilter('未開始');
            setTimeout(scrollToTable, 100);
          }}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <span>📞 待分配教師學生</span>
              </CardTitle>
              <span className="text-2xl font-bold text-orange-600">{unassignedStudents.total}</span>
            </div>
            <CardDescription className="text-xs">
              這些學生已購買體驗課但尚未開始上課，需要電話人員聯繫並分配教師（點擊查看詳細列表）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {unassignedStudents.高優先 > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 rounded-lg">
                  <span className="text-lg">🔴</span>
                  <span className="text-sm font-medium text-red-700">高優先</span>
                  <span className="text-lg font-bold text-red-700">{unassignedStudents.高優先}</span>
                </div>
              )}
              {unassignedStudents.中優先 > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 rounded-lg">
                  <span className="text-lg">🟡</span>
                  <span className="text-sm font-medium text-yellow-700">中優先</span>
                  <span className="text-lg font-bold text-yellow-700">{unassignedStudents.中優先}</span>
                </div>
              )}
              {unassignedStudents.低優先 > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 rounded-lg">
                  <span className="text-lg">🟢</span>
                  <span className="text-sm font-medium text-green-700">低優先</span>
                  <span className="text-lg font-bold text-green-700">{unassignedStudents.低優先}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      */}

      {/* ARCHIVED: 老師行動追蹤指標 - 2025-10-23
          理由：用戶要求移除此卡片以簡化視覺
      {Object.keys(teacherActionStats).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">📋 老師待跟進統計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(teacherActionStats)
                .filter(([_, stats]) => stats.total > 0)
                .sort(([, a], [, b]) => b.高優先 - a.高優先 || b.total - a.total)
                .map(([teacher, stats]) => (
                  <div
                    key={teacher}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setTeacherFilter(teacher);
                      setTimeout(scrollToTable, 100);
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{teacher}</span>
                      <span className="text-lg font-bold text-primary">{stats.total}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 text-xs mb-1">
                      {stats.未開始 > 0 && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          未開始 {stats.未開始}
                        </Badge>
                      )}
                      {stats.體驗中 > 0 && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          體驗中 {stats.體驗中}
                        </Badge>
                      )}
                      {stats.未轉高 > 0 && (
                        <Badge variant="destructive" className="text-xs px-1.5 py-0">
                          未轉高 {stats.未轉高}
                        </Badge>
                      )}
                    </div>
                    {(stats.高優先 > 0 || stats.中優先 > 0) && (
                      <div className="flex gap-1 text-[10px]">
                        {stats.高優先 > 0 && (
                          <span className="text-red-600 font-medium">🔴 {stats.高優先}</span>
                        )}
                        {stats.中優先 > 0 && (
                          <span className="text-yellow-600 font-medium">🟡 {stats.中優先}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
      */}

      {/* 主表格 */}
      <Card ref={tableRef}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>學生跟進狀態</CardTitle>
              <PriorityExplanationDialog />
            </div>
            <div className="text-sm text-muted-foreground">
              共 {sortedStudents.length} 位學生
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 精簡的篩選列 - 下拉選單模式 */}
          <div className="flex items-center gap-3">
            {/* 搜尋框 */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                type="text"
                placeholder="搜尋姓名或 Email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[240px] h-9 text-sm pl-8"
              />
            </div>

            {/* 狀態篩選 - 下拉選單 */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="篩選狀態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="flex items-center justify-between w-full">
                    全部
                    <span className="ml-3 text-gray-400 text-xs">({statusCounts.all})</span>
                  </span>
                </SelectItem>
                {(['未開始', '體驗中', '已轉高', '未轉高'] as const).map((status) => (
                  <SelectItem key={status} value={status}>
                    <span className="flex items-center justify-between w-full">
                      {status}
                      <span className="ml-3 text-gray-400 text-xs">({statusCounts[status]})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 教師篩選 - 下拉選單 */}
            <Select value={teacherFilter} onValueChange={setTeacherFilter}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="篩選教師" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="flex items-center justify-between w-full">
                    全部老師
                    <span className="ml-3 text-gray-400 text-xs">({statusCounts.all})</span>
                  </span>
                </SelectItem>
                {teacherCounts.map(([teacherName, count]) => (
                  <SelectItem key={teacherName} value={teacherName}>
                    <span className="flex items-center justify-between w-full">
                      {teacherName}
                      <span className="ml-3 text-gray-400 text-xs">({count})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 日期篩選 */}
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[140px] h-9 text-sm"
                placeholder="開始日期"
              />
              <span className="text-xs text-gray-400">至</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[140px] h-9 text-sm"
                placeholder="結束日期"
              />
            </div>

            {/* 清除篩選 */}
            {hasActiveFilters && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearFilters}
                className="h-9 px-3"
                title="清除所有篩選"
              >
                <X className="h-4 w-4 mr-1" />
                <span className="text-xs">清除</span>
              </Button>
            )}
          </div>
        <div className="overflow-x-auto">
          {/* 排序說明提示 */}
          {sortConfigs.length > 0 && (
            <div className="mb-2 flex items-center gap-2 text-xs bg-gray-50 p-2 rounded border border-gray-200">
              <span className="font-medium text-gray-700">當前排序：</span>
              {sortConfigs.map((config, index) => (
                <span key={config.field} className="flex items-center gap-1">
                  {index > 0 && <span className="text-gray-400">→</span>}
                  <span className="font-medium text-gray-900">
                    {config.field === 'priority' && '優先級'}
                    {config.field === 'studentName' && '學生姓名'}
                    {config.field === 'purchaseDate' && '購買日期'}
                    {config.field === 'packageName' && '方案'}
                    {config.field === 'teacherName' && '教師'}
                    {config.field === 'remainingClasses' && '剩餘堂數'}
                    {config.field === 'lastClassDate' && '最近上課'}
                    {config.field === 'currentStatus' && '狀態'}
                    {config.field === 'dealAmount' && '累積金額'}
                  </span>
                  <span className="text-orange-500">
                    {config.direction === 'asc' ? '↑' : '↓'}
                  </span>
                </span>
              ))}
              <span className="ml-auto text-gray-600">Shift+點擊可疊加排序</span>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow className="h-10">
                <TableHead
                  className="w-[50px] cursor-pointer hover:bg-muted/50 transition-colors text-xs"
                  onClick={(e) => handleSort('priority', e)}
                >
                  優先級 {renderSortIcon('priority')}
                </TableHead>
                <TableHead
                  className="w-[200px] cursor-pointer hover:bg-muted/50 transition-colors text-xs"
                  onClick={(e) => handleSort('studentName', e)}
                >
                  學生資訊 {renderSortIcon('studentName')}
                </TableHead>
                <TableHead
                  className="w-[90px] cursor-pointer hover:bg-muted/50 transition-colors text-xs"
                  onClick={(e) => handleSort('purchaseDate', e)}
                >
                  購買日期 {renderSortIcon('purchaseDate')}
                </TableHead>
                <TableHead
                  className="w-[140px] cursor-pointer hover:bg-muted/50 transition-colors text-xs"
                  onClick={(e) => handleSort('packageName', e)}
                >
                  方案 {renderSortIcon('packageName')}
                </TableHead>
                <TableHead
                  className="w-[90px] cursor-pointer hover:bg-muted/50 transition-colors text-xs"
                  onClick={(e) => handleSort('teacherName', e)}
                >
                  教師 {renderSortIcon('teacherName')}
                </TableHead>
                <TableHead
                  className="text-center cursor-pointer hover:bg-muted/50 transition-colors w-[60px] text-xs"
                  onClick={(e) => handleSort('remainingClasses', e)}
                >
                  購買堂數 {renderSortIcon('remainingClasses')}
                </TableHead>
                <TableHead className="text-center w-[60px] text-xs">
                  已上堂數
                </TableHead>
                <TableHead className="text-center w-[60px] text-xs">
                  剩餘堂數
                </TableHead>
                <TableHead
                  className="w-[90px] cursor-pointer hover:bg-muted/50 transition-colors text-xs"
                  onClick={(e) => handleSort('lastClassDate', e)}
                >
                  最近上課 {renderSortIcon('lastClassDate')}
                </TableHead>
                <TableHead
                  className="w-[100px] cursor-pointer hover:bg-muted/50 transition-colors text-xs"
                  onClick={(e) => handleSort('currentStatus', e)}
                >
                  狀態 {renderSortIcon('currentStatus')}
                </TableHead>
                <TableHead
                  className="w-[110px] cursor-pointer hover:bg-muted/50 transition-colors text-xs text-right"
                  onClick={(e) => handleSort('dealAmount', e)}
                >
                  累積金額 {renderSortIcon('dealAmount')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStudents.map((student) => {
                const priority = calculatePriority(student);
                const priorityConfig = PRIORITY_CONFIG[priority];
                return (
                <TableRow
                  key={student.studentId}
                  className="h-14 hover:bg-gray-50 transition-colors border-l-2 border-gray-100"
                >
                  {/* 優先級 */}
                  <TableCell className="w-[50px]">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center cursor-help">
                            <div className={`w-2.5 h-2.5 rounded-full ${priorityConfig.dotColor}`}></div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p className="text-xs">{priorityConfig.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>

                  {/* 學生資訊：姓名、Email、電話 */}
                  <TableCell className="w-[200px]">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{student.studentName}</div>
                      <button
                        onClick={() => copyEmail(student.email)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
                        title="點擊複製 Email"
                      >
                        <Mail className="h-3 w-3" />
                        <span className="group-hover:underline truncate max-w-[160px]">{student.email}</span>
                        {copiedEmail === student.email ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                      {/* 電話（TODO: 從資料庫取得） */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>—</span>
                      </div>
                    </div>
                  </TableCell>

                  {/* 購買日期 */}
                  <TableCell className="w-[90px]">
                    <div className="text-xs text-gray-700 whitespace-nowrap">
                      {student.purchaseDate || '—'}
                    </div>
                  </TableCell>

                  {/* 方案 */}
                  <TableCell className="w-[140px]">
                    {student.packageName ? (
                      <span className="inline-flex px-2 py-1 text-xs rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                        {student.packageName}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">未設定</span>
                    )}
                  </TableCell>

                  {/* 教師 */}
                  <TableCell className="w-[90px]">
                    <span className="font-medium text-sm">
                      {student.teacherName === '未知教師' ? (
                        <span className="text-orange-600">未分配</span>
                      ) : (
                        student.teacherName
                      )}
                    </span>
                  </TableCell>

                  {/* 總堂數 */}
                  <TableCell className="text-center w-[55px]">
                    <span className="text-xs font-medium text-gray-700">
                      {student.totalTrialClasses || 0}
                    </span>
                  </TableCell>

                  {/* 已上堂數 */}
                  <TableCell className="text-center w-[55px]">
                    <span className="text-xs font-medium text-gray-700">
                      {student.attendedClasses || 0}
                    </span>
                  </TableCell>

                  {/* 剩餘堂數 */}
                  <TableCell className="text-center w-[55px]">
                    <span className={`text-xs font-semibold ${
                      (student.remainingTrialClasses || 0) <= 1
                        ? 'text-orange-600'
                        : 'text-gray-700'
                    }`}>
                      {student.remainingTrialClasses || 0}
                    </span>
                  </TableCell>

                  {/* 最近一次上課日 */}
                  <TableCell className="w-[90px]">
                    <div className="text-xs text-gray-700 whitespace-nowrap">
                      {student.lastClassDate || '—'}
                    </div>
                  </TableCell>

                  {/* 狀態 */}
                  <TableCell className="w-[100px]">
                    {student.currentStatus ? (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        student.currentStatus === '已轉高' ? 'bg-green-50 text-green-700' :
                        student.currentStatus === '未轉高' ? 'bg-red-50 text-red-700' :
                        student.currentStatus === '體驗中' ? 'bg-blue-50 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {student.currentStatus}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* 累積金額 */}
                  <TableCell className="w-[110px] text-right">
                    {student.dealAmount ? (
                      <span className="text-sm font-semibold text-gray-900">
                        NT$ {student.dealAmount.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">NT$ 0</span>
                    )}
                  </TableCell>
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
        </div>

        {sortedStudents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            目前沒有符合條件的學生資料
          </div>
        )}

        <div className="mt-4 text-sm text-muted-foreground">
          顯示 {sortedStudents.length} / {students.length} 筆學生資料
        </div>
      </CardContent>
    </Card>
    </div>
  );
}

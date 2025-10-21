/**
 * Student Insights Component
 * Displays student data with status tracking and recommended actions
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  icon: string;
  color: string;
  textColor: string;
}> = {
  high: {
    label: '高優先',
    icon: '🔴',
    color: 'border-red-500',
    textColor: 'text-red-700',
  },
  medium: {
    label: '中優先',
    icon: '🟡',
    color: 'border-yellow-500',
    textColor: 'text-yellow-700',
  },
  low: {
    label: '低優先',
    icon: '🟢',
    color: 'border-green-500',
    textColor: 'text-green-700',
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
        <Button variant="outline" size="sm" className="gap-1.5 border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700">
          <HelpCircle className="h-4 w-4" />
          <span className="text-xs font-medium">優先級說明</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📋 學生跟進優先級規則</DialogTitle>
          <DialogDescription>
            電話人員專用：幫助你快速識別需要優先聯繫的學生
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 分群說明 */}
          <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded-r-lg">
            <h3 className="font-semibold text-blue-900 mb-1">📌 學生分群</h3>
            <p className="text-sm text-blue-800">
              第一優先：<strong>未完課學生</strong>（未開始 + 體驗中）<br />
              第二優先：<strong>已完課學生</strong>（未轉高 + 已轉高）
            </p>
          </div>

          {/* 高優先 */}
          <div className="border-l-4 border-red-500 pl-4 py-2 bg-red-50 rounded-r-lg">
            <h3 className="font-semibold text-red-900 flex items-center gap-2 mb-2">
              <span className="text-2xl">🔴</span>
              高優先（立即處理）
            </h3>
            <div className="space-y-1.5 text-sm text-red-800">
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
          <div className="border-l-4 border-yellow-500 pl-4 py-2 bg-yellow-50 rounded-r-lg">
            <h3 className="font-semibold text-yellow-900 flex items-center gap-2 mb-2">
              <span className="text-2xl">🟡</span>
              中優先（本週內處理）
            </h3>
            <div className="space-y-1.5 text-sm text-yellow-800">
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
          <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50 rounded-r-lg">
            <h3 className="font-semibold text-green-900 flex items-center gap-2 mb-2">
              <span className="text-2xl">🟢</span>
              低優先（持續關注）
            </h3>
            <div className="space-y-1.5 text-sm text-green-800">
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
          <div className="border-l-4 border-purple-500 pl-4 py-2 bg-purple-50 rounded-r-lg">
            <h3 className="font-semibold text-purple-900 mb-2">🎯 表格排序邏輯</h3>
            <div className="space-y-1 text-sm text-purple-800">
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
          <div className="bg-gray-100 p-3 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">💡 使用建議</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• 每天優先處理 🔴 高優先學生</li>
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
    { field: 'priority', direction: 'asc' } // 預設按優先級排序
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
      {/* 待分配學生卡片（最優先顯示） */}
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

      {/* 老師行動追蹤指標 */}
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
          {/* 精簡的篩選列 */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 搜尋框 */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="搜尋姓名或 Email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[200px] h-8 text-xs pl-8"
              />
            </div>

            <div className="h-6 w-px bg-border" />

            {/* 狀態篩選 */}
            <div className="flex flex-wrap gap-1">
              <Button
                size="sm"
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                className="h-8 text-xs"
              >
                全部 ({statusCounts.all})
              </Button>
              {(['未開始', '體驗中', '已轉高', '未轉高'] as const).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={statusFilter === status ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(status)}
                  className="h-8 text-xs"
                >
                  {status} ({statusCounts[status]})
                </Button>
              ))}
            </div>

            <div className="h-6 w-px bg-border" />

            {/* 教師篩選 - 按鈕群組 */}
            <div className="flex flex-wrap gap-1">
              <Button
                size="sm"
                variant={teacherFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setTeacherFilter('all')}
                className="h-8 text-xs"
              >
                全部老師 ({statusCounts.all})
              </Button>
              {teacherCounts.map(([teacherName, count]) => (
                <Button
                  key={teacherName}
                  size="sm"
                  variant={teacherFilter === teacherName ? 'default' : 'ghost'}
                  onClick={() => setTeacherFilter(teacherName)}
                  className={`h-8 text-xs ${teacherFilter === teacherName ? '' : 'border border-border'}`}
                >
                  {teacherName} ({count})
                </Button>
              ))}
            </div>

            {/* 日期篩選 - 簡化 */}
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[140px] h-8 text-xs"
              placeholder="開始日期"
            />
            <span className="text-xs text-muted-foreground">至</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[140px] h-8 text-xs"
              placeholder="結束日期"
            />

            {/* 清除篩選 */}
            {hasActiveFilters && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearFilters}
                className="h-8 px-2"
                title="清除所有篩選"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        <div className="overflow-x-auto">
          {/* 排序說明提示 */}
          {sortConfigs.length > 0 && (
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 p-2 rounded border border-blue-200">
              <span className="font-medium text-blue-700">📊 當前排序：</span>
              {sortConfigs.map((config, index) => (
                <span key={config.field} className="flex items-center gap-1">
                  {index > 0 && <span className="text-blue-400">→</span>}
                  <span className="font-medium text-blue-600">
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
                  <span className="text-blue-500">
                    {config.direction === 'asc' ? '↑' : '↓'}
                  </span>
                </span>
              ))}
              <span className="ml-auto text-blue-600">💡 Shift+點擊可疊加排序</span>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="w-[60px] cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={(e) => handleSort('priority', e)}
                >
                  優先級 {renderSortIcon('priority')}
                </TableHead>
                <TableHead
                  className="w-[220px] cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={(e) => handleSort('studentName', e)}
                >
                  學生資訊 {renderSortIcon('studentName')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={(e) => handleSort('purchaseDate', e)}
                >
                  購買日期 {renderSortIcon('purchaseDate')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={(e) => handleSort('packageName', e)}
                >
                  方案 {renderSortIcon('packageName')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={(e) => handleSort('teacherName', e)}
                >
                  教師 {renderSortIcon('teacherName')}
                </TableHead>
                <TableHead
                  className="text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={(e) => handleSort('remainingClasses', e)}
                >
                  總堂/已上/剩餘 {renderSortIcon('remainingClasses')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={(e) => handleSort('lastClassDate', e)}
                >
                  最近上課 {renderSortIcon('lastClassDate')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={(e) => handleSort('currentStatus', e)}
                >
                  狀態 {renderSortIcon('currentStatus')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
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
                  className={`hover:bg-muted/30 border-l-4 ${priorityConfig.color}`}
                >
                  {/* 優先級 */}
                  <TableCell>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xl">{priorityConfig.icon}</span>
                      <span className={`text-[10px] font-medium ${priorityConfig.textColor}`}>
                        {priorityConfig.label}
                      </span>
                    </div>
                  </TableCell>

                  {/* 學生資訊：姓名、Email、電話 */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{student.studentName}</div>
                      <button
                        onClick={() => copyEmail(student.email)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
                        title="點擊複製 Email"
                      >
                        <Mail className="h-3 w-3" />
                        <span className="group-hover:underline truncate max-w-[180px]">{student.email}</span>
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
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <ShoppingCart className="h-3 w-3 text-muted-foreground" />
                      {student.purchaseDate || '—'}
                    </div>
                  </TableCell>

                  {/* 方案 */}
                  <TableCell>
                    {student.packageName ? (
                      <span className="text-sm font-medium">{student.packageName}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">未設定</span>
                    )}
                  </TableCell>

                  {/* 教師 */}
                  <TableCell>
                    <span className="font-medium">
                      {student.teacherName === '未知教師' ? (
                        <span className="text-orange-600">未分配</span>
                      ) : (
                        student.teacherName
                      )}
                    </span>
                  </TableCell>

                  {/* 總堂數/已上/剩餘（合併顯示） */}
                  <TableCell>
                    <div className="text-center text-sm font-medium">
                      {student.totalTrialClasses || 0} / {student.attendedClasses || 0} / {student.remainingTrialClasses || 0}
                    </div>
                  </TableCell>

                  {/* 最近一次上課日 */}
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {student.lastClassDate || '—'}
                    </div>
                  </TableCell>

                  {/* 狀態 */}
                  <TableCell>
                    {student.currentStatus && STATUS_CONFIG[student.currentStatus as ActualStatus] ? (
                      <Badge variant={STATUS_CONFIG[student.currentStatus as ActualStatus].variant}>
                        {student.currentStatus}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* 累積金額 */}
                  <TableCell>
                    {student.dealAmount ? (
                      <span className="text-sm font-semibold text-green-600">
                        NT$ {student.dealAmount.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">NT$ 0</span>
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

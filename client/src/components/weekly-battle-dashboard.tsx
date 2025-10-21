import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  UserCheck, 
  TrendingUp, 
  TrendingDown,
  UserPlus,
  DollarSign,
  Target,
  Calendar,
  RefreshCw,
  Activity,
  Sparkles,
  BarChart3,
  Award,
  AlertTriangle,
  CheckCircle,
  Download,
  Table as TableIcon,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { format, subWeeks, startOfWeek, endOfWeek, isAfter, isBefore, isWithinInterval, parseISO, setWeek, setYear } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface WeeklyKPI {
  id: string;
  name: string;
  thisWeekValue: number;
  lastWeekValue: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  status: 'excellent' | 'good' | 'needs_attention';
  color: string;
  icon: any;
}

interface WeeklyTeacherPerformance {
  teacherName: string;
  thisWeekStudents: number;
  lastWeekStudents: number;
  thisWeekConversions: number;
  lastWeekConversions: number;
  thisWeekRevenue: number;
  lastWeekRevenue: number;
  conversionRateChange: number;
  revenueChange: number;
  trend: 'up' | 'down' | 'stable';
  rank: number;
  weeklyGrowth: number;
  status: 'excellent' | 'good' | 'needs_attention';
}

interface WeeklyConversionTrend {
  stage: string;
  thisWeekCount: number;
  lastWeekCount: number;
  change: number;
  changePercent: number;
  conversionRate: number;
  previousConversionRate: number;
}

interface DecisionTable {
  id: string;
  name: string;
  description: string;
  headers: string[];
  rows: any[][];
}

export function WeeklyBattleDashboard() {
  // 日期選擇：預設為本週
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const today = new Date();
    return format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  });

  const [generatedTables, setGeneratedTables] = useState<DecisionTable[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // 計算週區間
  const thisWeekStart = useMemo(() => new Date(selectedWeekStart), [selectedWeekStart]);
  const thisWeekEnd = useMemo(() => endOfWeek(thisWeekStart, { weekStartsOn: 1 }), [thisWeekStart]);
  const lastWeekStart = useMemo(() => startOfWeek(subWeeks(thisWeekStart, 1), { weekStartsOn: 1 }), [thisWeekStart]);
  const lastWeekEnd = useMemo(() => endOfWeek(lastWeekStart, { weekStartsOn: 1 }), [lastWeekStart]);

  // 獲取所有worksheets進行動態發現
  const { data: worksheets = [] } = useQuery<any[]>({
    queryKey: ['/api/worksheets'],
    refetchInterval: 30000,
  });

  // 獲取attendance數據（體驗課上課記錄）
  const attendanceWorksheet = worksheets.find((ws: any) => 
    ws.worksheetName?.includes('體驗課上課記錄') || ws.worksheetName?.includes('上課記錄')
  );
  const { data: attendanceData = [], refetch: refetchAttendance } = useQuery<any[]>({
    queryKey: ['/api/worksheets', attendanceWorksheet?.id, 'data'],
    enabled: !!attendanceWorksheet,
    refetchInterval: 30000,
  });

  // 獲取registration數據（會員註冊記錄）
  const registrationWorksheet = worksheets.find((ws: any) => 
    ws.worksheetName?.includes('會員註冊') || ws.worksheetName?.includes('註冊記錄')
  );
  const { data: registrationData = [], refetch: refetchRegistration } = useQuery<any[]>({
    queryKey: ['/api/worksheets', registrationWorksheet?.id, 'data'],
    enabled: !!registrationWorksheet,
    refetchInterval: 30000,
  });

  // 獲取conversion數據（體驗課購買記錄）
  const conversionWorksheet = worksheets.find((ws: any) => 
    ws.worksheetName?.includes('體驗課購買') || ws.worksheetName?.includes('購買記錄')
  );
  const { data: conversionData = [], refetch: refetchConversion } = useQuery<any[]>({
    queryKey: ['/api/worksheets', conversionWorksheet?.id, 'data'],
    enabled: !!conversionWorksheet,
    refetchInterval: 30000,
  });

  // 標準化數據結構
  const normalizedData = useMemo(() => {
    const attendance = attendanceData.map((record: any) => ({
      studentName: record.data?.['姓名'] || record.data?.['name'] || '',
      email: record.data?.['email'] || record.data?.['學員信箱'] || '',
      teacherName: record.data?.['授課老師'] || record.data?.['teacher'] || '',
      date: record.data?.['上課日期'] || record.data?.['courseDate'] || record.data?.['date'] || '',
      status: record.data?.['是否已評價'] || record.data?.['hasReviewed'] || '',
      notes: record.data?.['未轉單原因'] || record.data?.['conversionReason'] || ''
    }));

    const conversion = conversionData.map((record: any) => ({
      studentName: record.data?.['姓名'] || record.data?.['name'] || '',
      email: record.data?.['email'] || record.data?.['學員信箱'] || '',
      teacherName: record.data?.['授課老師'] || record.data?.['teacher'] || '',
      date: record.data?.['購買日期'] || record.data?.['purchaseDate'] || record.data?.['date'] || '',
      amount: parseFloat(record.data?.['價格'] || record.data?.['price'] || record.data?.['amount'] || '0'),
      courseType: record.data?.['課程類型'] || record.data?.['courseType'] || ''
    }));

    return { attendance, conversion, registration: registrationData };
  }, [attendanceData, conversionData, registrationData]);

  // 過濾週數據
  const thisWeekConversions = useMemo(() => 
    normalizedData.conversion.filter(record => {
      if (!record.date) return false;
      const recordDate = new Date(record.date);
      return isWithinInterval(recordDate, { start: thisWeekStart, end: thisWeekEnd });
    }), [normalizedData.conversion, thisWeekStart, thisWeekEnd]
  );

  const lastWeekConversions = useMemo(() => 
    normalizedData.conversion.filter(record => {
      if (!record.date) return false;
      const recordDate = new Date(record.date);
      return isWithinInterval(recordDate, { start: lastWeekStart, end: lastWeekEnd });
    }), [normalizedData.conversion, lastWeekStart, lastWeekEnd]
  );

  const thisWeekAttendance = useMemo(() => 
    normalizedData.attendance.filter((record: any) => {
      if (!record.date) return false;
      const recordDate = new Date(record.date);
      return isWithinInterval(recordDate, { start: thisWeekStart, end: thisWeekEnd });
    }), [normalizedData.attendance, thisWeekStart, thisWeekEnd]
  );

  const lastWeekAttendance = useMemo(() => 
    normalizedData.attendance.filter((record: any) => {
      if (!record.date) return false;
      const recordDate = new Date(record.date);
      return isWithinInterval(recordDate, { start: lastWeekStart, end: lastWeekEnd });
    }), [normalizedData.attendance, lastWeekStart, lastWeekEnd]
  );

  // 計算週度KPI
  const weeklyKPIs = useMemo((): WeeklyKPI[] => {
    const thisWeekAttendanceCount = thisWeekAttendance.length;
    const lastWeekAttendanceCount = lastWeekAttendance.length;
    
    const thisWeekPurchaseCount = thisWeekConversions.length;
    const lastWeekPurchaseCount = lastWeekConversions.length;
    
    const thisWeekRevenue = thisWeekConversions.reduce((sum: number, record: any) => sum + (record.amount || 0), 0);
    const lastWeekRevenue = lastWeekConversions.reduce((sum: number, record: any) => sum + (record.amount || 0), 0);
    
    // 計算轉換率
    const thisWeekConversionRate = thisWeekAttendanceCount > 0 
      ? (thisWeekPurchaseCount / thisWeekAttendanceCount) * 100 
      : 0;
    const lastWeekConversionRate = lastWeekAttendanceCount > 0 
      ? (lastWeekPurchaseCount / lastWeekAttendanceCount) * 100 
      : 0;

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const getTrend = (change: number): 'up' | 'down' | 'stable' => {
      if (change > 5) return 'up';
      if (change < -5) return 'down';
      return 'stable';
    };

    const getStatus = (change: number): 'excellent' | 'good' | 'needs_attention' => {
      if (change > 15) return 'excellent';
      if (change > -5) return 'good';
      return 'needs_attention';
    };

    return [
      {
        id: 'experience_students',
        name: '週體驗學生數',
        thisWeekValue: thisWeekAttendanceCount,
        lastWeekValue: lastWeekAttendanceCount,
        change: thisWeekAttendanceCount - lastWeekAttendanceCount,
        changePercent: calculateChange(thisWeekAttendanceCount, lastWeekAttendanceCount),
        trend: getTrend(calculateChange(thisWeekAttendanceCount, lastWeekAttendanceCount)),
        status: getStatus(calculateChange(thisWeekAttendanceCount, lastWeekAttendanceCount)),
        color: 'bg-blue-500',
        icon: Users
      },
      {
        id: 'purchase_students',
        name: '週成交學生數',
        thisWeekValue: thisWeekPurchaseCount,
        lastWeekValue: lastWeekPurchaseCount,
        change: thisWeekPurchaseCount - lastWeekPurchaseCount,
        changePercent: calculateChange(thisWeekPurchaseCount, lastWeekPurchaseCount),
        trend: getTrend(calculateChange(thisWeekPurchaseCount, lastWeekPurchaseCount)),
        status: getStatus(calculateChange(thisWeekPurchaseCount, lastWeekPurchaseCount)),
        color: 'bg-green-500',
        icon: UserCheck
      },
      {
        id: 'conversion_rate',
        name: '週轉換率',
        thisWeekValue: Number(thisWeekConversionRate.toFixed(1)),
        lastWeekValue: Number(lastWeekConversionRate.toFixed(1)),
        change: Number((thisWeekConversionRate - lastWeekConversionRate).toFixed(1)),
        changePercent: calculateChange(thisWeekConversionRate, lastWeekConversionRate),
        trend: getTrend(calculateChange(thisWeekConversionRate, lastWeekConversionRate)),
        status: getStatus(calculateChange(thisWeekConversionRate, lastWeekConversionRate)),
        color: 'bg-purple-500',
        icon: Target
      },
      {
        id: 'revenue',
        name: '週成交金額',
        thisWeekValue: thisWeekRevenue,
        lastWeekValue: lastWeekRevenue,
        change: thisWeekRevenue - lastWeekRevenue,
        changePercent: calculateChange(thisWeekRevenue, lastWeekRevenue),
        trend: getTrend(calculateChange(thisWeekRevenue, lastWeekRevenue)),
        status: getStatus(calculateChange(thisWeekRevenue, lastWeekRevenue)),
        color: 'bg-orange-500',
        icon: DollarSign
      },
      {
        id: 'consultations',
        name: '週諮詢互動數',
        thisWeekValue: thisWeekAttendanceCount,
        lastWeekValue: lastWeekAttendanceCount,
        change: thisWeekAttendanceCount - lastWeekAttendanceCount,
        changePercent: calculateChange(thisWeekAttendanceCount, lastWeekAttendanceCount),
        trend: getTrend(calculateChange(thisWeekAttendanceCount, lastWeekAttendanceCount)),
        status: getStatus(calculateChange(thisWeekAttendanceCount, lastWeekAttendanceCount)),
        color: 'bg-indigo-500',
        icon: Activity
      }
    ];
  }, [thisWeekAttendance, lastWeekAttendance, thisWeekConversions, lastWeekConversions]);

  // 計算教師週度表現
  const weeklyTeacherPerformances = useMemo((): WeeklyTeacherPerformance[] => {
    const teacherMap = new Map<string, any>();

    // 統計本週數據
    thisWeekConversions.forEach(purchase => {
      if (!purchase.teacherName) return;
      
      const teacher = teacherMap.get(purchase.teacherName) || {
        teacherName: purchase.teacherName,
        thisWeekStudents: 0,
        lastWeekStudents: 0,
        thisWeekConversions: 0,
        lastWeekConversions: 0,
        thisWeekRevenue: 0,
        lastWeekRevenue: 0
      };
      
      teacher.thisWeekConversions++;
      teacher.thisWeekRevenue += purchase.amount || 0;
      teacherMap.set(purchase.teacherName, teacher);
    });

    thisWeekAttendance.forEach(exp => {
      if (!exp.teacherName) return;
      
      const teacher = teacherMap.get(exp.teacherName) || {
        teacherName: exp.teacherName,
        thisWeekStudents: 0,
        lastWeekStudents: 0,
        thisWeekConversions: 0,
        lastWeekConversions: 0,
        thisWeekRevenue: 0,
        lastWeekRevenue: 0
      };
      
      teacher.thisWeekStudents++;
      teacherMap.set(exp.teacherName, teacher);
    });

    // 統計上週數據
    lastWeekConversions.forEach(purchase => {
      if (!purchase.teacherName) return;
      
      const teacher = teacherMap.get(purchase.teacherName) || {
        teacherName: purchase.teacherName,
        thisWeekStudents: 0,
        lastWeekStudents: 0,
        thisWeekConversions: 0,
        lastWeekConversions: 0,
        thisWeekRevenue: 0,
        lastWeekRevenue: 0
      };
      
      teacher.lastWeekConversions++;
      teacher.lastWeekRevenue += purchase.amount || 0;
      teacherMap.set(purchase.teacherName, teacher);
    });

    lastWeekAttendance.forEach(exp => {
      if (!exp.teacherName) return;
      
      const teacher = teacherMap.get(exp.teacherName) || {
        teacherName: exp.teacherName,
        thisWeekStudents: 0,
        lastWeekStudents: 0,
        thisWeekConversions: 0,
        lastWeekConversions: 0,
        thisWeekRevenue: 0,
        lastWeekRevenue: 0
      };
      
      teacher.lastWeekStudents++;
      teacherMap.set(exp.teacherName, teacher);
    });

    return Array.from(teacherMap.values())
      .map((teacher, index) => {
        const thisWeekConversionRate = teacher.thisWeekStudents > 0 
          ? (teacher.thisWeekConversions / teacher.thisWeekStudents) * 100 
          : 0;
        const lastWeekConversionRate = teacher.lastWeekStudents > 0 
          ? (teacher.lastWeekConversions / teacher.lastWeekStudents) * 100 
          : 0;

        const conversionRateChange = thisWeekConversionRate - lastWeekConversionRate;
        const revenueChange = teacher.thisWeekRevenue - teacher.lastWeekRevenue;
        const revenueChangePercent = teacher.lastWeekRevenue > 0 
          ? (revenueChange / teacher.lastWeekRevenue) * 100 
          : (teacher.thisWeekRevenue > 0 ? 100 : 0);

        const getTrend = (change: number): 'up' | 'down' | 'stable' => {
          if (change > 5) return 'up';
          if (change < -5) return 'down';
          return 'stable';
        };

        const getStatus = (conversionChange: number, revenueChangePercent: number): 'excellent' | 'good' | 'needs_attention' => {
          if (conversionChange > 10 && revenueChangePercent > 15) return 'excellent';
          if (conversionChange > -5 && revenueChangePercent > -10) return 'good';
          return 'needs_attention';
        };

        return {
          ...teacher,
          conversionRateChange,
          revenueChange,
          trend: getTrend(revenueChangePercent),
          rank: index + 1,
          weeklyGrowth: revenueChangePercent,
          status: getStatus(conversionRateChange, revenueChangePercent)
        };
      })
      .sort((a, b) => b.weeklyGrowth - a.weeklyGrowth)
      .map((teacher, index) => ({ ...teacher, rank: index + 1 }));
  }, [thisWeekConversions, lastWeekConversions, thisWeekAttendance, lastWeekAttendance]);

  // 計算週度轉換趨勢
  const weeklyConversionTrends = useMemo((): WeeklyConversionTrend[] => {
    const stages = [
      { stage: '體驗諮詢', thisWeek: thisWeekAttendance.length, lastWeek: lastWeekAttendance.length },
      { stage: '購買成交', thisWeek: thisWeekConversions.length, lastWeek: lastWeekConversions.length },
      { stage: '後續諮詢', thisWeek: thisWeekConversions.length, lastWeek: lastWeekConversions.length }
    ];

    return stages.map((stage, index) => {
      const change = stage.thisWeek - stage.lastWeek;
      const changePercent = stage.lastWeek > 0 ? (change / stage.lastWeek) * 100 : (stage.thisWeek > 0 ? 100 : 0);
      
      const conversionRate = index > 0 && stages[index - 1].thisWeek > 0 
        ? (stage.thisWeek / stages[index - 1].thisWeek) * 100 
        : 100;
      const previousConversionRate = index > 0 && stages[index - 1].lastWeek > 0 
        ? (stage.lastWeek / stages[index - 1].lastWeek) * 100 
        : 100;

      return {
        stage: stage.stage,
        thisWeekCount: stage.thisWeek,
        lastWeekCount: stage.lastWeek,
        change,
        changePercent,
        conversionRate,
        previousConversionRate
      };
    });
  }, [thisWeekAttendance, lastWeekAttendance, thisWeekConversions, lastWeekConversions]);

  // 刷新數據
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchAttendance(),
        refetchRegistration(),
        refetchConversion()
      ]);
      setLastRefresh(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };

  // 生成決策表格
  const generateDecisionTables = () => {
    setGeneratedTables([
      {
        id: 'weekly_teacher_ranking',
        name: '教師週度績效對比表',
        description: `${selectedWeekStart && !isNaN(new Date(selectedWeekStart).getTime()) ? 
          format(new Date(selectedWeekStart), 'yyyy年MM月dd日', { locale: zhTW }) : 
          '本週'} vs 上週教師表現對比`,
        headers: ['排名', '教師', '本週學生', '上週學生', '本週成交', '上週成交', '轉換率變化', '營收變化', '成長率', '狀態'],
        rows: weeklyTeacherPerformances.map(perf => [
          perf.rank,
          perf.teacherName,
          perf.thisWeekStudents,
          perf.lastWeekStudents,
          perf.thisWeekConversions,
          perf.lastWeekConversions,
          `${perf.conversionRateChange > 0 ? '+' : ''}${perf.conversionRateChange.toFixed(1)}%`,
          `${perf.revenueChange > 0 ? '+' : ''}${perf.revenueChange.toLocaleString()}元`,
          `${perf.weeklyGrowth > 0 ? '+' : ''}${perf.weeklyGrowth.toFixed(1)}%`,
          perf.status === 'excellent' ? '優秀' : 
          perf.status === 'good' ? '良好' : '需關注'
        ])
      },
      {
        id: 'weekly_kpi_comparison',
        name: '週度KPI對比表',
        description: '關鍵指標週度變化分析',
        headers: ['指標', '本週數值', '上週數值', '差異', '變化率', '趨勢', '狀態'],
        rows: weeklyKPIs.map(kpi => [
          kpi.name,
          kpi.id === 'revenue' ? `${kpi.thisWeekValue.toLocaleString()}元` : 
          kpi.id === 'conversion_rate' ? `${kpi.thisWeekValue}%` : kpi.thisWeekValue,
          kpi.id === 'revenue' ? `${kpi.lastWeekValue.toLocaleString()}元` : 
          kpi.id === 'conversion_rate' ? `${kpi.lastWeekValue}%` : kpi.lastWeekValue,
          kpi.id === 'revenue' ? `${kpi.change > 0 ? '+' : ''}${kpi.change.toLocaleString()}元` :
          `${kpi.change > 0 ? '+' : ''}${kpi.change}`,
          `${kpi.changePercent > 0 ? '+' : ''}${kpi.changePercent.toFixed(1)}%`,
          kpi.trend === 'up' ? '↗️' : kpi.trend === 'down' ? '↘️' : '→',
          kpi.status === 'excellent' ? '優秀' : 
          kpi.status === 'good' ? '良好' : '需關注'
        ])
      },
      {
        id: 'weekly_conversion_pipeline',
        name: '週度轉換漏斗對比',
        description: '學生轉換各階段週度變化',
        headers: ['轉換階段', '本週數量', '上週數量', '數量變化', '變化率', '轉換率', '轉換率變化'],
        rows: weeklyConversionTrends.map(trend => [
          trend.stage,
          trend.thisWeekCount,
          trend.lastWeekCount,
          `${trend.change > 0 ? '+' : ''}${trend.change}`,
          `${trend.changePercent > 0 ? '+' : ''}${trend.changePercent.toFixed(1)}%`,
          `${trend.conversionRate.toFixed(1)}%`,
          `${(trend.conversionRate - trend.previousConversionRate) > 0 ? '+' : ''}${(trend.conversionRate - trend.previousConversionRate).toFixed(1)}%`
        ])
      }
    ]);
  };

  // CSV 導出功能
  const exportToCSV = (table: DecisionTable) => {
    const csvContent = [
      table.headers.join(','),
      ...table.rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${table.name}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            週度戰力會議
          </h1>
          <p className="text-muted-foreground">
            週度對比分析 - {selectedWeekStart && !isNaN(new Date(selectedWeekStart).getTime()) ? 
              `${format(new Date(selectedWeekStart), 'yyyy年MM月dd日', { locale: zhTW })} 週` : 
              '本週'} vs 上週表現分析
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="week"
            value={`${format(thisWeekStart, 'yyyy')}-W${format(thisWeekStart, 'II')}`}
            onChange={(e) => {
              try {
                const [year, week] = e.target.value.split('-W');
                const yearNum = parseInt(year);
                const weekNum = parseInt(week);
                
                if (yearNum && weekNum && yearNum > 2000 && yearNum < 3000 && weekNum > 0 && weekNum <= 53) {
                  // 使用date-fns更安全的方式計算週開始日期
                  let targetDate = setYear(new Date(), yearNum);
                  targetDate = setWeek(targetDate, weekNum, { weekStartsOn: 1 });
                  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
                  setSelectedWeekStart(format(weekStart, 'yyyy-MM-dd'));
                }
              } catch (error) {
                console.error('Week calculation error:', error);
                // 如果出錯，保持當前週不變
              }
            }}
            className="px-3 py-2 border rounded-md"
            data-testid="input-week-selector"
          />
          <Button
            onClick={refreshData}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            data-testid="button-refresh-data"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新數據
          </Button>
          <Button
            onClick={generateDecisionTables}
            size="sm"
            data-testid="button-generate-tables"
          >
            <TableIcon className="h-4 w-4 mr-2" />
            生成決策表格
          </Button>
        </div>
      </div>

      {/* 週度KPI對比 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {weeklyKPIs.map((kpi) => {
          const IconComponent = kpi.icon;
          return (
            <Card key={kpi.id} className="relative">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.name}</CardTitle>
                <IconComponent className={`h-4 w-4 text-white`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {kpi.id === 'revenue' ? `${kpi.thisWeekValue.toLocaleString()}元` : 
                   kpi.id === 'conversion_rate' ? `${kpi.thisWeekValue}%` : 
                   kpi.thisWeekValue}
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-2">
                  <span>上週: {kpi.id === 'revenue' ? `${kpi.lastWeekValue.toLocaleString()}元` : 
                                kpi.id === 'conversion_rate' ? `${kpi.lastWeekValue}%` : 
                                kpi.lastWeekValue}</span>
                </div>
                <div className={`flex items-center text-xs mt-1 ${
                  kpi.trend === 'up' ? 'text-red-600' :
                  kpi.trend === 'down' ? 'text-green-600' :
                  'text-gray-600'
                }`}>
                  {kpi.trend === 'up' && <ArrowUp className="h-3 w-3 mr-1" />}
                  {kpi.trend === 'down' && <ArrowDown className="h-3 w-3 mr-1" />}
                  {kpi.trend === 'stable' && <Minus className="h-3 w-3 mr-1" />}
                  {kpi.change > 0 ? '+' : ''}{kpi.change}{kpi.id === 'revenue' ? '元' : kpi.id === 'conversion_rate' ? '%' : ''}
                  ({kpi.changePercent > 0 ? '+' : ''}{kpi.changePercent.toFixed(1)}%)
                </div>
                <Badge 
                  variant={kpi.status === 'excellent' ? 'default' : 
                          kpi.status === 'good' ? 'secondary' : 'destructive'}
                  className="mt-2 text-xs"
                >
                  {kpi.status === 'excellent' ? '優秀' : 
                   kpi.status === 'good' ? '良好' : '需關注'}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 主要分析區域 */}
      <Tabs defaultValue="teacher_comparison" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="teacher_comparison" data-testid="tab-teacher-comparison">教師週度對比</TabsTrigger>
          <TabsTrigger value="conversion_trends" data-testid="tab-conversion-trends">轉換趨勢分析</TabsTrigger>
          <TabsTrigger value="decision_tables" data-testid="tab-decision-tables">決策分析表格</TabsTrigger>
        </TabsList>

        <TabsContent value="teacher_comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                教師週度績效對比排行
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>排名</TableHead>
                    <TableHead>教師姓名</TableHead>
                    <TableHead>本週學生</TableHead>
                    <TableHead>上週學生</TableHead>
                    <TableHead>本週成交</TableHead>
                    <TableHead>上週成交</TableHead>
                    <TableHead>轉換率變化</TableHead>
                    <TableHead>營收變化</TableHead>
                    <TableHead>週成長率</TableHead>
                    <TableHead>狀態</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weeklyTeacherPerformances.map((teacher) => (
                    <TableRow key={teacher.teacherName}>
                      <TableCell className="font-medium">#{teacher.rank}</TableCell>
                      <TableCell className="font-semibold">{teacher.teacherName}</TableCell>
                      <TableCell>{teacher.thisWeekStudents}</TableCell>
                      <TableCell className="text-muted-foreground">{teacher.lastWeekStudents}</TableCell>
                      <TableCell>{teacher.thisWeekConversions}</TableCell>
                      <TableCell className="text-muted-foreground">{teacher.lastWeekConversions}</TableCell>
                      <TableCell className={teacher.conversionRateChange >= 0 ? 'text-red-600' : 'text-green-600'}>
                        {teacher.conversionRateChange > 0 ? '+' : ''}{teacher.conversionRateChange.toFixed(1)}%
                      </TableCell>
                      <TableCell className={teacher.revenueChange >= 0 ? 'text-red-600' : 'text-green-600'}>
                        {teacher.revenueChange > 0 ? '+' : ''}{teacher.revenueChange.toLocaleString()}元
                      </TableCell>
                      <TableCell className={teacher.weeklyGrowth >= 0 ? 'text-red-600' : 'text-green-600'}>
                        {teacher.weeklyGrowth > 0 ? '+' : ''}{teacher.weeklyGrowth.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={teacher.status === 'excellent' ? 'default' : 
                                  teacher.status === 'good' ? 'secondary' : 'destructive'}
                        >
                          {teacher.status === 'excellent' ? '優秀' : 
                           teacher.status === 'good' ? '良好' : '需關注'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion_trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                週度轉換漏斗趨勢分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weeklyConversionTrends.map((trend, index) => (
                  <div key={trend.stage} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{trend.stage}</h3>
                      <Badge variant={trend.changePercent >= 0 ? 'default' : 'destructive'}>
                        {trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">本週數量</p>
                        <p className="text-2xl font-bold">{trend.thisWeekCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">上週數量</p>
                        <p className="text-xl text-muted-foreground">{trend.lastWeekCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">數量變化</p>
                        <p className={`text-xl font-semibold ${trend.change >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {trend.change > 0 ? '+' : ''}{trend.change}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">轉換率</p>
                        <p className="text-xl">{trend.conversionRate.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={Math.min(trend.conversionRate, 100)} 
                          className="flex-1 h-2" 
                        />
                        <span className={`text-sm ${(trend.conversionRate - trend.previousConversionRate) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {(trend.conversionRate - trend.previousConversionRate) > 0 ? '+' : ''}
                          {(trend.conversionRate - trend.previousConversionRate).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decision_tables" className="space-y-4">
          {generatedTables.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  週度決策分析表格
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center py-8">
                <TableIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">點擊「生成決策表格」按鈕，自動生成週度管理決策分析表格</p>
                <Button onClick={generateDecisionTables} data-testid="button-generate-decision-tables">
                  <Sparkles className="h-4 w-4 mr-2" />
                  生成決策表格
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {generatedTables.map((table) => (
                <Card key={table.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{table.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{table.description}</p>
                      </div>
                      <Button
                        onClick={() => exportToCSV(table)}
                        variant="outline"
                        size="sm"
                        data-testid={`button-export-${table.id}`}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        導出CSV
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {table.headers.map((header) => (
                            <TableHead key={header}>{header}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {table.rows.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <TableCell key={cellIndex}>{cell}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 最後更新時間 */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          最後更新: {format(lastRefresh, 'HH:mm:ss', { locale: zhTW })}
        </div>
        <div className="text-xs">
          數據每30秒自動刷新 | 週度對比分析系統
        </div>
      </div>
    </div>
  );
}
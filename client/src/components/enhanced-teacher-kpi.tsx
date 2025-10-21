import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PurchaseRecord, ConsultationRecord } from '@shared/schema';
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
  Minus,
  Eye,
  Filter,
  Search,
  Star,
  ThumbsUp,
  ThumbsDown,
  TrendingUpIcon,
  RotateCcw,
  Lightbulb,
  Trophy
} from 'lucide-react';
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface TeacherKPI {
  teacherName: string;
  totalStudents: number;
  totalConversions: number;
  totalRevenue: number;
  conversionRate: number;
  averageRevenue: number;
  studentsThisMonth: number;
  conversionsThisMonth: number;
  revenueThisMonth: number;
  studentsLastMonth: number;
  conversionsLastMonth: number;
  revenueLastMonth: number;
  monthlyGrowthRate: number;
  dailyAverage: number;
  weeklyTrend: 'up' | 'down' | 'stable';
  performance: 'excellent' | 'good' | 'average' | 'needs_attention';
  rank: number;
  suggestions: string[];
  strengths: string[];
  concerns: string[];
}

interface TeacherTrend {
  date: string;
  students: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
}

interface TeacherGoal {
  teacherName: string;
  monthlyStudentGoal: number;
  monthlyConversionGoal: number;
  monthlyRevenueGoal: number;
  actualStudents: number;
  actualConversions: number;
  actualRevenue: number;
  studentAchievement: number;
  conversionAchievement: number;
  revenueAchievement: number;
}

export function EnhancedTeacherKPI() {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'individual' | 'trends' | 'goals'>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // 動態獲取所有可用worksheets
  const { data: availableWorksheets = [] } = useQuery<any[]>({
    queryKey: ['/api/worksheets'],
    refetchInterval: 30000,
  });

  // 智能識別數據類型的worksheets
  const dataSourceMap = useMemo(() => {
    const attendanceSheet = availableWorksheets.find(w => 
      w.isEnabled && (
        w.worksheetName?.includes('上課記錄') || 
        w.headers?.some((h: string) => h.includes('授課老師') || h.includes('上課日期'))
      )
    );
    
    const registrationSheet = availableWorksheets.find(w => 
      w.isEnabled && (
        w.worksheetName?.includes('購買記錄') || 
        w.headers?.some((h: string) => h.includes('購買日期') || h.includes('課程類型'))
      )
    );
    
    const conversionSheet = availableWorksheets.find(w => 
      w.isEnabled && (
        w.worksheetName?.includes('EODs') || w.worksheetName?.includes('Closers') ||
        w.headers?.some((h: string) => h.includes('成交') || h.includes('諮詢'))
      )
    );

    return {
      attendance: attendanceSheet,
      registration: registrationSheet, 
      conversion: conversionSheet
    };
  }, [availableWorksheets]);

  // 動態獲取體驗課上課記錄數據 (用於學生統計)
  const { data: attendanceData = [], refetch: refetchAttendance } = useQuery<any[]>({
    queryKey: ['/api/worksheets', dataSourceMap.attendance?.id, 'data'],
    enabled: !!dataSourceMap.attendance?.id,
    refetchInterval: 30000,
  });

  // 動態獲取體驗課購買記錄數據 (用於註冊統計)
  const { data: registrationData = [], refetch: refetchRegistration } = useQuery<any[]>({
    queryKey: ['/api/worksheets', dataSourceMap.registration?.id, 'data'], 
    enabled: !!dataSourceMap.registration?.id,
    refetchInterval: 30000,
  });

  // 動態獲取成交記錄數據 (用於轉換統計)
  const { data: conversionData = [], refetch: refetchConversion } = useQuery<any[]>({
    queryKey: ['/api/worksheets', dataSourceMap.conversion?.id, 'data'],
    enabled: !!dataSourceMap.conversion?.id,
    refetchInterval: 30000,
  });

  // 通用欄位映射系統 - 處理中英文欄位名稱
  const fieldMapping = useMemo(() => {
    return {
      // Email關聯欄位 (主鍵)
      getEmailField: (record: any) => {
        return record.email || record.Email || record['學員信箱'] || record['客戶信箱'] || record['學員Email'] || '';
      },
      
      // 教師姓名欄位
      getTeacherField: (record: any) => {
        return record['授課老師'] || record['負責老師'] || record['業務'] || record['（諮詢）諮詢人員'] || record.teacher || '';
      },
      
      // 日期欄位
      getDateField: (record: any, type: 'attendance' | 'registration' | 'conversion') => {
        switch (type) {
          case 'attendance':
            return record['上課日期'] || record.date || record.attendanceDate || '';
          case 'registration':
            return record['購買日期'] || record['體驗課購買日期'] || record.purchaseDate || '';
          case 'conversion':
            return record['（諮詢）成交日期'] || record['成交日期'] || record.conversionDate || '';
          default:
            return '';
        }
      },
      
      // 金額欄位
      getAmountField: (record: any) => {
        const amountStr = record['成交金額'] || record['（諮詢）實收金額'] || record['價格'] || record.amount || '0';
        return typeof amountStr === 'number' ? amountStr : parseFloat(String(amountStr).replace(/[^\d.-]/g, '')) || 0;
      },
      
      // 學生姓名欄位
      getStudentNameField: (record: any) => {
        return record['姓名'] || record.Name || record.name || record['學員姓名'] || '';
      }
    };
  }, []);

  // 標準化數據格式
  const normalizedData = useMemo(() => {
    const normalizeRecords = (data: any[], type: 'attendance' | 'registration' | 'conversion') => {
      return data.map(record => ({
        email: fieldMapping.getEmailField(record),
        teacherName: fieldMapping.getTeacherField(record),
        studentName: fieldMapping.getStudentNameField(record),
        date: fieldMapping.getDateField(record, type),
        amount: type === 'conversion' ? fieldMapping.getAmountField(record) : 0,
        type,
        originalData: record
      })).filter(r => r.email && r.teacherName); // 只保留有email和教師姓名的記錄
    };

    return {
      attendance: normalizeRecords(attendanceData, 'attendance'),
      registration: normalizeRecords(registrationData, 'registration'),
      conversion: normalizeRecords(conversionData, 'conversion')
    };
  }, [attendanceData, registrationData, conversionData, fieldMapping]);

  // 計算期間範圍
  const periodRanges = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    
    switch (selectedPeriod) {
      case 'week':
        return {
          current: { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) },
          previous: { start: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), end: endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }) }
        };
      case 'quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
        const prevQuarterStart = new Date(quarterStart.getFullYear(), quarterStart.getMonth() - 3, 1);
        const prevQuarterEnd = new Date(prevQuarterStart.getFullYear(), prevQuarterStart.getMonth() + 3, 0);
        return {
          current: { start: quarterStart, end: quarterEnd },
          previous: { start: prevQuarterStart, end: prevQuarterEnd }
        };
      default: // month
        return {
          current: { start: startOfMonth(now), end: endOfMonth(now) },
          previous: { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) }
        };
    }
  }, [selectedPeriod]);

  // 過濾期間數據 - 使用標準化數據
  const currentPeriodData = useMemo(() => {
    const filterByPeriod = (data: any[], period: { start: Date, end: Date }) => {
      return data.filter(record => {
        if (!record.date) return false;
        const recordDate = new Date(record.date);
        return isWithinInterval(recordDate, period);
      });
    };

    return {
      attendance: filterByPeriod(normalizedData.attendance, periodRanges.current),
      registration: filterByPeriod(normalizedData.registration, periodRanges.current), 
      conversion: filterByPeriod(normalizedData.conversion, periodRanges.current)
    };
  }, [normalizedData, periodRanges]);

  const previousPeriodData = useMemo(() => {
    const filterByPeriod = (data: any[], period: { start: Date, end: Date }) => {
      return data.filter(record => {
        if (!record.date) return false;
        const recordDate = new Date(record.date);
        return isWithinInterval(recordDate, period);
      });
    };

    return {
      attendance: filterByPeriod(normalizedData.attendance, periodRanges.previous),
      registration: filterByPeriod(normalizedData.registration, periodRanges.previous),
      conversion: filterByPeriod(normalizedData.conversion, periodRanges.previous)
    };
  }, [normalizedData, periodRanges]);

  // 計算教師KPI - 使用標準化數據
  const teacherKPIs = useMemo((): TeacherKPI[] => {
    const teacherMap = new Map<string, any>();

    // 統計當前期間數據 - 使用標準化數據
    currentPeriodData.attendance.forEach(record => {
      if (!record.teacherName) return;
      
      const teacher = teacherMap.get(record.teacherName) || {
        teacherName: record.teacherName,
        totalStudents: 0,
        totalConversions: 0,
        totalRevenue: 0,
        studentsThisMonth: 0,
        conversionsThisMonth: 0,
        revenueThisMonth: 0,
        studentsLastMonth: 0,
        conversionsLastMonth: 0,
        revenueLastMonth: 0
      };
      
      teacher.studentsThisMonth++;
      teacherMap.set(record.teacherName, teacher);
    });

    currentPeriodData.conversion.forEach(record => {
      if (!record.teacherName) return;
      
      const teacher = teacherMap.get(record.teacherName) || {
        teacherName: record.teacherName,
        totalStudents: 0,
        totalConversions: 0,
        totalRevenue: 0,
        studentsThisMonth: 0,
        conversionsThisMonth: 0,
        revenueThisMonth: 0,
        studentsLastMonth: 0,
        conversionsLastMonth: 0,
        revenueLastMonth: 0
      };
      
      teacher.conversionsThisMonth++;
      teacher.revenueThisMonth += record.amount || 0;
      teacherMap.set(record.teacherName, teacher);
    });

    // 統計上期數據 - 使用標準化數據
    previousPeriodData.attendance.forEach(record => {
      if (!record.teacherName) return;
      
      const teacher = teacherMap.get(record.teacherName) || {
        teacherName: record.teacherName,
        totalStudents: 0,
        totalConversions: 0,
        totalRevenue: 0,
        studentsThisMonth: 0,
        conversionsThisMonth: 0,
        revenueThisMonth: 0,
        studentsLastMonth: 0,
        conversionsLastMonth: 0,
        revenueLastMonth: 0
      };
      
      teacher.studentsLastMonth++;
      teacherMap.set(record.teacherName, teacher);
    });

    previousPeriodData.conversion.forEach(record => {
      if (!record.teacherName) return;
      
      const teacher = teacherMap.get(record.teacherName) || {
        teacherName: record.teacherName,
        totalStudents: 0,
        totalConversions: 0,
        totalRevenue: 0,
        studentsThisMonth: 0,
        conversionsThisMonth: 0,
        revenueThisMonth: 0,
        studentsLastMonth: 0,
        conversionsLastMonth: 0,
        revenueLastMonth: 0
      };
      
      teacher.conversionsLastMonth++;
      teacher.revenueLastMonth += record.amount || 0;
      teacherMap.set(record.teacherName, teacher);
    });

    // 統計總體數據 - 使用所有標準化數據
    normalizedData.attendance.forEach(record => {
      if (!record.teacherName) return;
      const teacher = teacherMap.get(record.teacherName);
      if (teacher) {
        teacher.totalStudents++;
      }
    });

    normalizedData.conversion.forEach(record => {
      if (!record.teacherName) return;
      const teacher = teacherMap.get(record.teacherName);
      if (teacher) {
        teacher.totalConversions++;
        teacher.totalRevenue += record.amount || 0;
      }
    });

    return Array.from(teacherMap.values())
      .map((teacher, index) => {
        const conversionRate = teacher.studentsThisMonth > 0 
          ? (teacher.conversionsThisMonth / teacher.studentsThisMonth) * 100 
          : 0;
        
        const averageRevenue = teacher.conversionsThisMonth > 0 
          ? teacher.revenueThisMonth / teacher.conversionsThisMonth 
          : 0;

        const revenueGrowth = teacher.revenueLastMonth > 0 
          ? ((teacher.revenueThisMonth - teacher.revenueLastMonth) / teacher.revenueLastMonth) * 100 
          : (teacher.revenueThisMonth > 0 ? 100 : 0);

        const totalConversionRate = teacher.totalStudents > 0 
          ? (teacher.totalConversions / teacher.totalStudents) * 100 
          : 0;

        const getDaysInPeriod = () => {
          switch (selectedPeriod) {
            case 'week': return 7;
            case 'quarter': return 90;
            default: return 30;
          }
        };

        const dailyAverage = teacher.studentsThisMonth / getDaysInPeriod();

        const getWeeklyTrend = (): 'up' | 'down' | 'stable' => {
          if (revenueGrowth > 10) return 'up';
          if (revenueGrowth < -10) return 'down';
          return 'stable';
        };

        const getPerformance = (): 'excellent' | 'good' | 'average' | 'needs_attention' => {
          if (conversionRate >= 25 && revenueGrowth > 15) return 'excellent';
          if (conversionRate >= 15 && revenueGrowth > 0) return 'good';
          if (conversionRate >= 10) return 'average';
          return 'needs_attention';
        };

        // 生成個人化改善建議
        const generateSuggestions = (): string[] => {
          const suggestions: string[] = [];
          
          if (conversionRate < 10) {
            suggestions.push('建議加強課程引導技巧，提高學生報名意願');
          }
          if (teacher.studentsThisMonth > 0 && conversionRate < 15) {
            suggestions.push('可考慮優化體驗課內容，增加互動環節');
          }
          if (revenueGrowth < -10) {
            suggestions.push('建議檢討教學方法，重新評估課程定位');
          }
          if (teacher.studentsThisMonth < dailyAverage * 20) {
            suggestions.push('建議增加招生活動，擴大學生基數');
          }
          if (averageRevenue < 3000) {
            suggestions.push('可考慮推廣高價值課程，提升客單價');
          }
          
          return suggestions.length > 0 ? suggestions : ['保持當前表現，持續努力'];
        };

        const generateStrengths = (): string[] => {
          const strengths: string[] = [];
          
          if (conversionRate >= 20) {
            strengths.push('轉換率表現優異');
          }
          if (revenueGrowth > 15) {
            strengths.push('營收成長強勁');
          }
          if (teacher.studentsThisMonth >= dailyAverage * 25) {
            strengths.push('學生招募能力強');
          }
          if (averageRevenue >= 4000) {
            strengths.push('高價值課程銷售佳');
          }
          
          return strengths.length > 0 ? strengths : ['持續展現穩定表現'];
        };

        const generateConcerns = (): string[] => {
          const concerns: string[] = [];
          
          if (conversionRate < 5) {
            concerns.push('轉換率偏低，需要關注');
          }
          if (revenueGrowth < -20) {
            concerns.push('營收下降幅度較大');
          }
          if (teacher.studentsThisMonth === 0) {
            concerns.push('本期無新學生，需要加強招生');
          }
          
          return concerns;
        };

        return {
          ...teacher,
          conversionRate,
          averageRevenue,
          monthlyGrowthRate: revenueGrowth,
          dailyAverage,
          weeklyTrend: getWeeklyTrend(),
          performance: getPerformance(),
          rank: index + 1,
          suggestions: generateSuggestions(),
          strengths: generateStrengths(),
          concerns: generateConcerns()
        };
      })
      .sort((a, b) => b.revenueThisMonth - a.revenueThisMonth)
      .map((teacher, index) => ({ ...teacher, rank: index + 1 }));
  }, [currentPeriodData, previousPeriodData, normalizedData, selectedPeriod]);

  // 計算教師趨勢數據（過去30天）
  const teacherTrends = useMemo((): Map<string, TeacherTrend[]> => {
    const trendsMap = new Map<string, TeacherTrend[]>();
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), i);
      return format(date, 'yyyy-MM-dd');
    }).reverse();

    teacherKPIs.forEach(teacher => {
      const trends: TeacherTrend[] = last30Days.map(date => {
        const dayStart = startOfDay(new Date(date));
        const dayEnd = endOfDay(new Date(date));

        const dayConversions = normalizedData.conversion.filter(record => 
          record.teacherName === teacher.teacherName && 
          record.date &&
          isWithinInterval(new Date(record.date), { start: dayStart, end: dayEnd })
        );

        const dayAttendance = normalizedData.attendance.filter(record => 
          record.teacherName === teacher.teacherName && 
          record.date &&
          isWithinInterval(new Date(record.date), { start: dayStart, end: dayEnd })
        );

        const students = dayAttendance.length;
        const conversions = dayConversions.length;
        const revenue = dayConversions.reduce((sum, record) => sum + (record.amount || 0), 0);
        const conversionRate = students > 0 ? (conversions / students) * 100 : 0;

        return {
          date,
          students,
          conversions,
          revenue,
          conversionRate
        };
      });

      trendsMap.set(teacher.teacherName, trends);
    });

    return trendsMap;
  }, [teacherKPIs, normalizedData]);

  // 計算教師目標達成情況
  const teacherGoals = useMemo((): TeacherGoal[] => {
    return teacherKPIs.map(teacher => {
      // 模擬目標設定（實際應用中這些目標應該來自配置或數據庫）
      const monthlyStudentGoal = Math.max(50, teacher.studentsThisMonth * 1.2);
      const monthlyConversionGoal = Math.max(10, teacher.conversionsThisMonth * 1.1);
      const monthlyRevenueGoal = Math.max(30000, teacher.revenueThisMonth * 1.15);

      const studentAchievement = (teacher.studentsThisMonth / monthlyStudentGoal) * 100;
      const conversionAchievement = (teacher.conversionsThisMonth / monthlyConversionGoal) * 100;
      const revenueAchievement = (teacher.revenueThisMonth / monthlyRevenueGoal) * 100;

      return {
        teacherName: teacher.teacherName,
        monthlyStudentGoal,
        monthlyConversionGoal,
        monthlyRevenueGoal,
        actualStudents: teacher.studentsThisMonth,
        actualConversions: teacher.conversionsThisMonth,
        actualRevenue: teacher.revenueThisMonth,
        studentAchievement,
        conversionAchievement,
        revenueAchievement
      };
    });
  }, [teacherKPIs]);

  // 獲取所有教師名單 - 使用標準化數據
  const teacherNames = useMemo(() => {
    const allTeachers = [
      ...normalizedData.attendance.map(record => record.teacherName),
      ...normalizedData.conversion.map(record => record.teacherName)
    ];
    
    return Array.from(new Set(allTeachers)).filter(Boolean).sort();
  }, [normalizedData]);

  // 刷新數據 - 更新為新的數據源
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

  // 安全的CSV字段處理 - 防止公式注入（遵循OWASP建議）
  const sanitizeCSVField = (field: any): string => {
    const str = String(field);
    // 如果以可能的公式字符開頭，添加單引號前綴
    // 包含 = + - @ \t \r 等危險字符
    if (str.match(/^[=+\-@\t\r]/)) {
      return `'${str}`;
    }
    return str;
  };

  // 導出功能
  const exportKPIData = () => {
    const csvData = [
      ['教師姓名', '學生數', '成交數', '成交率', '成交金額', '平均單價', '成長率', '績效等級'],
      ...teacherKPIs.map(teacher => [
        sanitizeCSVField(teacher.teacherName),
        sanitizeCSVField(teacher.studentsThisMonth),
        sanitizeCSVField(teacher.conversionsThisMonth),
        sanitizeCSVField(`${teacher.conversionRate.toFixed(1)}%`),
        sanitizeCSVField(teacher.revenueThisMonth),
        sanitizeCSVField(teacher.averageRevenue.toFixed(0)),
        sanitizeCSVField(`${teacher.monthlyGrowthRate.toFixed(1)}%`),
        sanitizeCSVField(teacher.performance === 'excellent' ? '優秀' : 
        teacher.performance === 'good' ? '良好' : 
        teacher.performance === 'average' ? '一般' : '需關注')
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `教師績效KPI_${format(new Date(), 'yyyy-MM-dd')}.csv`);
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
            <Award className="h-8 w-8 text-primary" />
            教師績效KPI分析
          </h1>
          <p className="text-muted-foreground">
            深度分析教師表現指標，提供個人化績效洞察與改善建議
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
            <SelectTrigger className="w-32" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">本週</SelectItem>
              <SelectItem value="month">本月</SelectItem>
              <SelectItem value="quarter">本季</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={refreshData}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            data-testid="button-refresh-kpi"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新數據
          </Button>
          <Button
            onClick={exportKPIData}
            variant="outline"
            size="sm"
            data-testid="button-export-kpi"
          >
            <Download className="h-4 w-4 mr-2" />
            導出KPI
          </Button>
        </div>
      </div>

      {/* 快速統計概覽 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活躍教師</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teacherKPIs.length}</div>
            <p className="text-xs text-muted-foreground">
              本{selectedPeriod === 'week' ? '週' : selectedPeriod === 'month' ? '月' : '季'}有教學活動
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">優秀教師</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teacherKPIs.filter(t => t.performance === 'excellent').length}
            </div>
            <p className="text-xs text-muted-foreground">
              績效評級為優秀
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均轉換率</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teacherKPIs.length > 0 
                ? (teacherKPIs.reduce((sum, t) => sum + t.conversionRate, 0) / teacherKPIs.length).toFixed(1)
                : '0'
              }%
            </div>
            <p className="text-xs text-muted-foreground">
              所有教師平均值
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總營收</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teacherKPIs.reduce((sum, t) => sum + t.revenueThisMonth, 0).toLocaleString()}元
            </div>
            <p className="text-xs text-muted-foreground">
              本{selectedPeriod === 'week' ? '週' : selectedPeriod === 'month' ? '月' : '季'}總計
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 主要分析區域 */}
      <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">綜合概覽</TabsTrigger>
          <TabsTrigger value="individual" data-testid="tab-individual">個別分析</TabsTrigger>
          <TabsTrigger value="trends" data-testid="tab-trends">趨勢追蹤</TabsTrigger>
          <TabsTrigger value="goals" data-testid="tab-goals">目標達成</TabsTrigger>
        </TabsList>

        {/* 綜合概覽 */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                教師績效排行榜
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>排名</TableHead>
                    <TableHead>教師姓名</TableHead>
                    <TableHead>學生數</TableHead>
                    <TableHead>成交數</TableHead>
                    <TableHead>成交率</TableHead>
                    <TableHead>成交金額</TableHead>
                    <TableHead>平均單價</TableHead>
                    <TableHead>成長率</TableHead>
                    <TableHead>績效等級</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacherKPIs.map((teacher) => (
                    <TableRow key={teacher.teacherName}>
                      <TableCell className="font-medium">#{teacher.rank}</TableCell>
                      <TableCell className="font-semibold">{teacher.teacherName}</TableCell>
                      <TableCell>{teacher.studentsThisMonth}</TableCell>
                      <TableCell>{teacher.conversionsThisMonth}</TableCell>
                      <TableCell>
                        <Badge variant={teacher.conversionRate >= 20 ? 'default' : teacher.conversionRate >= 10 ? 'secondary' : 'destructive'}>
                          {teacher.conversionRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>{teacher.revenueThisMonth.toLocaleString()}元</TableCell>
                      <TableCell>{teacher.averageRevenue.toFixed(0)}元</TableCell>
                      <TableCell className={teacher.monthlyGrowthRate >= 0 ? 'text-red-600' : 'text-green-600'}>
                        <div className="flex items-center gap-1">
                          {teacher.weeklyTrend === 'up' && <ArrowUp className="h-4 w-4" />}
                          {teacher.weeklyTrend === 'down' && <ArrowDown className="h-4 w-4" />}
                          {teacher.weeklyTrend === 'stable' && <Minus className="h-4 w-4" />}
                          {teacher.monthlyGrowthRate > 0 ? '+' : ''}{teacher.monthlyGrowthRate.toFixed(1)}%
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={teacher.performance === 'excellent' ? 'default' : 
                                  teacher.performance === 'good' ? 'secondary' : 
                                  teacher.performance === 'average' ? 'outline' : 'destructive'}
                        >
                          {teacher.performance === 'excellent' ? '優秀' : 
                           teacher.performance === 'good' ? '良好' : 
                           teacher.performance === 'average' ? '一般' : '需關注'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTeacher(teacher.teacherName);
                            setViewMode('individual');
                          }}
                          data-testid={`button-view-${teacher.teacherName}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          詳情
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 個別分析 */}
        <TabsContent value="individual" className="space-y-4">
          {teacherNames.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2" data-testid="text-no-teachers">暫無教師數據</h3>
                <p className="text-muted-foreground text-center mb-4">
                  目前系統中沒有找到任何教師的績效數據。<br />
                  請確認已正確導入購買記錄和體驗課程數據。
                </p>
                <Button onClick={refreshData} disabled={isRefreshing} data-testid="button-refresh-empty-state">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  重新加載數據
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4">
                <Select 
                  value={selectedTeacher || ''} 
                  onValueChange={setSelectedTeacher}
                >
                  <SelectTrigger className="w-48" data-testid="select-teacher">
                    <SelectValue placeholder="選擇教師" />
                  </SelectTrigger>
                  <SelectContent>
                    {teacherNames.map(name => (
                      <SelectItem key={name} value={name} data-testid={`teacher-option-${name}`}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

          {selectedTeacher && (() => {
            const teacher = teacherKPIs.find(t => t.teacherName === selectedTeacher);
            const trends = teacherTrends.get(selectedTeacher) || [];
            
            if (!teacher) return <div>教師數據不存在</div>;

            return (
              <div className="space-y-4">
                {/* 個人KPI卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">本{selectedPeriod === 'week' ? '週' : selectedPeriod === 'month' ? '月' : '季'}學生數</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{teacher.studentsThisMonth}</div>
                      <div className="text-sm text-muted-foreground">
                        上期: {teacher.studentsLastMonth}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">成交數</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{teacher.conversionsThisMonth}</div>
                      <div className="text-sm text-muted-foreground">
                        上期: {teacher.conversionsLastMonth}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">轉換率</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{teacher.conversionRate.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">
                        全期總計: {teacher.totalStudents > 0 ? ((teacher.totalConversions / teacher.totalStudents) * 100).toFixed(1) : 0}%
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">營收金額</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{teacher.revenueThisMonth.toLocaleString()}元</div>
                      <div className="text-sm text-muted-foreground">
                        上期: {teacher.revenueLastMonth.toLocaleString()}元
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 個人化改善建議 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* 改善建議 */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        改善建議
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {teacher.suggestions.map((suggestion, idx) => (
                          <div key={idx} className="text-sm bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                            • {suggestion}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 優勢項目 */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-green-500" />
                        優勢項目
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {teacher.strengths.map((strength, idx) => (
                          <div key={idx} className="text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded">
                            ✓ {strength}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 關注點 */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        關注點
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {teacher.concerns.length > 0 ? (
                          teacher.concerns.map((concern, idx) => (
                            <div key={idx} className="text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
                              ⚠ {concern}
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                            ✓ 暫無需要關注的問題
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 趨勢圖表區域（這裡可以加入圖表庫，暫時用表格顯示） */}
                <Card>
                  <CardHeader>
                    <CardTitle>30天趨勢 - {teacher.teacherName}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground mb-4">
                      近30天每日表現數據（僅顯示最近10天）
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>日期</TableHead>
                          <TableHead>學生數</TableHead>
                          <TableHead>成交數</TableHead>
                          <TableHead>營收</TableHead>
                          <TableHead>轉換率</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trends.slice(-10).map((trend) => (
                          <TableRow key={trend.date}>
                            <TableCell>{format(new Date(trend.date), 'MM/dd', { locale: zhTW })}</TableCell>
                            <TableCell>{trend.students}</TableCell>
                            <TableCell>{trend.conversions}</TableCell>
                            <TableCell>{trend.revenue.toLocaleString()}元</TableCell>
                            <TableCell>{trend.conversionRate.toFixed(1)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
            </>
          )}
        </TabsContent>

        {/* 趨勢追蹤 */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                教師表現趨勢分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teacherKPIs.slice(0, 5).map((teacher) => {
                  const trends = teacherTrends.get(teacher.teacherName) || [];
                  const last7Days = trends.slice(-7);
                  const avgRevenue = last7Days.reduce((sum, t) => sum + t.revenue, 0) / 7;
                  
                  return (
                    <div key={teacher.teacherName} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{teacher.teacherName}</h3>
                        <Badge variant={teacher.performance === 'excellent' ? 'default' : 'secondary'}>
                          {teacher.performance === 'excellent' ? '優秀' : 
                           teacher.performance === 'good' ? '良好' : 
                           teacher.performance === 'average' ? '一般' : '需關注'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">日均學生</p>
                          <p className="text-xl font-bold">{teacher.dailyAverage.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">週均營收</p>
                          <p className="text-xl font-bold">{avgRevenue.toFixed(0)}元</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">成長趨勢</p>
                          <p className={`text-xl font-semibold flex items-center gap-1 ${
                            teacher.weeklyTrend === 'up' ? 'text-red-600' : 
                            teacher.weeklyTrend === 'down' ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {teacher.weeklyTrend === 'up' && <ArrowUp className="h-4 w-4" />}
                            {teacher.weeklyTrend === 'down' && <ArrowDown className="h-4 w-4" />}
                            {teacher.weeklyTrend === 'stable' && <Minus className="h-4 w-4" />}
                            {teacher.weeklyTrend === 'up' ? '上升' : 
                             teacher.weeklyTrend === 'down' ? '下降' : '穩定'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">成長率</p>
                          <p className={`text-xl font-semibold ${teacher.monthlyGrowthRate >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {teacher.monthlyGrowthRate > 0 ? '+' : ''}{teacher.monthlyGrowthRate.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 目標達成 */}
        <TabsContent value="goals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                目標達成狀況
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>教師姓名</TableHead>
                    <TableHead>學生目標</TableHead>
                    <TableHead>學生達成</TableHead>
                    <TableHead>成交目標</TableHead>
                    <TableHead>成交達成</TableHead>
                    <TableHead>營收目標</TableHead>
                    <TableHead>營收達成</TableHead>
                    <TableHead>總體評估</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacherGoals.map((goal) => (
                    <TableRow key={goal.teacherName}>
                      <TableCell className="font-semibold">{goal.teacherName}</TableCell>
                      <TableCell>{goal.monthlyStudentGoal}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span>{goal.actualStudents}</span>
                            <Badge variant={goal.studentAchievement >= 100 ? 'default' : 'secondary'}>
                              {goal.studentAchievement.toFixed(0)}%
                            </Badge>
                          </div>
                          <Progress value={Math.min(goal.studentAchievement, 100)} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>{goal.monthlyConversionGoal}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span>{goal.actualConversions}</span>
                            <Badge variant={goal.conversionAchievement >= 100 ? 'default' : 'secondary'}>
                              {goal.conversionAchievement.toFixed(0)}%
                            </Badge>
                          </div>
                          <Progress value={Math.min(goal.conversionAchievement, 100)} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>{goal.monthlyRevenueGoal.toLocaleString()}元</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span>{goal.actualRevenue.toLocaleString()}元</span>
                            <Badge variant={goal.revenueAchievement >= 100 ? 'default' : 'secondary'}>
                              {goal.revenueAchievement.toFixed(0)}%
                            </Badge>
                          </div>
                          <Progress value={Math.min(goal.revenueAchievement, 100)} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          (goal.studentAchievement >= 100 && goal.conversionAchievement >= 100 && goal.revenueAchievement >= 100) ? 'default' :
                          (goal.studentAchievement >= 80 && goal.conversionAchievement >= 80 && goal.revenueAchievement >= 80) ? 'secondary' : 'destructive'
                        }>
                          {(goal.studentAchievement >= 100 && goal.conversionAchievement >= 100 && goal.revenueAchievement >= 100) ? '全達標' :
                           (goal.studentAchievement >= 80 && goal.conversionAchievement >= 80 && goal.revenueAchievement >= 80) ? '接近達標' : '需努力'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 最後更新時間 */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          最後更新: {format(lastRefresh, 'HH:mm:ss', { locale: zhTW })}
        </div>
        <div className="text-xs">
          數據每30秒自動刷新 | 增強版教師KPI分析系統
        </div>
      </div>
    </div>
  );
}
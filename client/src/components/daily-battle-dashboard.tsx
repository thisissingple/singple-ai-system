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
  Table as TableIcon
} from 'lucide-react';
import { format, subDays, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ConversionSimulator } from '@/components/conversion-simulator';
import {
  type MockStudent,
  mockStudentsToAttendanceData,
  mockStudentsToConversionData
} from '@/lib/mock-conversion-data';

interface DailyKPI {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  growth: number;
  trend: 'up' | 'down' | 'stable';
  color: string;
  icon: any;
}

interface TeacherPerformance {
  teacherName: string;
  studentCount: number;
  conversionCount: number;
  conversionRate: number;
  revenue: number;
  previousDayStudents: number;
  previousDayConversions: number;
  growthRate: number;
  rank: number;
  status: 'excellent' | 'good' | 'needs_attention';
}

interface StudentConversionDetail {
  studentName: string;
  email: string;
  teacherName: string;
  experienceDate: string;
  purchaseDate?: string;
  daysSinceExperience: number;
  status: 'converted' | 'in_progress' | 'lost';
  conversionStage: string;
  notes?: string;
  value?: number;
}

export function DailyBattleDashboard() {
  const [selectedDate, setSelectedDate] = useState(() => format(subDays(new Date(), 1), 'yyyy-MM-dd'));
  const [refreshing, setRefreshing] = useState(false);
  const [generatedTables, setGeneratedTables] = useState<any[]>([]);

  // Mock 模式狀態
  const [mockMode, setMockMode] = useState(false);
  const [mockStudents, setMockStudents] = useState<MockStudent[]>([]);

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

  // 獲取conversion數據（體驗課購買記錄）
  const conversionWorksheet = worksheets.find((ws: any) => 
    ws.worksheetName?.includes('體驗課購買') || ws.worksheetName?.includes('購買記錄')
  );
  const { data: conversionData = [], refetch: refetchConversion } = useQuery<any[]>({
    queryKey: ['/api/worksheets', conversionWorksheet?.id, 'data'],
    enabled: !!conversionWorksheet,
    refetchInterval: 30000,
  });

  // 標準化數據結構 - 支援 Mock 模式
  const normalizedData = useMemo(() => {
    // 如果啟用 Mock 模式，使用 Mock 數據
    if (mockMode && mockStudents.length > 0) {
      const mockAttendanceData = mockStudentsToAttendanceData(mockStudents);
      const mockConversionData = mockStudentsToConversionData(mockStudents);

      const attendance = mockAttendanceData.map((record: any) => ({
        studentName: record.data?.['姓名'] || record.data?.['name'] || '',
        email: record.data?.['email'] || '',
        teacherName: record.data?.['教師'] || record.data?.['teacher'] || '',
        date: record.data?.['日期'] || record.data?.['classDate'] || record.data?.['date'] || '',
        status: '',
        notes: ''
      }));

      const conversion = mockConversionData.map((record: any) => ({
        studentName: record.data?.['姓名'] || record.data?.['name'] || '',
        email: record.data?.['email'] || '',
        teacherName: record.data?.['教師'] || record.data?.['teacher'] || '',
        date: record.data?.['日期'] || record.data?.['date'] || '',
        amount: parseFloat(String(record.data?.['成交金額'] || record.data?.['dealAmount'] || '0')),
        courseType: ''
      }));

      return { attendance, conversion };
    }

    // 使用真實數據
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

    return { attendance, conversion };
  }, [attendanceData, conversionData, mockMode, mockStudents]);

  // 計算每日KPI指標
  const dailyKPIs = useMemo<DailyKPI[]>(() => {
    const selectedDateObj = new Date(selectedDate);
    const previousDateObj = subDays(selectedDateObj, 1);
    
    // 昨日數據
    const yesterdayConversions = normalizedData.conversion.filter((record: any) => {
      if (!record.date) return false;
      const recordDate = new Date(record.date);
      return recordDate >= startOfDay(selectedDateObj) && recordDate <= endOfDay(selectedDateObj);
    });
    
    const yesterdayAttendance = normalizedData.attendance.filter((record: any) => {
      if (!record.date) return false;
      const recordDate = new Date(record.date);
      return recordDate >= startOfDay(selectedDateObj) && recordDate <= endOfDay(selectedDateObj);
    });

    const yesterdayExperiences = normalizedData.attendance.filter((record: any) => {
      const expDate = new Date(record.date);
      return expDate >= startOfDay(selectedDateObj) && expDate <= endOfDay(selectedDateObj);
    });

    // 前日數據（用於對比）
    const previousDayConversions = normalizedData.conversion.filter((record: any) => {
      const purchaseDate = new Date(record.date);
      return purchaseDate >= startOfDay(previousDateObj) && purchaseDate <= endOfDay(previousDateObj);
    });

    const previousDayAttendance = normalizedData.attendance.filter((record: any) => {
      const consultDate = new Date(record.date);
      return consultDate >= startOfDay(previousDateObj) && consultDate <= endOfDay(previousDateObj);
    });

    const previousDayExperiences = normalizedData.attendance.filter((record: any) => {
      const expDate = new Date(record.date);
      return expDate >= startOfDay(previousDateObj) && expDate <= endOfDay(previousDateObj);
    });

    // 計算昨日總收入
    const yesterdayRevenue = yesterdayConversions.reduce((sum: number, record: any) => {
      const amount = parseFloat(record.amount || 0);
      return sum + amount;
    }, 0);

    // 計算前日總收入
    const previousDayRevenue = previousDayConversions.reduce((sum: number, record: any) => {
      const amount = parseFloat(record.amount || 0);
      return sum + amount;
    }, 0);

    // 計算轉換率
    const yesterdayConversionRate = yesterdayExperiences.length > 0 
      ? (yesterdayConversions.length / yesterdayExperiences.length) * 100 
      : 0;

    const previousDayConversionRate = previousDayExperiences.length > 0 
      ? (previousDayConversions.length / previousDayExperiences.length) * 100 
      : 0;

    const kpis: DailyKPI[] = [
      {
        id: 'total_students',
        name: '體驗學生數',
        value: yesterdayExperiences.length,
        previousValue: previousDayExperiences.length,
        growth: yesterdayExperiences.length - previousDayExperiences.length,
        trend: yesterdayExperiences.length > previousDayExperiences.length ? 'up' : 
               yesterdayExperiences.length < previousDayExperiences.length ? 'down' : 'stable',
        color: 'text-blue-600',
        icon: Users
      },
      {
        id: 'purchased_students',
        name: '成交學生數',
        value: yesterdayConversions.length,
        previousValue: previousDayConversions.length,
        growth: yesterdayConversions.length - previousDayConversions.length,
        trend: yesterdayConversions.length > previousDayConversions.length ? 'up' : 
               yesterdayConversions.length < previousDayConversions.length ? 'down' : 'stable',
        color: 'text-green-600',
        icon: UserCheck
      },
      {
        id: 'conversion_rate',
        name: '轉換率',
        value: Math.round(yesterdayConversionRate * 100) / 100,
        previousValue: Math.round(previousDayConversionRate * 100) / 100,
        growth: Math.round((yesterdayConversionRate - previousDayConversionRate) * 100) / 100,
        trend: yesterdayConversionRate > previousDayConversionRate ? 'up' : 
               yesterdayConversionRate < previousDayConversionRate ? 'down' : 'stable',
        color: 'text-purple-600',
        icon: Target
      },
      {
        id: 'revenue',
        name: '成交金額',
        value: yesterdayRevenue,
        previousValue: previousDayRevenue,
        growth: yesterdayRevenue - previousDayRevenue,
        trend: yesterdayRevenue > previousDayRevenue ? 'up' : 
               yesterdayRevenue < previousDayRevenue ? 'down' : 'stable',
        color: 'text-orange-600',
        icon: DollarSign
      },
      {
        id: 'consultations',
        name: '諮詢互動數',
        value: yesterdayAttendance.length,
        previousValue: previousDayAttendance.length,
        growth: yesterdayAttendance.length - previousDayAttendance.length,
        trend: yesterdayAttendance.length > previousDayAttendance.length ? 'up' : 
               yesterdayAttendance.length < previousDayAttendance.length ? 'down' : 'stable',
        color: 'text-cyan-600',
        icon: Activity
      }
    ];

    return kpis;
  }, [selectedDate, normalizedData.conversion, normalizedData.attendance, normalizedData.attendance]);

  // 計算教師績效排行
  const teacherPerformances = useMemo<TeacherPerformance[]>(() => {
    const selectedDateObj = new Date(selectedDate);
    const previousDateObj = subDays(selectedDateObj, 1);

    // 獲取所有教師列表
    const allTeachers = new Set<string>();
    normalizedData.attendance.forEach((record: any) => {
      if (record.teacherName && record.teacherName.trim()) {
        allTeachers.add(record.teacherName.trim());
      }
    });

    const performances: TeacherPerformance[] = Array.from(allTeachers).map(teacherName => {
      // 昨日該教師的體驗學生
      const yesterdayStudents = normalizedData.attendance.filter((record: any) => {
        const expDate = new Date(record.date);
        return record.teacherName === teacherName && 
               expDate >= startOfDay(selectedDateObj) && 
               expDate <= endOfDay(selectedDateObj);
      });

      // 前日該教師的體驗學生
      const previousDayStudents = normalizedData.attendance.filter((record: any) => {
        const expDate = new Date(record.date);
        return record.teacherName === teacherName && 
               expDate >= startOfDay(previousDateObj) && 
               expDate <= endOfDay(previousDateObj);
      });

      // 昨日該教師學生的購買記錄
      const yesterdayConversions = normalizedData.conversion.filter((purchase: any) => {
        const purchaseDate = new Date(purchase.date);
        return purchaseDate >= startOfDay(selectedDateObj) && 
               purchaseDate <= endOfDay(selectedDateObj) &&
               yesterdayStudents.some((exp: any) => exp.email === purchase.email);
      });

      // 前日該教師學生的購買記錄
      const previousDayConversions = normalizedData.conversion.filter((purchase: any) => {
        const purchaseDate = new Date(purchase.date);
        return purchaseDate >= startOfDay(previousDateObj) && 
               purchaseDate <= endOfDay(previousDateObj) &&
               previousDayStudents.some((exp: any) => exp.email === purchase.email);
      });

      const studentCount = yesterdayStudents.length;
      const conversionCount = yesterdayConversions.length;
      const conversionRate = studentCount > 0 ? (conversionCount / studentCount) * 100 : 0;
      const revenue = yesterdayConversions.reduce((sum: number, record: any) => sum + parseFloat(record.amount || 0), 0);

      const previousStudentCount = previousDayStudents.length;
      const previousConversionCount = previousDayConversions.length;
      const growthRate = previousStudentCount > 0 ? ((studentCount - previousStudentCount) / previousStudentCount) * 100 : 0;

      // 判斷狀態
      let status: 'excellent' | 'good' | 'needs_attention' = 'good';
      if (conversionRate >= 30 && studentCount >= 3) {
        status = 'excellent';
      } else if (conversionRate < 15 || (studentCount > 0 && conversionCount === 0)) {
        status = 'needs_attention';
      }

      return {
        teacherName,
        studentCount,
        conversionCount,
        conversionRate: Math.round(conversionRate * 100) / 100,
        revenue,
        previousDayStudents: previousStudentCount,
        previousDayConversions: previousConversionCount,
        growthRate: Math.round(growthRate * 100) / 100,
        rank: 0, // 將在後面計算
        status
      };
    });

    // 按成交金額排序並設置排名
    performances.sort((a, b) => b.revenue - a.revenue);
    performances.forEach((perf, index) => {
      perf.rank = index + 1;
    });

    return performances.filter(p => p.studentCount > 0); // 只顯示有學生的教師
  }, [selectedDate, normalizedData.conversion, normalizedData.attendance, normalizedData.attendance]);

  // 學生轉換詳細分析
  const studentConversionDetails = useMemo<StudentConversionDetail[]>(() => {
    const selectedDateObj = new Date(selectedDate);
    
    // 昨日體驗的學生
    const yesterdayStudents = normalizedData.attendance.filter((record: any) => {
      const expDate = new Date(record.date);
      return expDate >= startOfDay(selectedDateObj) && expDate <= endOfDay(selectedDateObj);
    });

    return yesterdayStudents.map((student: any) => {
      // 尋找該學生的購買記錄
      const purchase = normalizedData.conversion.find((p: any) => p.email === student.email);
      const consultation = normalizedData.attendance.find((c: any) => c.email === student.email);
      
      const experienceDate = new Date(student.date);
      const daysSinceExperience = Math.floor((new Date().getTime() - experienceDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let status: 'converted' | 'in_progress' | 'lost' = 'in_progress';
      let conversionStage = '體驗完成';
      
      if (purchase) {
        status = 'converted';
        conversionStage = '已購買';
      } else if (consultation && consultation.status === 'completed') {
        conversionStage = '已諮詢';
      } else if (daysSinceExperience > 7) {
        status = 'lost';
        conversionStage = '流失';
      }

      return {
        studentName: student.studentName,
        email: student.email,
        teacherName: student.teacherName,
        experienceDate: student.date,
        purchaseDate: purchase?.date,
        daysSinceExperience,
        status,
        conversionStage,
        notes: student.notes || consultation?.notes || '',
        value: purchase ? parseFloat(String(purchase.amount || '0')) : undefined
      };
    });
  }, [selectedDate, normalizedData.conversion, normalizedData.attendance, normalizedData.attendance]);

  // 生成決策支援表格
  const generateDecisionTables = () => {
    setGeneratedTables([
      {
        id: 'teacher_ranking',
        name: '教師績效排行榜',
        description: `${selectedDate && !isNaN(new Date(selectedDate).getTime()) ? 
          format(new Date(selectedDate), 'yyyy年MM月dd日', { locale: zhTW }) : 
          '今日'} 教師表現排行`,
        headers: ['排名', '教師', '學生數', '成交數', '成交率', '成交金額', '成長率', '狀態'],
        rows: teacherPerformances.map(perf => [
          perf.rank,
          perf.teacherName,
          perf.studentCount,
          perf.conversionCount,
          `${perf.conversionRate}%`,
          `¥${perf.revenue.toLocaleString()}`,
          `${perf.growthRate > 0 ? '+' : ''}${perf.growthRate}%`,
          perf.status === 'excellent' ? '優秀' : perf.status === 'good' ? '良好' : '需關注'
        ])
      },
      {
        id: 'conversion_pipeline',
        name: '轉換漏斗分析',
        description: '學生轉換階段分布和異常檢測',
        headers: ['學生', '教師', '體驗日期', '轉換階段', '天數', '狀態', '備註'],
        rows: studentConversionDetails.map(student => [
          student.studentName,
          student.teacherName,
          format(new Date(student.experienceDate), 'MM/dd'),
          student.conversionStage,
          `${student.daysSinceExperience}天`,
          student.status === 'converted' ? '✅已轉換' : 
          student.status === 'lost' ? '❌已流失' : '⏳進行中',
          student.notes || ''
        ])
      }
    ]);
  };

  // 刷新所有數據
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchAttendance(), refetchConversion()]);
    } finally {
      setRefreshing(false);
    }
  };

  const attendanceLoading = false; // Extract from useQuery when needed
  const conversionLoading = false; // Extract from useQuery when needed
  const isLoading = attendanceLoading || conversionLoading;

  return (
    <div className="space-y-6" data-testid="daily-battle-dashboard">
      {/* Mock 模式警告橫幅 */}
      {mockMode && (
        <div className="p-4 bg-purple-50 border-2 border-purple-300 rounded-lg flex items-center gap-3" data-testid="mock-mode-banner">
          <Sparkles className="h-6 w-6 text-purple-600" />
          <div className="flex-1">
            <h3 className="font-semibold text-purple-900">🎯 Mock 模式已啟用</h3>
            <p className="text-sm text-purple-700">
              目前顯示的所有數據均為模擬數據（{mockStudents.length} 筆學生），不會影響真實資料庫
            </p>
          </div>
          <Badge className="bg-purple-600">Mock Mode</Badge>
        </div>
      )}

      {/* 頭部控制區 */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Award className="h-8 w-8 text-primary" />
            每日戰力會議
            {mockMode && <Badge className="bg-purple-600 ml-2">Mock</Badge>}
          </h1>
          <p className="text-muted-foreground">
            檢視 {selectedDate && !isNaN(new Date(selectedDate).getTime()) ?
              format(new Date(selectedDate), 'yyyy年MM月dd日', { locale: zhTW }) :
              '今日'} 教學表現與轉換分析
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background"
            data-testid="date-selector"
          />
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            variant="outline"
            data-testid="refresh-button"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            刷新數據
          </Button>
          <Button 
            onClick={generateDecisionTables}
            className="bg-gradient-to-r from-primary to-primary/80"
            data-testid="generate-tables-button"
          >
            <TableIcon className="h-4 w-4 mr-2" />
            生成決策表格
          </Button>
        </div>
      </div>

      {/* KPI 指標卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {dailyKPIs.map((kpi) => {
          const IconComponent = kpi.icon;
          const isPercentage = kpi.id === 'conversion_rate';
          const isCurrency = kpi.id === 'revenue';
          
          return (
            <Card
              key={kpi.id}
              className={`relative overflow-hidden ${mockMode ? 'border-2 border-purple-300' : ''}`}
              data-testid={`kpi-${kpi.id}`}
            >
              {mockMode && (
                <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-bl">
                  Mock
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {kpi.name}
                  </CardTitle>
                  <IconComponent className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">
                    {isCurrency ? `¥${kpi.value.toLocaleString()}` :
                     isPercentage ? `${kpi.value}%` : 
                     kpi.value}
                  </div>
                  <div className="flex items-center text-sm">
                    {kpi.trend === 'up' && (
                      <TrendingUp className="h-4 w-4 text-red-600 mr-1" />
                    )}
                    {kpi.trend === 'down' && (
                      <TrendingDown className="h-4 w-4 text-green-600 mr-1" />
                    )}
                    <span className={
                      kpi.trend === 'up' ? 'text-red-600' :
                      kpi.trend === 'down' ? 'text-green-600' : 
                      'text-muted-foreground'
                    }>
                      vs昨日 {kpi.growth > 0 ? '+' : ''}{kpi.growth}
                      {isPercentage ? 'pp' : isCurrency ? '' : ''}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 主要分析內容 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 教師績效排行 */}
        <Card data-testid="teacher-performance-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              教師績效排行
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">載入中...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {teacherPerformances.slice(0, 8).map((perf) => (
                  <div 
                    key={perf.teacherName}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                    data-testid={`teacher-performance-${perf.rank}`}
                  >
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="outline" 
                        className={`text-xs font-bold ${
                          perf.rank <= 3 ? 'border-yellow-400 text-yellow-600 bg-yellow-50' : ''
                        }`}
                      >
                        #{perf.rank}
                      </Badge>
                      <div>
                        <div className="font-medium">{perf.teacherName}</div>
                        <div className="text-sm text-muted-foreground">
                          {perf.studentCount}學生 → {perf.conversionCount}成交 ({perf.conversionRate}%)
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">¥{perf.revenue.toLocaleString()}</div>
                      <Badge 
                        variant="outline"
                        className={
                          perf.status === 'excellent' ? 'border-green-400 text-green-600 bg-green-50' :
                          perf.status === 'needs_attention' ? 'border-red-400 text-red-600 bg-red-50' :
                          'border-blue-400 text-blue-600 bg-blue-50'
                        }
                      >
                        {perf.status === 'excellent' ? '優秀' : 
                         perf.status === 'good' ? '良好' : '需關注'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 轉換漏斗分析 */}
        <Card data-testid="conversion-funnel-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              轉換漏斗分析
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">載入中...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 轉換階段統計 */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-blue-600">
                      {studentConversionDetails.length}
                    </div>
                    <div className="text-sm text-muted-foreground">體驗學生</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-yellow-600">
                      {studentConversionDetails.filter(s => s.status === 'in_progress').length}
                    </div>
                    <div className="text-sm text-muted-foreground">跟進中</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-green-600">
                      {studentConversionDetails.filter(s => s.status === 'converted').length}
                    </div>
                    <div className="text-sm text-muted-foreground">已轉換</div>
                  </div>
                </div>

                {/* 需要關注的學生 */}
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    需要關注
                  </h4>
                  {studentConversionDetails
                    .filter(s => s.status === 'in_progress' && s.daysSinceExperience > 3)
                    .slice(0, 5)
                    .map((student, idx) => (
                      <div 
                        key={`${student.email}-${idx}`}
                        className="flex items-center justify-between p-2 rounded border border-yellow-200 bg-yellow-50"
                        data-testid={`attention-student-${idx}`}
                      >
                        <div>
                          <div className="font-medium text-sm">{student.studentName}</div>
                          <div className="text-xs text-muted-foreground">
                            {student.teacherName} • {student.daysSinceExperience}天前體驗
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {student.conversionStage}
                        </Badge>
                      </div>
                    ))
                  }
                </div>

                {/* 成功轉換的學生 */}
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    轉換成功
                  </h4>
                  {studentConversionDetails
                    .filter(s => s.status === 'converted')
                    .slice(0, 5)
                    .map((student, idx) => (
                      <div 
                        key={`${student.email}-${idx}`}
                        className="flex items-center justify-between p-2 rounded border border-green-200 bg-green-50"
                        data-testid={`converted-student-${idx}`}
                      >
                        <div>
                          <div className="font-medium text-sm">{student.studentName}</div>
                          <div className="text-xs text-muted-foreground">
                            {student.teacherName} • ¥{student.value?.toLocaleString()}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs border-green-400 text-green-600">
                          已購買
                        </Badge>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 轉換模擬 Tab 區域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            進階功能
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="simulator" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="simulator" data-testid="tab-simulator">
                🎯 轉換模擬
              </TabsTrigger>
              <TabsTrigger value="analysis" data-testid="tab-analysis">
                📊 深度分析
              </TabsTrigger>
            </TabsList>

            <TabsContent value="simulator" className="space-y-4">
              <ConversionSimulator
                mockMode={mockMode}
                mockStudents={mockStudents}
                onMockModeChange={setMockMode}
                onMockStudentsChange={setMockStudents}
              />
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>深度分析功能開發中...</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 生成的決策表格 */}
      {generatedTables.length > 0 && (
        <Card data-testid="generated-tables-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              管理決策表格
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={generatedTables[0]?.id} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                {generatedTables.map((table) => (
                  <TabsTrigger key={table.id} value={table.id} data-testid={`table-tab-${table.id}`}>
                    {table.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {generatedTables.map((table) => (
                <TabsContent key={table.id} value={table.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{table.name}</h3>
                      <p className="text-sm text-muted-foreground">{table.description}</p>
                    </div>
                    <Button variant="outline" size="sm" data-testid={`export-${table.id}`}>
                      <Download className="h-4 w-4 mr-2" />
                      導出CSV
                    </Button>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {table.headers.map((header: string, idx: number) => (
                          <TableHead key={idx}>{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {table.rows.map((row: any[], idx: number) => (
                        <TableRow key={idx} data-testid={`table-row-${table.id}-${idx}`}>
                          {row.map((cell, cellIdx) => (
                            <TableCell key={cellIdx}>{cell}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
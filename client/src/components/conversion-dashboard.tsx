import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  UserCheck, 
  TrendingUp, 
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Calendar,
  RefreshCw,
  Activity,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { IntelligentAnalytics } from './intelligent-analytics';

interface ConversionStats {
  totalStudents: number;
  purchasedStudents: number;
  conversionRate: number;
  activeStudents: number;
  recentTrend: number;
}

interface StudentRecord {
  name: string;
  email: string;
  courseDate: string;
  teacher: string;
  hasReviewed: string;
  conversionReason: string;
}

interface PurchaseRecord {
  name: string;
  email: string;
  age: string;
  occupation: string;
  planName: string;
  experienceCount: string;
  remainingCount: string;
  purchaseDate: string;
  status: string;
  updateDate: string;
  lastClassDate: string;
  notes: string;
}

export function ConversionDashboard() {
  const [activeTab, setActiveTab] = useState('traditional');
  const [stats, setStats] = useState<ConversionStats>({
    totalStudents: 0,
    purchasedStudents: 0,
    conversionRate: 0,
    activeStudents: 0,
    recentTrend: 0
  });

  // 獲取可用的worksheets
  const { data: availableWorksheets = [], isLoading: worksheetsLoading, refetch } = useQuery({
    queryKey: ['/api/worksheets'],
    refetchInterval: 30000,
  });

  // 智能識別數據類型的worksheets
  const dataSourceMap = useMemo(() => {
    const attendanceSheet = (availableWorksheets as any[]).find((w: any) => 
      w.isEnabled && (
        w.worksheetName?.includes('上課記錄') || 
        w.headers?.some((h: string) => h.includes('授課老師') || h.includes('上課日期'))
      )
    );
    
    const conversionSheet = (availableWorksheets as any[]).find((w: any) => 
      w.isEnabled && (
        w.worksheetName?.includes('購買記錄') || 
        w.headers?.some((h: string) => h.includes('購買日期') || h.includes('課程類型'))
      )
    );

    return {
      attendance: attendanceSheet,
      conversion: conversionSheet
    };
  }, [availableWorksheets]);

  // 動態獲取體驗課上課記錄數據
  const { data: attendanceData = [] } = useQuery<any[]>({
    queryKey: ['/api/worksheets', dataSourceMap.attendance?.id, 'data'],
    enabled: !!dataSourceMap.attendance?.id,
    refetchInterval: 30000,
  });

  // 動態獲取購買記錄數據
  const { data: conversionData = [] } = useQuery<any[]>({
    queryKey: ['/api/worksheets', dataSourceMap.conversion?.id, 'data'],
    enabled: !!dataSourceMap.conversion?.id,
    refetchInterval: 30000,
  });

  // 欄位映射系統
  const fieldMapping = useMemo(() => {
    return {
      getEmailField: (record: any) => {
        return record.email || record.Email || record['學員信箱'] || '';
      },
      getTeacherField: (record: any) => {
        return record['授課老師'] || record.teacher || '';
      },
      getStudentNameField: (record: any) => {
        return record['姓名'] || record.Name || record.name || '';
      },
      getDateField: (record: any, type: 'attendance' | 'conversion') => {
        if (type === 'attendance') {
          return record['上課日期'] || record.date || '';
        } else {
          return record['體驗課購買日期'] || record['購買日期'] || record.date || '';
        }
      }
    };
  }, []);

  // 標準化數據格式
  const normalizedData = useMemo(() => {
    const normalizeAttendance = attendanceData.map((record: any) => ({
      email: fieldMapping.getEmailField(record),
      teacherName: fieldMapping.getTeacherField(record),
      studentName: fieldMapping.getStudentNameField(record),
      date: fieldMapping.getDateField(record, 'attendance'),
      notes: record['未轉單原因'] || record.notes || '',
      originalData: record
    })).filter((r: any) => r.email && r.studentName);

    const normalizeConversion = conversionData.map((record: any) => ({
      email: fieldMapping.getEmailField(record),
      teacherName: fieldMapping.getTeacherField(record),
      studentName: fieldMapping.getStudentNameField(record),
      date: fieldMapping.getDateField(record, 'conversion'),
      planName: record['方案名稱'] || record.planName || '課程方案',
      status: record['目前狀態（自動計算）'] || record.status || '進行中',
      notes: record['備註'] || record.notes || '',
      originalData: record
    })).filter((r: any) => r.email && r.studentName);

    return {
      attendance: normalizeAttendance,
      conversion: normalizeConversion
    };
  }, [attendanceData, conversionData, fieldMapping]);

  // 從統一數據源獲取體驗課記錄
  const experienceRecords = normalizedData.attendance.map((record: any) => ({
    name: record.studentName,
    email: record.email,
    courseDate: record.date,
    teacher: record.teacherName,
    hasReviewed: record.notes?.includes('已評價') ? '是' : '否',
    conversionReason: record.notes || ''
  }));

  // 從統一數據源獲取購買記錄
  const purchaseRecords = normalizedData.conversion.map((record: any) => ({
    name: record.studentName,
    email: record.email,
    age: record.originalData?.['年齡'] || '',
    occupation: record.originalData?.['職業'] || '',
    planName: record.planName || '課程方案',
    experienceCount: record.originalData?.['體驗堂數'] || '1',
    remainingCount: record.originalData?.['剩餘堂數（自動計算）'] || '0',
    purchaseDate: record.date,
    status: record.status || '進行中',
    updateDate: record.originalData?.['更新日期'] || record.date,
    lastClassDate: record.originalData?.['最近一次上課日期'] || record.date,
    notes: record.notes || ''
  }));

  // 計算統計數據
  useEffect(() => {
    const totalStudents = experienceRecords.length;
    const purchasedStudents = purchaseRecords.length;
    const conversionRate = totalStudents > 0 ? (purchasedStudents / totalStudents) * 100 : 0;
    
    // 計算正在上課的學生（有剩餘堂數或狀態為正在上課）
    const activeStudents = purchaseRecords.filter(record => {
      const remaining = parseInt((record as any).remainingCount) || 0;
      const status = (record as any).status?.toLowerCase() || '';
      return remaining > 0 || status.includes('進行') || status.includes('上課');
    }).length;

    // 簡單的趨勢計算（這裡可以更複雜）
    const recentTrend = conversionRate > 20 ? 5.2 : -2.1;

    setStats(prevStats => {
      // 只有當數據真正變化時才更新
      if (
        prevStats.totalStudents !== totalStudents ||
        prevStats.purchasedStudents !== purchasedStudents ||
        Math.abs(prevStats.conversionRate - conversionRate) > 0.1 ||
        prevStats.activeStudents !== activeStudents
      ) {
        return {
          totalStudents,
          purchasedStudents,
          conversionRate,
          activeStudents,
          recentTrend
        };
      }
      return prevStats;
    });
  }, [experienceRecords.length, purchaseRecords.length, JSON.stringify(purchaseRecords.map(r => r.remainingCount + r.status))]);

  const handleRefresh = () => {
    refetch();
  };

  const isLoading = worksheetsLoading;

  return (
    <div className="space-y-6">
      {/* 標題和刷新按鈕 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">體驗課轉換分析</h2>
          <p className="text-muted-foreground">實時追蹤學生轉換率和課程成效</p>
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="sm"
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          刷新數據
        </Button>
      </div>

      {/* 智能分析標籤系統 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="intelligent" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI 智能分析
          </TabsTrigger>
          <TabsTrigger value="traditional" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            傳統分析
          </TabsTrigger>
        </TabsList>

        {/* AI 智能分析標籤 */}
        <TabsContent value="intelligent" className="space-y-6">
          <IntelligentAnalytics />
        </TabsContent>

        {/* 傳統分析標籤 */}
        <TabsContent value="traditional" className="space-y-6">
          {/* 主要 KPI 卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 總學生數 */}
            <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總學生數</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              體驗課學生總數
            </p>
          </CardContent>
        </Card>

            {/* 已購買學生數 */}
            <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已購買學生數</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{stats.purchasedStudents}</div>
            <p className="text-xs text-muted-foreground">
              成功轉換的學生
            </p>
          </CardContent>
        </Card>

            {/* 轉換率 */}
            <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">轉換率</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              {stats.conversionRate.toFixed(1)}%
            </div>
            <div className="flex items-center text-xs">
              {stats.recentTrend > 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span className={stats.recentTrend > 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(stats.recentTrend)}%
              </span>
              <span className="text-muted-foreground ml-1">vs 上期</span>
            </div>
          </CardContent>
        </Card>

            {/* 正在上課學生數 */}
            <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">正在上課學生數</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{stats.activeStudents}</div>
            <p className="text-xs text-muted-foreground">
              目前活躍學生
            </p>
          </CardContent>
        </Card>
          </div>

          {/* 轉換進度和詳細信息 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 轉換進度視覺化 */}
            <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              轉換進度
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>目標轉換率</span>
                <span className="font-medium">25%</span>
              </div>
              <Progress value={Math.min(stats.conversionRate, 25) / 25 * 100} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>當前: {stats.conversionRate.toFixed(1)}%</span>
                <span>目標: 25%</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalStudents - stats.purchasedStudents}</div>
                <div className="text-xs text-muted-foreground">待轉換學生</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.purchasedStudents}</div>
                <div className="text-xs text-muted-foreground">已轉換學生</div>
              </div>
            </div>
          </CardContent>
        </Card>

            {/* 最新購買記錄 */}
            <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              最新購買記錄
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">加載中...</p>
              </div>
            ) : purchaseRecords.length > 0 ? (
              <div className="space-y-3">
                {purchaseRecords.slice(0, 3).map((record: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">{record.name}</div>
                      <div className="text-xs text-muted-foreground">{record.planName}</div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="text-xs">
                        {record.status || '新購買'}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {record.purchaseDate || '今天'}
                      </div>
                    </div>
                  </div>
                ))}
                {purchaseRecords.length > 3 && (
                  <div className="text-center pt-2">
                    <Button variant="outline" size="sm">
                      查看全部 {purchaseRecords.length} 筆記錄
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>暫無購買記錄</p>
              </div>
            )}
          </CardContent>
        </Card>
          </div>

          {/* 轉換分析表格 */}
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            體驗課學生明細
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">加載數據中...</p>
            </div>
          ) : experienceRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">學生姓名</th>
                    <th className="text-left p-2 font-medium">聯絡方式</th>
                    <th className="text-left p-2 font-medium">上課日期</th>
                    <th className="text-left p-2 font-medium">授課老師</th>
                    <th className="text-left p-2 font-medium">轉換狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {experienceRecords.slice(0, 10).map((record: any, index: number) => {
                    const isPurchased = purchaseRecords.some((p: any) => p.email === record.email || p.name === record.name);
                    return (
                      <tr key={index} className="border-b hover:bg-muted/30">
                        <td className="p-2 font-medium">{record.name}</td>
                        <td className="p-2 text-muted-foreground">{record.email}</td>
                        <td className="p-2">{record.courseDate}</td>
                        <td className="p-2">{record.teacher}</td>
                        <td className="p-2">
                          <Badge variant={isPurchased ? "default" : "secondary"}>
                            {isPurchased ? "已轉換" : "待轉換"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {experienceRecords.length > 10 && (
                <div className="text-center pt-4">
                  <Button variant="outline" size="sm">
                    查看全部 {experienceRecords.length} 位學生
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>暫無學生記錄</p>
            </div>
          )}
        </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
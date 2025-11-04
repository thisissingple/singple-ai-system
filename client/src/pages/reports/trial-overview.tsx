/**
 * 體驗課總覽頁面
 * 整合「體驗課報表」和「教學品質分析」兩個功能
 * 使用 Tab 切換：Tab 1 = 整體數據、Tab 2 = 學員分析
 */

import { useState, useRef, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { useQuery, useQueries } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useFilteredSidebar } from '@/hooks/use-sidebar';
import { usePermission } from '@/hooks/use-permission';
import { KPIOverview } from '@/components/trial-report/kpi-overview';
import { TeacherInsights, type TeacherClassRecord } from '@/components/trial-report/teacher-insights';
import { StudentInsights } from '@/components/trial-report/student-insights';
import { SimpleDataSourceStatus } from '@/components/trial-report/simple-data-source-status';
import { MetricSettingsDialog } from '@/components/trial-report/metric-settings-dialog';
import { RedefineKPIDialog } from '@/components/trial-report/redefine-kpi-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useTeachingQuality } from '@/contexts/teaching-quality-context';
import {
  AlertTriangle,
  Loader2,
  Eye,
  RefreshCw,
  Wand2,
  Search,
  BarChart3,
  Users
} from 'lucide-react';
import type { PeriodType, TotalReportData } from '@/types/trial-report';

// 教學品質分析記錄的類型定義
interface StudentAnalysisRecord {
  id: string | null;
  student_name: string;
  teacher_name: string;
  class_date: string;
  overall_score: number | null;
  strengths_summary: string | null;
  weaknesses_summary: string | null;
  suggestions_summary: string | null;
  strengths: Array<{ point: string; evidence: string }>;
  weaknesses: Array<{ point: string; evidence: string }>;
  suggestions: Array<{ suggestion: string; priority: number }>;
  package_name: string | null;
  remaining_classes: string | null;
  conversion_status: 'converted' | 'not_converted' | 'pending' | null;
  has_transcript: boolean;
  attendance_id: string;
}

interface Teacher {
  name: string;
  count: number;
}

export default function TrialOverview() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { lastUpdatedAnalysisId, clearNotification } = useTeachingQuality();

  // 權限檢查
  const filteredSidebar = useFilteredSidebar();
  const { data: permission, isLoading: permissionLoading } = usePermission('trial_class_report');

  // 從 URL 讀取當前 Tab
  const searchParams = new URLSearchParams(window.location.search);
  const urlTab = searchParams.get('tab') || 'data';
  const [activeMainTab, setActiveMainTab] = useState<'data' | 'analysis'>(
    urlTab as 'data' | 'analysis'
  );

  // Tab 1: 整體數據的 state
  const [period, setPeriod] = useState<PeriodType>('all');
  const [selectedDate] = useState<Date>(new Date());
  const [activeDataTab, setActiveDataTab] = useState<'teacher' | 'student'>('teacher');
  const [isMetricSettingsOpen, setMetricSettingsOpen] = useState(false);
  const [studentFilter, setStudentFilter] = useState<'all' | 'converted'>('all');
  const studentInsightsRef = useRef<HTMLDivElement>(null);
  const [redefineKPIDialog, setRedefineKPIDialog] = useState<{
    open: boolean;
    kpiName: string;
    kpiLabel: string;
    currentValue: number;
    currentDefinition?: string;
  }>({
    open: false,
    kpiName: '',
    kpiLabel: '',
    currentValue: 0,
  });

  // Tab 2: 學員分析的 state
  const [analysisRecords, setAnalysisRecords] = useState<StudentAnalysisRecord[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(true);
  const [analyzingIds, setAnalyzingIds] = useState<string[]>([]);

  // 🆕 Progress tracking for each analyzing record
  type ProgressInfo = {
    percentage: number;
    message: string;
    estimatedSecondsRemaining?: number;
  };
  const [progressMap, setProgressMap] = useState<Map<string, ProgressInfo>>(new Map());

  // 處理 Tab 切換時更新 URL
  const handleMainTabChange = (newTab: 'data' | 'analysis') => {
    setActiveMainTab(newTab);
    navigate(`/reports/trial-overview?tab=${newTab}`, { replace: true });
  };

  // ==================== Tab 1: 整體數據 API ====================

  // ⚡ 效能優化：使用 useQueries 並行載入兩個 API，減少等待時間
  const queries = useQueries({
    queries: [
      {
        queryKey: ['total-report-all', format(selectedDate, 'yyyy-MM-dd')],
        queryFn: async () => {
          const params = new URLSearchParams({
            period: 'all',
            baseDate: format(selectedDate, 'yyyy-MM-dd'),
          });

          const response = await fetch(`/api/reports/trial-class?${params.toString()}`, {
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const json = await response.json();
          if (!json.success) {
            throw new Error(json.error || 'Failed to fetch report');
          }

          return json.data;
        },
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 10,
        retry: 1,
        enabled: activeMainTab === 'data', // 只在 Tab 1 時載入
      },
      {
        queryKey: ['total-report-filtered', period, format(selectedDate, 'yyyy-MM-dd')],
        queryFn: async () => {
          const params = new URLSearchParams({
            period,
            baseDate: format(selectedDate, 'yyyy-MM-dd'),
          });

          const response = await fetch(`/api/reports/trial-class?${params.toString()}`, {
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const json = await response.json();
          if (!json.success) {
            throw new Error(json.error || 'Failed to fetch report');
          }

          return json.data;
        },
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 10,
        retry: 1,
        enabled: activeMainTab === 'data', // 只在 Tab 1 時載入
      },
    ],
  });

  // 解構查詢結果
  const allTimeData = queries[0].data;
  const filteredData = queries[1].data;
  const isLoadingAll = queries[0].isLoading;
  const isLoadingFiltered = queries[1].isLoading;
  const isErrorAll = queries[0].isError;
  const isErrorFiltered = queries[1].isError;
  const errorAll = queries[0].error;
  const errorFiltered = queries[1].error;
  const refetchTrialReport = queries[1].refetch;

  const isLoadingData = isLoadingAll || isLoadingFiltered;
  const isErrorData = isErrorAll || isErrorFiltered;
  const errorData = errorAll || errorFiltered;

  // ==================== Tab 2: 學員分析 API ====================

  useEffect(() => {
    if (activeMainTab === 'analysis') {
      fetchAnalysisData();
    }
  }, [activeMainTab, selectedTeacher, searchQuery]);

  // 監聽全域狀態：當有分析更新時，重新載入資料
  useEffect(() => {
    if (lastUpdatedAnalysisId && activeMainTab === 'analysis') {
      console.log('📥 Analysis tab detected update:', lastUpdatedAnalysisId);
      fetchAnalysisData({ showLoader: false });
      clearNotification();
    }
  }, [lastUpdatedAnalysisId, activeMainTab]);

  const fetchAnalysisData = async (options: { showLoader?: boolean } = {}) => {
    if (options.showLoader !== false) {
      setIsLoadingAnalysis(true);
    }
    try {
      const params = new URLSearchParams();
      if (selectedTeacher !== 'all') {
        params.append('teacher', selectedTeacher);
      }
      if (searchQuery && searchQuery.trim() !== '') {
        params.append('search', searchQuery.trim());
      }

      const response = await fetch(`/api/teaching-quality/student-records?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch student records');
      }

      const data = await response.json();
      setAnalysisRecords(data.data.records || []);
      setTeachers(data.data.teachers || []);
    } catch (error: any) {
      console.error('Failed to fetch analysis data:', error);
      toast({
        title: '載入失敗',
        description: error.message || '無法載入教學品質記錄',
        variant: 'destructive'
      });
    } finally {
      if (options.showLoader !== false) {
        setIsLoadingAnalysis(false);
      }
    }
  };

  // ==================== Tab 1: 整體數據 - 輔助函數 ====================

  const handleRevenueClick = () => {
    setActiveDataTab('student');
    setStudentFilter('converted');
    setTimeout(() => {
      studentInsightsRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  const extractField = (data: Record<string, any>, candidates: string[]): any => {
    for (const key of candidates) {
      const value = data?.[key];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    return undefined;
  };

  const formatDateValue = (value: any): string | undefined => {
    if (!value) return undefined;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return typeof value === 'string' ? value : undefined;
    }
    return format(date, 'yyyy-MM-dd');
  };

  const teacherClassRecords: TeacherClassRecord[] = useMemo(() => {
    const attendanceRows = filteredData?.rawData?.filter((row) => row.source === '體驗課上課記錄表') ?? [];

    return attendanceRows.map((row) => {
      const data = row.data || {};
      const teacherNameRaw = extractField(data, ['teacherName', 'teacher_name', 'teacher', '老師']) as string | undefined;
      const studentNameRaw = extractField(data, ['studentName', 'student_name', 'student', '學員姓名']) as string | undefined;
      const classDateRaw = extractField(data, ['classDate', 'class_date', '上課日期']) as string | undefined;
      const statusRaw = extractField(data, ['status', 'classStatus', 'class_status', '狀態']) as string | undefined;
      const topicRaw = extractField(data, ['classTopic', 'class_topic', '課程主題']) as string | undefined;

      const teacherName = (teacherNameRaw ?? '').toString().trim() || '未分配';
      const studentName = (studentNameRaw ?? '').toString().trim() || '未命名學生';

      return {
        id: row.id,
        teacherName,
        studentName,
        classDate: formatDateValue(classDateRaw),
        status: statusRaw ? statusRaw.toString() : undefined,
        topic: topicRaw ? topicRaw.toString() : undefined,
      };
    });
  }, [filteredData?.rawData]);

  // ==================== Tab 2: 學員分析 - 輔助函數 ====================

  // 🆕 持久化分析中的狀態和進度到 localStorage
  const ANALYZING_IDS_KEY = 'trial_overview_analyzing_ids';
  const PROGRESS_MAP_KEY = 'trial_overview_progress_map';

  const startAnalyzing = (attendanceId: string) => {
    setAnalyzingIds((prev) => {
      const newIds = prev.includes(attendanceId) ? prev : [...prev, attendanceId];
      localStorage.setItem(ANALYZING_IDS_KEY, JSON.stringify(newIds));
      return newIds;
    });

    // Initialize progress for this record
    setProgressMap(prev => {
      const newMap = new Map(prev);
      newMap.set(attendanceId, {
        percentage: 25,
        message: '正在進行 AI 分析...（重整頁面後繼續）',
        estimatedSecondsRemaining: 45
      });
      // Save to localStorage (convert Map to object)
      const mapObj = Object.fromEntries(newMap);
      localStorage.setItem(PROGRESS_MAP_KEY, JSON.stringify(mapObj));
      return newMap;
    });
  };

  const finishAnalyzing = (attendanceId: string) => {
    setAnalyzingIds((prev) => {
      const newIds = prev.filter((id) => id !== attendanceId);
      localStorage.setItem(ANALYZING_IDS_KEY, JSON.stringify(newIds));
      return newIds;
    });

    // Remove progress for this record
    setProgressMap(prev => {
      const newMap = new Map(prev);
      newMap.delete(attendanceId);
      const mapObj = Object.fromEntries(newMap);
      localStorage.setItem(PROGRESS_MAP_KEY, JSON.stringify(mapObj));
      return newMap;
    });
  };

  // 🆕 頁面載入時從 localStorage 恢復分析中狀態和進度
  useEffect(() => {
    const savedIds = localStorage.getItem(ANALYZING_IDS_KEY);
    const savedProgress = localStorage.getItem(PROGRESS_MAP_KEY);

    if (savedIds) {
      try {
        const ids = JSON.parse(savedIds);
        if (Array.isArray(ids) && ids.length > 0) {
          setAnalyzingIds(ids);
        }
      } catch (e) {
        console.error('Failed to parse analyzing IDs from localStorage:', e);
      }
    }

    if (savedProgress) {
      try {
        const progressObj = JSON.parse(savedProgress);
        const progressMapRestored = new Map(Object.entries(progressObj));
        setProgressMap(progressMapRestored);
      } catch (e) {
        console.error('Failed to parse progress map from localStorage:', e);
      }
    }
  }, []);

  const handleManualAnalyze = async (record: StudentAnalysisRecord) => {
    if (!record.has_transcript) {
      toast({
        title: '無逐字稿',
        description: '這筆記錄沒有逐字稿，無法進行分析',
        variant: 'destructive'
      });
      return;
    }

    const attendanceId = record.attendance_id;
    const studentName = record.student_name;
    startAnalyzing(attendanceId);

    toast({
      title: '🤖 AI 分析中',
      description: `正在分析 ${studentName} 的體驗課記錄，請查看進度條...`
    });

    // Progress simulation with countdown timer
    const startTime = Date.now();
    const estimatedTotal = 60; // 60 seconds average
    
    const progressInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const percentage = Math.min(Math.floor((elapsed / estimatedTotal) * 79), 79);
      const remaining = Math.max(estimatedTotal - elapsed, 1);

      setProgressMap(prev => {
        const newMap = new Map(prev);
        newMap.set(attendanceId, {
          percentage,
          message: '正在進行 AI 教學品質分析...',
          estimatedSecondsRemaining: remaining
        });
        const mapObj = Object.fromEntries(newMap);
        localStorage.setItem(PROGRESS_MAP_KEY, JSON.stringify(mapObj));
        return newMap;
      });
    }, 1000);

    try {
      const response = await fetch(`/api/teaching-quality/analyze-single/${attendanceId}`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '分析失敗，請稍後再試');
      }

      clearInterval(progressInterval);

      // Show 100% completion
      setProgressMap(prev => {
        const newMap = new Map(prev);
        newMap.set(attendanceId, { percentage: 100, message: '分析完成！', estimatedSecondsRemaining: 0 });
        const mapObj = Object.fromEntries(newMap);
        localStorage.setItem(PROGRESS_MAP_KEY, JSON.stringify(mapObj));
        return newMap;
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      toast({
        title: '✅ 分析完成',
        description: `${studentName} 的課程分析已生成，可以點擊「查看詳情」查看結果`
      });

      await fetchAnalysisData({ showLoader: false });

    } catch (error: any) {
      clearInterval(progressInterval);
      console.error('Manual analysis failed:', error);
      toast({
        title: '❌ 分析失敗',
        description: error.message || '發生未知錯誤，請稍後再試',
        variant: 'destructive'
      });
    } finally {
      finishAnalyzing(attendanceId);
      setProgressMap(prev => {
        const newMap = new Map(prev);
        newMap.delete(attendanceId);
        const mapObj = Object.fromEntries(newMap);
        localStorage.setItem(PROGRESS_MAP_KEY, JSON.stringify(mapObj));
        return newMap;
      });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // ==================== 渲染主內容 ====================

  const renderContent = () => {
    // Tab 1 的 Loading 狀態
    if (activeMainTab === 'data' && isLoadingData) {
      return (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">載入中...</p>
          </div>
        </div>
      );
    }

    // Tab 1 的 Error 狀態
    if (activeMainTab === 'data' && (isErrorData || !allTimeData || !filteredData)) {
      return (
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            載入失敗：{errorData instanceof Error ? errorData.message : '未知錯誤'}
          </AlertDescription>
        </Alert>
      );
    }

    const filteredWarnings = activeMainTab === 'data'
      ? (allTimeData?.warnings || []).filter((warning) => !/資料來源|Supabase/i.test(warning))
      : [];

    return (
      <div className="space-y-6">
        {/* 頁面標題 */}
        <div>
          <h1 className="text-3xl font-bold mb-2">體驗課總覽</h1>
          <p className="text-muted-foreground">
            整合體驗課數據分析與教學品質評估，提供全方位洞察
          </p>
        </div>

        {/* 主 Tabs */}
        <Tabs value={activeMainTab} onValueChange={(v) => handleMainTabChange(v as 'data' | 'analysis')}>
          <TabsList className="grid w-full max-w-md grid-cols-2 h-12">
            <TabsTrigger value="data" className="gap-2 text-base">
              <BarChart3 className="h-5 w-5" />
              整體數據
            </TabsTrigger>
            <TabsTrigger value="analysis" className="gap-2 text-base">
              <Users className="h-5 w-5" />
              體驗課分析
            </TabsTrigger>
          </TabsList>

          {/* ==================== Tab 1: 整體數據 ==================== */}
          <TabsContent value="data" className="mt-6 space-y-6">
            {/* 數據來源狀態 */}
            {allTimeData && (
              <SimpleDataSourceStatus
                mode={
                  allTimeData.mode === 'live'
                    ? 'supabase'
                    : (allTimeData.dataSourceMeta?.trialClassAttendance?.rows || 0) > 0
                      ? 'storage'
                      : 'mock'
                }
                attendanceCount={allTimeData.dataSourceMeta?.trialClassAttendance?.rows || 0}
                purchasesCount={allTimeData.dataSourceMeta?.trialClassPurchase?.rows || 0}
                dealsCount={allTimeData.dataSourceMeta?.eodsForClosers?.rows || 0}
              />
            )}

            {/* 資料品質警告 */}
            {filteredWarnings.length > 0 && (
              <Alert variant="default" className="border-orange-200 bg-orange-50 dark:bg-orange-950">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertTitle className="text-orange-800 dark:text-orange-200">資料品質警告</AlertTitle>
                <AlertDescription className="text-orange-700 dark:text-orange-300">
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    {filteredWarnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* 整體概況 (KPI Overview) */}
            {allTimeData && (
              <div>
                <h2 className="text-xl font-semibold mb-4">整體概況</h2>
                <KPIOverview
                  metrics={allTimeData.summaryMetrics}
                  onRedefineKPI={(kpiName, currentValue) => {
                    const kpiLabels: Record<string, string> = {
                      conversionRate: '轉換率',
                      avgConversionTime: '平均轉換時間',
                      trialCompletionRate: '體驗課完成率',
                    };
                    setRedefineKPIDialog({
                      open: true,
                      kpiName,
                      kpiLabel: kpiLabels[kpiName] || kpiName,
                      currentValue,
                      currentDefinition: undefined,
                    });
                  }}
                  onRevenueClick={handleRevenueClick}
                />
              </div>
            )}

            {/* 詳細數據分析 */}
            {filteredData && (
              <div ref={studentInsightsRef}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">詳細數據分析</h2>

                  {/* 時間範圍篩選 */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">時間範圍：</span>
                    <div className="flex gap-1 border rounded-lg p-1 bg-background">
                      <button
                        onClick={() => setPeriod('daily')}
                        className={`px-3 py-1.5 text-sm rounded transition-colors ${
                          period === 'daily'
                            ? 'bg-orange-400 text-white'
                            : 'hover:bg-muted'
                        }`}
                      >
                        本日
                      </button>
                      <button
                        onClick={() => setPeriod('weekly')}
                        className={`px-3 py-1.5 text-sm rounded transition-colors ${
                          period === 'weekly'
                            ? 'bg-orange-400 text-white'
                            : 'hover:bg-muted'
                        }`}
                      >
                        本週
                      </button>
                      <button
                        onClick={() => setPeriod('lastWeek')}
                        className={`px-3 py-1.5 text-sm rounded transition-colors ${
                          period === 'lastWeek'
                            ? 'bg-orange-400 text-white'
                            : 'hover:bg-muted'
                        }`}
                      >
                        上週
                      </button>
                      <button
                        onClick={() => setPeriod('monthly')}
                        className={`px-3 py-1.5 text-sm rounded transition-colors ${
                          period === 'monthly'
                            ? 'bg-orange-400 text-white'
                            : 'hover:bg-muted'
                        }`}
                      >
                        本月
                      </button>
                      <button
                        onClick={() => setPeriod('all')}
                        className={`px-3 py-1.5 text-sm rounded transition-colors ${
                          period === 'all'
                            ? 'bg-orange-400 text-white'
                            : 'hover:bg-muted'
                        }`}
                      >
                        全部
                      </button>
                    </div>
                  </div>
                </div>

                <Tabs value={activeDataTab} onValueChange={(v) => setActiveDataTab(v as 'teacher' | 'student')}>
                  <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="teacher">教師列表</TabsTrigger>
                    <TabsTrigger value="student">學生列表</TabsTrigger>
                  </TabsList>

                  <TabsContent value="teacher" className="mt-6">
                    <TeacherInsights
                      teachers={filteredData.teacherInsights}
                      students={filteredData.studentInsights}
                      classRecords={teacherClassRecords}
                    />
                  </TabsContent>

                  <TabsContent value="student" className="mt-6">
                    <StudentInsights
                      students={filteredData.studentInsights}
                      initialFilter={studentFilter}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </TabsContent>

          {/* ==================== Tab 2: 體驗課分析 ==================== */}
          <TabsContent value="analysis" className="mt-6 space-y-6">
            {/* 篩選選項 */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle>體驗課分析</CardTitle>
                    <CardDescription className="mt-2">
                      手動觸發分析每位學生的上課記錄 • 即時追蹤教學品質和改進建議 • AI 產出痛點、動機與成交策略 • 選擇老師查看其學生記錄 • 需要時點擊「手動分析」生成結果
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => fetchAnalysisData()} disabled={isLoadingAnalysis} className="ml-4">
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingAnalysis ? 'animate-spin' : ''}`} />
                    重新整理
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 items-center">
                  <div className="flex-1">
                    <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇老師" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部老師 ({teachers.reduce((sum, t) => sum + t.count, 0)} 筆)</SelectItem>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.name} value={teacher.name}>
                            {teacher.name} ({teacher.count} 筆)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="搜尋學員名稱或 email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    共 {analysisRecords.length} 筆記錄
                    {analysisRecords.filter(r => r.id).length > 0 && (
                      <span className="ml-2">
                        • 已分析 {analysisRecords.filter(r => r.id).length} 筆
                      </span>
                    )}
                    {analysisRecords.filter(r => !r.id && r.has_transcript).length > 0 && (
                      <span className="ml-2 text-orange-600">
                        • 待分析 {analysisRecords.filter(r => !r.id && r.has_transcript).length} 筆
                      </span>
                    )}
                    {analysisRecords.filter(r => !r.id && !r.has_transcript).length > 0 && (
                      <span className="ml-2 text-gray-400">
                        • 無逐字稿 {analysisRecords.filter(r => !r.id && !r.has_transcript).length} 筆
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 體驗課分析記錄表格 */}
            <Card>
              <CardContent className="pt-6">
                {isLoadingAnalysis ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">載入中...</span>
                  </div>
                ) : analysisRecords.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-lg">目前沒有記錄</p>
                    <p className="text-sm mt-2">
                      系統會自動從 Google Sheets 同步上課記錄
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">學員姓名</TableHead>
                          <TableHead className="whitespace-nowrap">諮詢師/老師</TableHead>
                          <TableHead className="whitespace-nowrap">體驗課日期</TableHead>
                          <TableHead className="text-center whitespace-nowrap">老師表現總評分</TableHead>
                          <TableHead className="whitespace-nowrap">方案名稱</TableHead>
                          <TableHead className="whitespace-nowrap">剩餘堂數</TableHead>
                          <TableHead className="text-center whitespace-nowrap">是否已轉高</TableHead>
                          <TableHead className="text-right whitespace-nowrap">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysisRecords.map((record) => (
                          <TableRow key={record.attendance_id}>
                            <TableCell className="font-medium">{record.student_name}</TableCell>
                            <TableCell>{record.teacher_name}</TableCell>
                            <TableCell>{formatDate(record.class_date)}</TableCell>
                            <TableCell className="text-center">
                              {record.id && record.overall_score !== null ? (
                                <div className="flex flex-col items-center gap-1">
                                  <div className="text-lg font-bold text-foreground">
                                    {record.overall_score}
                                    <span className="text-sm text-muted-foreground">/100</span>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={
                                      record.overall_score >= 90 ? 'bg-green-50 text-green-700 border-green-300' :
                                      record.overall_score >= 80 ? 'bg-blue-50 text-blue-700 border-blue-300' :
                                      record.overall_score >= 70 ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
                                      record.overall_score >= 60 ? 'bg-orange-50 text-orange-700 border-orange-300' :
                                      'bg-red-50 text-red-700 border-red-300'
                                    }
                                  >
                                    {record.overall_score >= 90 ? 'SSS' :
                                     record.overall_score >= 80 ? 'A' :
                                     record.overall_score >= 70 ? 'B' :
                                     record.overall_score >= 60 ? 'C' :
                                     record.overall_score >= 50 ? 'D' : 'E'}
                                  </Badge>
                                </div>
                              ) : record.has_transcript ? (
                                <Badge
                                  variant="outline"
                                  className={`border-orange-500 text-orange-600 ${
                                    analyzingIds.includes(record.attendance_id) ? 'opacity-80' : ''
                                  }`}
                                >
                                  {analyzingIds.includes(record.attendance_id) ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      分析中
                                    </>
                                  ) : (
                                    '待分析'
                                  )}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-gray-400">
                                  無逐字稿
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {record.package_name ? (
                                <span className="text-sm font-medium">{record.package_name}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">未購課</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {record.remaining_classes ? (
                                <Badge variant="outline" className="text-blue-600 border-blue-300">
                                  {record.remaining_classes}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {record.conversion_status === '已轉高' ? (
                                <Badge className="bg-green-600 hover:bg-green-700">
                                  ✓ 已轉高
                                </Badge>
                              ) : record.conversion_status === '體驗中' ? (
                                <Badge variant="outline" className="text-blue-600 border-blue-300">
                                  體驗中
                                </Badge>
                              ) : record.conversion_status === '未轉高' ? (
                                <Badge variant="outline" className="text-orange-600 border-orange-300">
                                  未轉高
                                </Badge>
                              ) : record.conversion_status === '未開始' ? (
                                <Badge variant="outline" className="text-gray-600 border-gray-300">
                                  未開始
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {record.id ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/teaching-quality/${record.id}`)}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  查看詳情
                                </Button>
                              ) : record.has_transcript ? (
                                <>
                                  {analyzingIds.includes(record.attendance_id) ? (
                                    <div className="w-48 space-y-1">
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>{progressMap.get(record.attendance_id)?.message || '分析中...'}</span>
                                      </div>
                                      <Progress
                                        value={progressMap.get(record.attendance_id)?.percentage || 0}
                                        className="h-2"
                                      />
                                      <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>{progressMap.get(record.attendance_id)?.percentage || 0}%</span>
                                        {progressMap.get(record.attendance_id)?.estimatedSecondsRemaining !== undefined && (
                                          <span>
                                            剩餘 {progressMap.get(record.attendance_id)?.estimatedSecondsRemaining}秒
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => handleManualAnalyze(record)}
                                    >
                                      <Wand2 className="h-3 w-3 mr-1" />
                                      手動分析
                                    </Button>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-gray-400">無逐字稿</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <RedefineKPIDialog
          open={redefineKPIDialog.open}
          onClose={() => {
            setRedefineKPIDialog({ ...redefineKPIDialog, open: false });
            refetchTrialReport();
          }}
          kpiName={redefineKPIDialog.kpiName}
          kpiLabel={redefineKPIDialog.kpiLabel}
          currentValue={redefineKPIDialog.currentValue}
          currentDefinition={redefineKPIDialog.currentDefinition}
        />

        <MetricSettingsDialog
          open={isMetricSettingsOpen}
          onOpenChange={setMetricSettingsOpen}
          onSave={() => {
            refetchTrialReport();
          }}
        />
      </div>
    );
  };

  // 權限檢查 Loading
  if (permissionLoading) {
    return (
      <DashboardLayout sidebarSections={filteredSidebar} title="體驗課總覽">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  // 權限檢查失敗
  if (!permission?.allowed) {
    return (
      <DashboardLayout sidebarSections={filteredSidebar} title="體驗課總覽">
        <Card className="max-w-2xl mx-auto mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              無權限存取
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              您沒有權限存取「體驗課報表」功能。請聯絡管理員申請權限。
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              原因：{permission?.reason || '未授權'}
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sidebarSections={filteredSidebar}
      title="體驗課總覽"
    >
      <div className="p-6">
        {renderContent()}
      </div>
    </DashboardLayout>
  );
}

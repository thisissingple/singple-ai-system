/**
 * Total Report Dashboard Page (Simplified with Shared Components)
 * Focuses on four core sections with Supabase status
 */

import { useState, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { KPIOverview } from '@/components/trial-report/kpi-overview';
import { ConversionFunnelChart } from '@/components/trial-report/conversion-funnel-chart';
import { CourseCategoryChart } from '@/components/trial-report/course-category-chart';
import { TeacherInsights, type TeacherClassRecord } from '@/components/trial-report/teacher-insights';
import { StudentInsights } from '@/components/trial-report/student-insights';
import { AISuggestions } from '@/components/trial-report/ai-suggestions';
import { SimpleDataSourceStatus } from '@/components/trial-report/simple-data-source-status';
import { MetricSettingsDialog } from '@/components/trial-report/metric-settings-dialog';
import { RedefineKPIDialog } from '@/components/trial-report/redefine-kpi-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import type { PeriodType, TotalReportData } from '@/types/trial-report';

export default function DashboardTrialReport() {
  const [period] = useState<PeriodType>('all');  // Use 'all' to fetch all data
  const [selectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'teacher' | 'student'>('teacher');
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

  // Fetch report from API
  const {
    data: reportData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<TotalReportData>({
    queryKey: ['total-report', period, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const params = new URLSearchParams({
        period,
        baseDate: format(selectedDate, 'yyyy-MM-dd'),
      });

      const response = await fetch(`/api/reports/trial-class?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
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
    staleTime: 0, // Always consider data stale to force fresh queries
    gcTime: 0, // Don't cache old queries
    retry: 1,
  });

  const handleRevenueClick = () => {
    // Switch to student tab and filter by converted students
    setActiveTab('student');
    setStudentFilter('converted');
    // Scroll to student insights section
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
    const attendanceRows = reportData?.rawData?.filter((row) => row.source === '體驗課上課記錄表') ?? [];

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
  }, [reportData?.rawData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  if (isError || !reportData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            載入失敗：{error instanceof Error ? error.message : '未知錯誤'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const filteredWarnings = (reportData.warnings || []).filter(
    (warning) => !/資料來源|Supabase/i.test(warning)
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1800px] mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">體驗課總報表</h1>
          <p className="text-muted-foreground">
            整合教師與學生視角的全方位數據分析，提供 AI 智能建議
          </p>
        </div>

        {/* Simple Data Source Status - Click to manage */}
        <SimpleDataSourceStatus
          mode={
            reportData.mode === 'live'
              ? 'supabase'
              : (reportData.dataSourceMeta?.trialClassAttendance?.rows || 0) > 0
                ? 'storage'
                : 'mock'
          }
          attendanceCount={reportData.dataSourceMeta?.trialClassAttendance?.rows || 0}
          purchasesCount={reportData.dataSourceMeta?.trialClassPurchase?.rows || 0}
          dealsCount={reportData.dataSourceMeta?.eodsForClosers?.rows || 0}
        />

        {/* Warnings */}
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

        {/* Section 1: 整體概況 (KPI Overview) */}
        <div>
          <h2 className="text-xl font-semibold mb-4">整體概況</h2>
          <KPIOverview
            metrics={reportData.summaryMetrics}
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
                currentDefinition: undefined, // TODO: fetch from saved definitions
              });
            }}
            onRevenueClick={handleRevenueClick}
          />
        </div>

        {/* Section 2: 轉換分析 (Conversion Funnel + Course Category) */}
        <div>
          <h2 className="text-xl font-semibold mb-4">轉換分析</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <ConversionFunnelChart funnelData={reportData.funnelData} />
            <CourseCategoryChart categoryBreakdown={reportData.categoryBreakdown} />
          </div>
        </div>

        {/* Section 3: 詳細數據分析 (Teacher & Student Insights) */}
        <div ref={studentInsightsRef}>
          <h2 className="text-xl font-semibold mb-4">詳細數據分析</h2>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'teacher' | 'student')}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="teacher">教師視角</TabsTrigger>
              <TabsTrigger value="student">學生視角</TabsTrigger>
            </TabsList>

            <TabsContent value="teacher" className="mt-6">
              <TeacherInsights
                teachers={reportData.teacherInsights}
                students={reportData.studentInsights}
                classRecords={teacherClassRecords}
              />
            </TabsContent>

            <TabsContent value="student" className="mt-6">
              <StudentInsights
                students={reportData.studentInsights}
                initialFilter={studentFilter}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Section 4: AI 建議 */}
        <div>
          <h2 className="text-xl font-semibold mb-4">AI 智能建議</h2>
          <AISuggestions
            suggestions={reportData.aiSuggestions}
            period={reportData.period}
          />
        </div>
      </div>

      <RedefineKPIDialog
        open={redefineKPIDialog.open}
        onClose={() => {
          setRedefineKPIDialog({ ...redefineKPIDialog, open: false });
          refetch(); // Reload report after definition change
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
          refetch();
        }}
      />
    </div>
  );
}

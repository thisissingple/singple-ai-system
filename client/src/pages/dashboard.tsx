import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  RefreshCw,
  Calendar,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  FileText,
  Bot,
  Edit,
  Save,
  AlertCircle,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronRight,
  CheckCircle,
  Table,
  Search,
  Filter,
  Database,
  Sparkles
} from 'lucide-react';
import { useSpreadsheets, useCreateSpreadsheet, useSyncSpreadsheet, useDeleteSpreadsheet, useWorksheets, useToggleWorksheet, useUpdateWorksheet, useSyncSingleWorksheet, useSyncEnabledWorksheets, useSupabaseTables, useSetWorksheetSupabaseMapping, type SyncWorksheetResponse } from '@/hooks/use-sheets';
import { SupabaseMappingDialog } from '@/components/supabase-mapping-dialog';
import { FieldMappingDialog } from '@/components/field-mapping-dialog';
import { type Spreadsheet, type Worksheet, type SheetData } from '@shared/schema';
import { DataTable } from '@/components/data-table';
import DashboardTrialReport from '@/pages/dashboard-trial-report';
import DashboardKPICalculator from '@/pages/dashboard-kpi-calculator';
import { DataSourceStatusCard } from '@/components/kpi-calculator/data-source-status-card';
import { MetricSettingsDialog } from '@/components/trial-report/metric-settings-dialog';
import { InvalidRecordsAlert } from '@/components/invalid-records-alert';
import { InvalidRecordsTable } from '@/components/invalid-records-table';
import { AIAnalysisTabContent } from '@/components/ai-analysis-tab';

interface DataSource {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  lastSyncAt: string;
}

interface CreateSpreadsheetForm {
  name: string;
  url: string;
  description?: string;
}

interface Report {
  id: string;
  type: 'daily' | 'weekly';
  reportDate: string;
  data: {
    period: { start: string; end: string };
    metrics: {
      classCount: number;
      purchaseCount: number;
      dealCount: number;
      totalRevenue: number;
    };
    details: any;
  };
  aiInsights: string;
  userModifiedInsights?: string;
  createdAt: string;
}

function EnabledWorksheetDataView({
  worksheet,
  spreadsheet,
  isOpen
}: {
  worksheet: Worksheet;
  spreadsheet: Spreadsheet | undefined;
  isOpen: boolean;
}) {
  const { data: worksheetData = [], isLoading } = useQuery<SheetData[]>({
    queryKey: ['/api/worksheets', worksheet.id, 'data'],
    queryFn: async () => apiRequest<SheetData[]>('GET', `/api/worksheets/${worksheet.id}/data`),
    enabled: isOpen, // Only fetch when accordion is open
    staleTime: 0, // Always consider data stale
    refetchOnMount: true, // Refetch when component mounts
  });

  if (!isOpen) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
        載入資料中...
      </div>
    );
  }

  if (!spreadsheet) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        無法載入試算表資訊
      </div>
    );
  }

  return (
    <div className="pt-4">
      <DataTable
        data={worksheetData}
        spreadsheet={spreadsheet}
        worksheet={worksheet}
        isLive={false}
        isLoading={isLoading}
      />
    </div>
  );
}

export default function Dashboard() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedInsights, setEditedInsights] = useState('');
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<string>('');
  const [createForm, setCreateForm] = useState<CreateSpreadsheetForm>({ name: '', url: '', description: '' });
  const [activeTab, setActiveTab] = useState('sheets');
  const [previewWorksheet, setPreviewWorksheet] = useState<Worksheet | null>(null);
  const [enabledWorksheetFilter, setEnabledWorksheetFilter] = useState('');
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
  const [supabaseMappingWorksheet, setSupabaseMappingWorksheet] = useState<Worksheet | null>(null);
  const [supabaseMappingOpen, setSupabaseMappingOpen] = useState(false);
  const [isMetricSettingsOpen, setMetricSettingsOpen] = useState(false);

  // AI Field Mapping Dialog 狀態
  const [fieldMappingWorksheet, setFieldMappingWorksheet] = useState<Worksheet | null>(null);
  const [fieldMappingOpen, setFieldMappingOpen] = useState(false);

  // 對應設定的臨時狀態
  const [mappingWorksheetId, setMappingWorksheetId] = useState<string>('');
  const [mappingSupabaseTable, setMappingSupabaseTable] = useState<string>('');

  // 同步進度狀態
  const [syncProgress, setSyncProgress] = useState<{
    isOpen: boolean;
    worksheetName: string;
    progress: number;
    message: string;
  }>({
    isOpen: false,
    worksheetName: '',
    progress: 0,
    message: '',
  });

  // 無效資料狀態
  const [invalidRecordsInfo, setInvalidRecordsInfo] = useState<{
    worksheetName: string;
    invalidRecords: Array<{ rowIndex: number; errors: string[] }>;
  } | null>(null);

  const { toast } = useToast();

  // Google Sheets hooks
  const { data: spreadsheets = [], isLoading: spreadsheetsLoading, refetch: refetchSpreadsheets } = useSpreadsheets();
  const { data: worksheets = [], isLoading: worksheetsLoading, refetch: refetchWorksheets } = useWorksheets(selectedSpreadsheet);
  const createSpreadsheetMutation = useCreateSpreadsheet();
  const syncSpreadsheetMutation = useSyncSpreadsheet();
  const deleteSpreadsheetMutation = useDeleteSpreadsheet();
  const toggleWorksheetMutation = useToggleWorksheet();
  const updateWorksheetMutation = useUpdateWorksheet();
  const syncSingleWorksheetMutation = useSyncSingleWorksheet();
  const syncEnabledWorksheetsMutation = useSyncEnabledWorksheets();

  // Supabase hooks
  const { data: supabaseTables = [], isLoading: supabaseTablesLoading } = useSupabaseTables();
  const setWorksheetMappingMutation = useSetWorksheetSupabaseMapping();

  const {
    data: worksheetPreviewRows = [],
    isLoading: worksheetPreviewLoading,
  } = useQuery<SheetData[]>({
    queryKey: ['worksheet-data', previewWorksheet?.id],
    queryFn: async () => apiRequest<SheetData[]>('GET', `/api/worksheets/${previewWorksheet!.id}/data`),
    enabled: !!previewWorksheet?.id,
  });

  const previewSpreadsheet = useMemo(() => {
    if (!previewWorksheet) return null;
    return spreadsheets.find((sheet) => sheet.spreadsheetId === previewWorksheet.spreadsheetId) || null;
  }, [previewWorksheet, spreadsheets]);

  // Get all enabled worksheets across all spreadsheets
  const { data: allWorksheets = [], refetch: refetchAllWorksheets } = useQuery<Worksheet[]>({
    queryKey: ['/api/worksheets', spreadsheets.map(s => s.id)],
    queryFn: async () => {
      const results = await Promise.all(
        spreadsheets.map(async (spreadsheet) => {
          try {
            return await apiRequest<Worksheet[]>('GET', `/api/spreadsheets/${spreadsheet.id}/worksheets`);
          } catch {
            return [];
          }
        })
      );
      return results.flat();
    },
    enabled: spreadsheets.length > 0,
  });

  const enabledWorksheets = useMemo(() => {
    return allWorksheets.filter((worksheet) => worksheet.isEnabled);
  }, [allWorksheets]);

  const dataSourceSummary = useMemo(() => {
    if (enabledWorksheets.length === 0) {
      return {
        mode: spreadsheets.length > 0 ? 'storage' : 'mock',
        attendanceCount: 0,
        purchaseCount: 0,
        dealsCount: 0,
        lastSync: null as string | null,
      };
    }

    let attendanceCount = 0;
    let purchaseCount = 0;
    let dealsCount = 0;
    let latestSync: string | null = null;

    const updateLatestSync = (value: any) => {
      if (!value) return;
      const iso = value instanceof Date ? value.toISOString() : (() => {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
      })();
      if (!iso) return;
      if (!latestSync || new Date(iso).getTime() > new Date(latestSync).getTime()) {
        latestSync = iso;
      }
    };

    enabledWorksheets.forEach((worksheet) => {
      const count = worksheet.rowCount ?? 0;
      updateLatestSync(worksheet.lastSyncAt);

      switch (worksheet.supabaseTable) {
        case 'trial_class_attendance':
          attendanceCount += count;
          break;
        case 'trial_class_purchase':
          purchaseCount += count;
          break;
        case 'eods_for_closers':
          dealsCount += count;
          break;
        default:
          break;
      }
    });

    const hasSupabaseMappings = enabledWorksheets.some((worksheet) => !!worksheet.supabaseTable);

    return {
      mode: hasSupabaseMappings ? ('supabase' as const) : ('storage' as const),
      attendanceCount,
      purchaseCount,
      dealsCount,
      lastSync: latestSync,
    };
  }, [enabledWorksheets, spreadsheets.length]);

  // Filter enabled worksheets based on search term
  const filteredEnabledWorksheets = useMemo(() => {
    if (!enabledWorksheetFilter.trim()) return enabledWorksheets;
    const filter = enabledWorksheetFilter.toLowerCase();
    return enabledWorksheets.filter((worksheet) => {
      const spreadsheet = spreadsheets.find((s) => s.spreadsheetId === worksheet.spreadsheetId);
      return (
        worksheet.worksheetName.toLowerCase().includes(filter) ||
        spreadsheet?.name.toLowerCase().includes(filter)
      );
    });
  }, [enabledWorksheets, enabledWorksheetFilter, spreadsheets]);

  // 獲取系統狀態
  const fetchSystemStatus = async () => {
    try {
      const data = await apiRequest<any>('GET', '/api/status');
      setSystemStatus(data);
      setDataSources(data.dataSources || []);
    } catch (error) {
      console.error('Failed to fetch system status:', error);
    }
  };

  useEffect(() => {
    setPreviewWorksheet(null);
  }, [selectedSpreadsheet]);

  useEffect(() => {
    if (!previewWorksheet?.id) return;
    const updated = worksheets.find((worksheet) => worksheet.id === previewWorksheet.id);
    if (!updated || !updated.isEnabled) {
      setPreviewWorksheet(null);
      return;
    }
    if (updated !== previewWorksheet) {
      setPreviewWorksheet(updated);
    }
  }, [worksheets, previewWorksheet?.id]);

  // 從 Google Sheets URL 中提取 spreadsheetId
  const extractSpreadsheetId = (url: string): string | null => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  // 創建新的 Spreadsheet
  const handleCreateSpreadsheet = async () => {
    if (!createForm.url) {
      toast({
        title: '請填寫 URL',
        description: 'Google Sheets URL 為必填欄位',
        variant: 'destructive',
      });
      return;
    }

    // 從 URL 中提取 spreadsheetId
    const spreadsheetId = extractSpreadsheetId(createForm.url);
    if (!spreadsheetId) {
      toast({
        title: '無效的 Google Sheets URL',
        description: '請提供有效的 Google Sheets 連結',
        variant: 'destructive',
      });
      return;
    }

    try {
      // 構建符合後端 API 期望的資料格式
      const spreadsheetData = {
        name: createForm.name || `試算表-${spreadsheetId.slice(0, 8)}`,
        spreadsheetId: spreadsheetId,
        ...(createForm.description && { description: createForm.description })
      };

      await createSpreadsheetMutation.mutateAsync(spreadsheetData);
      setCreateForm({ name: '', url: '', description: '' });
      toast({
        title: '創建成功',
        description: '新的 Google Sheets 已添加',
      });
    } catch (error: any) {
      toast({
        title: '創建失敗',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // 同步指定 Spreadsheet 的所有啟用工作表
  const handleSyncSpreadsheet = async (spreadsheetId: string) => {
    try {
      await syncEnabledWorksheetsMutation.mutateAsync(spreadsheetId);
      toast({
        title: '同步成功',
        description: 'Google Sheets 數據已更新',
      });
    } catch (error: any) {
      toast({
        title: '同步失敗',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // 同步單個 Worksheet
  const handleSyncWorksheet = async (worksheetId: string, event?: React.MouseEvent) => {
    // 阻止事件冒泡，避免觸發 Accordion 的展開/收合
    event?.stopPropagation();

    try {
      const syncResponse = await syncSingleWorksheetMutation.mutateAsync(worksheetId);

      console.log('🔍 [DEBUG handleSyncWorksheet] syncResponse:', syncResponse);
      console.log('🔍 [DEBUG handleSyncWorksheet] syncStats:', syncResponse?.syncStats);
      console.log('🔍 [DEBUG handleSyncWorksheet] invalidRecords:', syncResponse?.syncStats?.invalidRecords);

      // 檢查是否有無效資料
      if (syncResponse?.syncStats?.invalidRecords && syncResponse.syncStats.invalidRecords.length > 0) {
        const worksheet = allWorksheets.find(w => w.id === worksheetId);
        if (worksheet) {
          console.log('✅ [DEBUG handleSyncWorksheet] Setting invalidRecordsInfo:', {
            worksheetName: worksheet.worksheetName,
            invalidRecords: syncResponse.syncStats.invalidRecords,
          });
          setInvalidRecordsInfo({
            worksheetName: worksheet.worksheetName,
            invalidRecords: syncResponse.syncStats.invalidRecords,
          });
        }
      } else {
        // 沒有無效資料，清除狀態
        console.log('❌ [DEBUG handleSyncWorksheet] No invalid records, clearing state');
        setInvalidRecordsInfo(null);
      }

      toast({
        title: '同步成功',
        description: syncResponse?.syncStats?.invalidRows
          ? `已同步 ${syncResponse.syncStats.insertedToSupabase} 筆（${syncResponse.syncStats.invalidRows} 筆無效）`
          : '工作表資料已更新',
      });
    } catch (error: any) {
      toast({
        title: '同步失敗',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // 刪除 Spreadsheet
  const handleDeleteSpreadsheet = async (spreadsheetId: string) => {
    if (!confirm('確定要刪除這個 Google Sheets 嗎？')) return;

    try {
      await deleteSpreadsheetMutation.mutateAsync(spreadsheetId);
      toast({
        title: '刪除成功',
        description: 'Google Sheets 已移除',
      });
      if (selectedSpreadsheet === spreadsheetId) {
        setSelectedSpreadsheet('');
      }
    } catch (error: any) {
      toast({
        title: '刪除失敗',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // 切換 Worksheet 啟用狀態
  const handleToggleWorksheet = async (worksheet: Worksheet, isEnabled: boolean) => {
    try {
      const updatedWorksheet = await toggleWorksheetMutation.mutateAsync({ worksheet, isEnabled });

      // 如果是啟用工作表，自動同步資料
      if (isEnabled && updatedWorksheet) {
        try {
          await syncSingleWorksheetMutation.mutateAsync(updatedWorksheet.id);
          toast({
            title: '啟用並同步成功',
            description: '工作表已啟用並同步最新資料',
          });
        } catch (syncError: any) {
          toast({
            title: '啟用成功，但同步失敗',
            description: '請手動點擊同步按鈕',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: isEnabled ? '啟用成功' : '停用成功',
          description: `工作表已${isEnabled ? '啟用' : '停用'}`,
        });
      }
    } catch (error: any) {
      toast({
        title: '操作失敗',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // 更新 Worksheet 設定
  const handleUpdateWorksheet = async (worksheetId: string, updates: { range?: string }) => {
    try {
      await updateWorksheetMutation.mutateAsync({ worksheetId, updates });
      toast({
        title: '更新成功',
        description: '工作表設定已更新',
      });
    } catch (error: any) {
      toast({
        title: '更新失敗',
        description: error.message,
        variant: 'destructive',
      });
    }
  };


  // 生成報表
  const generateReport = async (type: 'daily' | 'weekly') => {
    try {
      setIsGenerating(true);
      const today = new Date().toISOString().split('T')[0];

      const report = await apiRequest<Report>('POST', '/api/reports/generate', { type, date: today });

      setCurrentReport(report);
      setEditedInsights(report.userModifiedInsights || report.aiInsights || '');
      toast({
        title: '報表生成成功',
        description: `${type === 'daily' ? '每日' : '每週'}戰力報表已生成`,
      });
    } catch (error: any) {
      toast({
        title: '報表生成失敗',
        description: error.message || '生成報表時發生錯誤',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // 保存編輯的建議
  const saveInsights = async () => {
    if (!currentReport) return;

    try {
      const updatedReport = await apiRequest<Report>('PUT', `/api/reports/${currentReport.id}/insights`, {
        insights: editedInsights
      });

      setCurrentReport(updatedReport);
      setIsEditing(false);
      toast({
        title: '建議已保存',
        description: 'AI 建議已成功更新',
      });
    } catch (error: any) {
      toast({
        title: '保存失敗',
        description: error.message || '保存時發生錯誤',
        variant: 'destructive',
      });
    }
  };

  // 初始化測試數據源（用於報表功能）
  const initTestDataSources = async () => {
    try {
      setIsSyncing(true);
      const testSources = [
        { name: '體驗課上課記錄', url: 'https://docs.google.com/spreadsheets/d/1FZffolNcXjkZ-14vA3NVRdN7czm8E6JjdkGidn38LgM/edit#gid=0' },
        { name: '體驗課購買記錄', url: 'https://docs.google.com/spreadsheets/d/1fEZcQy7vJi40mPJXkmtLvKb-qL8-5gSPvgRQT7t4o2A/edit#gid=0' },
        { name: '諮詢與成交記錄', url: 'https://docs.google.com/spreadsheets/d/1dKlm6zHzNpSFJ2i9kL-xJpQNbGjWsF8YMbhE3xKc5R9/edit#gid=0' }
      ];

      for (const source of testSources) {
        try {
          const spreadsheetId = extractSpreadsheetId(source.url);
          if (spreadsheetId) {
            await createSpreadsheetMutation.mutateAsync({
              name: source.name,
              spreadsheetId: spreadsheetId
            });
          }
        } catch (error) {
          // 忽略已存在的錯誤
        }
      }

      toast({
        title: '測試數據源初始化完成',
        description: '已添加報表所需的測試數據源',
      });
    } catch (error: any) {
      toast({
        title: '初始化失敗',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* 標題 */}
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">資料來源管理</h1>
            <p className="text-muted-foreground">
              管理 Google Sheets 數據源與 Supabase 對應設定
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="sheets">資料來源同步</TabsTrigger>
            <TabsTrigger value="reports">戰力報表</TabsTrigger>
            <TabsTrigger value="total-report">數據總報表</TabsTrigger>
            <TabsTrigger value="kpi-calculator">KPI 計算器</TabsTrigger>
            <TabsTrigger value="ai-analysis">🤖 AI 分析</TabsTrigger>
            <TabsTrigger value="raw-data-mvp">
              <div className="flex items-center gap-1">
                <Database className="h-4 w-4" />
                <span>Raw Data MVP</span>
              </div>
            </TabsTrigger>
          </TabsList>

          {/* 資料來源同步 Tab */}
          <TabsContent value="sheets" className="space-y-0">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>資料來源同步中心</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <DataSourceStatusCard
                  mode={dataSourceSummary.mode}
                  attendanceCount={dataSourceSummary.attendanceCount}
                  purchasesCount={dataSourceSummary.purchaseCount}
                  dealsCount={dataSourceSummary.dealsCount}
                  lastSync={dataSourceSummary.lastSync}
                  showMetricSettingsButton
                  onOpenMetricSettings={() => setMetricSettingsOpen(true)}
                  onRefresh={() => {
                    refetchAllWorksheets();
                    refetchWorksheets();
                    fetchSystemStatus();
                  }}
                />

                {/* Invalid Records Alert */}
                {invalidRecordsInfo && (
                  <div>
                    {console.log('🎨 [DEBUG Render] Rendering InvalidRecordsAlert with:', invalidRecordsInfo)}
                    <InvalidRecordsAlert
                      invalidRecords={invalidRecordsInfo.invalidRecords}
                      worksheetName={invalidRecordsInfo.worksheetName}
                    />
                  </div>
                )}

                {/* Invalid Records Table */}
                {invalidRecordsInfo && (
                  <div>
                    {console.log('🎨 [DEBUG Render] Rendering InvalidRecordsTable with:', invalidRecordsInfo)}
                    <InvalidRecordsTable
                      invalidRecords={invalidRecordsInfo.invalidRecords}
                      worksheet={allWorksheets.find(w => w.worksheetName === invalidRecordsInfo.worksheetName)!}
                      spreadsheet={spreadsheets.find(s => s.spreadsheetId === allWorksheets.find(w => w.worksheetName === invalidRecordsInfo.worksheetName)?.spreadsheetId)!}
                      onResync={async () => {
                      console.log('🔄 [DEBUG onResync] Button clicked!');
                      // 找到對應的 worksheet
                      const worksheet = allWorksheets.find(w => w.worksheetName === invalidRecordsInfo.worksheetName);
                      console.log('🔍 [DEBUG onResync] Found worksheet:', worksheet);
                      if (worksheet) {
                        try {
                          console.log('⏳ [DEBUG onResync] Starting sync for worksheet:', worksheet.id);
                          const syncResponse = await syncSingleWorksheetMutation.mutateAsync(worksheet.id);
                          console.log('✅ [DEBUG onResync] Sync completed, response:', syncResponse);

                          // 檢查同步結果，更新 invalidRecordsInfo
                          if (syncResponse?.syncStats?.invalidRecords && syncResponse.syncStats.invalidRecords.length > 0) {
                            console.log('⚠️  [DEBUG onResync] Still has invalid records:', syncResponse.syncStats.invalidRecords.length);
                            setInvalidRecordsInfo({
                              worksheetName: worksheet.worksheetName,
                              invalidRecords: syncResponse.syncStats.invalidRecords,
                            });
                          } else {
                            console.log('✅ [DEBUG onResync] No more invalid records, clearing state');
                            setInvalidRecordsInfo(null);
                          }

                          // 重新載入資料
                          refetchAllWorksheets();
                          refetchWorksheets();
                          toast({
                            title: '重新同步成功',
                            description: syncResponse?.syncStats?.invalidRecords?.length > 0
                              ? `仍有 ${syncResponse.syncStats.invalidRecords.length} 筆無效資料`
                              : '所有資料已成功同步',
                          });
                        } catch (error: any) {
                          console.error('❌ [DEBUG onResync] Sync failed:', error);
                          toast({
                            title: '同步失敗',
                            description: error.message,
                            variant: 'destructive'
                          });
                        }
                      } else {
                        console.warn('⚠️  [DEBUG onResync] Worksheet not found!');
                      }
                    }}
                  />
                  </div>
                )}

                {/* 串接 Google Sheets */}
                <div className="flex items-center gap-3">
                  <span className="text-sm whitespace-nowrap font-medium">串接 Google Sheets →</span>
                  <Input
                    placeholder="貼上 Google Sheets URL"
                    value={createForm.url}
                    onChange={(e) => {
                      const url = e.target.value;
                      const spreadsheetId = extractSpreadsheetId(url);
                      setCreateForm(prev => ({
                        ...prev,
                        url,
                        name: spreadsheetId ? `試算表-${spreadsheetId.slice(0, 8)}` : ''
                      }));
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleCreateSpreadsheet}
                    disabled={createSpreadsheetMutation.isPending || !createForm.url}
                    className="px-6"
                  >
                    {createSpreadsheetMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      '新增'
                    )}
                  </Button>
                </div>

                {/* 已串接列表 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">已串接({spreadsheets.length})：</span>
                    <Select
                      value={selectedSpreadsheet}
                      onValueChange={setSelectedSpreadsheet}
                    >
                      <SelectTrigger className="w-[220px] h-9">
                        <SelectValue placeholder="▼ 選擇已串接試算表" />
                      </SelectTrigger>
                      <SelectContent>
                        {spreadsheets.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">/ ↑↓ 調整順序</span>
                  </div>

                  {spreadsheetsLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm pl-6">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      載入中...
                    </div>
                  ) : spreadsheets.length === 0 ? (
                    <div className="text-sm text-muted-foreground pl-6">尚未串接任何試算表</div>
                  ) : (
                    <div className="space-y-2 pl-6">
                      {spreadsheets.map((spreadsheet: Spreadsheet) => (
                        <div key={spreadsheet.id} className="flex items-center gap-3">
                          <span className="text-sm flex-1 truncate">• {spreadsheet.name}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${spreadsheet.spreadsheetId}`, '_blank')}
                              title="開啟"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => handleSyncSpreadsheet(spreadsheet.id)}
                              disabled={syncEnabledWorksheetsMutation.isPending}
                              title="同步"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${syncEnabledWorksheetsMutation.isPending ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteSpreadsheet(spreadsheet.id)}
                              disabled={deleteSpreadsheetMutation.isPending}
                              title="刪除"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 對應設定 */}
                <div className="space-y-4 pt-2 border-t">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium whitespace-nowrap">對應設定 → 選擇試算表</span>
                    <Select
                      value={selectedSpreadsheet}
                      onValueChange={(value) => {
                        setSelectedSpreadsheet(value);
                        setMappingWorksheetId('');
                        setMappingSupabaseTable('');
                      }}
                    >
                      <SelectTrigger className="w-[220px] h-9">
                        <SelectValue placeholder="選擇試算表" />
                      </SelectTrigger>
                      <SelectContent>
                        {spreadsheets.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 單列對應設定 */}
                  {selectedSpreadsheet && (
                    <div className="pl-6 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">工作表</span>
                        <Select
                          value={mappingWorksheetId}
                          onValueChange={setMappingWorksheetId}
                        >
                          <SelectTrigger className="w-[160px] h-8">
                            <SelectValue placeholder="▼ 選擇 Sheet" />
                          </SelectTrigger>
                          <SelectContent>
                            {worksheetsLoading ? (
                              <SelectItem value="loading" disabled>載入中...</SelectItem>
                            ) : worksheets.length === 0 ? (
                              <SelectItem value="none" disabled>無可用工作表</SelectItem>
                            ) : (
                              worksheets.map((w: Worksheet) => (
                                <SelectItem key={w.id} value={w.id}>
                                  {w.worksheetName}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>

                        <span className="text-sm text-muted-foreground">→</span>

                        <span className="text-sm text-muted-foreground whitespace-nowrap">Supabase 表</span>
                        <Select
                          value={mappingSupabaseTable}
                          onValueChange={setMappingSupabaseTable}
                          disabled={!mappingWorksheetId || supabaseTablesLoading}
                        >
                          <SelectTrigger className="flex-1 h-8">
                            <SelectValue placeholder="▼ 選擇目標表" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">不同步</SelectItem>
                            {supabaseTables.map((table) => (
                              <SelectItem key={table} value={table}>
                                {table}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 操作按鈕 */}
                      <div className="flex items-center gap-2 pl-6">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setMappingWorksheetId('');
                            setMappingSupabaseTable('');
                          }}
                          className="h-8"
                        >
                          取消
                        </Button>
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!mappingWorksheetId) {
                              toast({
                                title: '請選擇工作表',
                                variant: 'destructive',
                              });
                              return;
                            }

                            try {
                              const actualValue = mappingSupabaseTable === 'none' ? '' : mappingSupabaseTable;
                              const worksheet = worksheets.find(w => w.id === mappingWorksheetId);

                              if (!worksheet) {
                                toast({
                                  title: '工作表不存在',
                                  variant: 'destructive',
                                });
                                return;
                              }

                              // If worksheet has temp ID, we need to enable it first to create it in database
                              let finalWorksheetId = mappingWorksheetId;

                              if (mappingWorksheetId.startsWith('temp-')) {
                                // Enable the worksheet first (this creates it in the database)
                                const enabledWorksheet = await toggleWorksheetMutation.mutateAsync({
                                  worksheet,
                                  isEnabled: true,
                                });

                                // Refetch to get the real worksheet ID
                                await refetchWorksheets();

                                // Find the newly created worksheet by gid
                                const updatedWorksheets = await apiRequest<Worksheet[]>(
                                  'GET',
                                  `/api/spreadsheets/${selectedSpreadsheet}/worksheets`
                                );
                                const createdWorksheet = updatedWorksheets.find(w => w.gid === worksheet.gid && !w.id.startsWith('temp-'));

                                if (createdWorksheet) {
                                  finalWorksheetId = createdWorksheet.id;
                                } else {
                                  throw new Error('無法取得已建立的工作表 ID');
                                }
                              }

                              // Now set the Supabase mapping with the real worksheet ID
                              await setWorksheetMappingMutation.mutateAsync({
                                worksheetId: finalWorksheetId,
                                supabaseTable: actualValue,
                              });

                              // 如果設定了對應，立即同步該 worksheet 的資料
                              if (actualValue) {
                                try {
                                  // 顯示進度對話框
                                  setSyncProgress({
                                    isOpen: true,
                                    worksheetName: worksheet.worksheetName,
                                    progress: 0,
                                    message: '開始同步...',
                                  });

                                  // 模擬進度更新
                                  const progressInterval = setInterval(() => {
                                    setSyncProgress(prev => ({
                                      ...prev,
                                      progress: Math.min(prev.progress + 10, 90),
                                      message: prev.progress < 30 ? '正在讀取 Google Sheets...' :
                                              prev.progress < 60 ? '正在轉換資料...' :
                                              '正在寫入 Supabase...',
                                    }));
                                  }, 500);

                                  await syncSingleWorksheetMutation.mutateAsync(finalWorksheetId);

                                  clearInterval(progressInterval);
                                  setSyncProgress(prev => ({ ...prev, progress: 100, message: '同步完成！' }));

                                  setTimeout(() => {
                                    setSyncProgress({ isOpen: false, worksheetName: '', progress: 0, message: '' });
                                    toast({
                                      title: '設定並同步成功',
                                      description: `${worksheet?.worksheetName} → ${actualValue}（資料已同步）`,
                                    });
                                  }, 1000);
                                } catch (syncError: any) {
                                  setSyncProgress({ isOpen: false, worksheetName: '', progress: 0, message: '' });
                                  toast({
                                    title: '設定成功，但同步失敗',
                                    description: '請稍後手動點擊同步按鈕',
                                    variant: 'destructive',
                                  });
                                }
                              } else {
                                toast({
                                  title: '設定成功',
                                  description: `已取消 ${worksheet?.worksheetName} 的對應`,
                                });
                              }

                              // 清空選擇
                              setMappingWorksheetId('');
                              setMappingSupabaseTable('');
                              refetchWorksheets();
                            } catch (error: any) {
                              toast({
                                title: '設定失敗',
                                description: error.message,
                                variant: 'destructive',
                              });
                            }
                          }}
                          disabled={!mappingWorksheetId || setWorksheetMappingMutation.isPending}
                          className="h-8"
                        >
                          {setWorksheetMappingMutation.isPending ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            '確定'
                          )}
                        </Button>
                      </div>

                      {/* 已設定的對應列表 */}
                      {worksheets.filter(w => w.supabaseTable).length > 0 && (
                        <div className="pt-2 border-t space-y-1">
                          <div className="text-xs text-muted-foreground mb-2">已設定的對應：</div>
                          {worksheets.filter(w => w.supabaseTable).map((worksheet: Worksheet) => (
                            <div key={worksheet.id} className="flex items-center gap-2 text-xs">
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              <span className="text-muted-foreground">{worksheet.worksheetName}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-green-600">{worksheet.supabaseTable}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 ml-auto text-xs"
                                onClick={() => {
                                  setFieldMappingWorksheet(worksheet);
                                  setFieldMappingOpen(true);
                                }}
                                title="AI 欄位對應"
                              >
                                <Sparkles className="h-3 w-3 mr-1" />
                                欄位對應
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Supabase 狀態 */}
                <div className="flex items-center gap-2 text-sm pt-2 border-t flex-wrap">
                  <span className="font-medium">Supabase 狀態：</span>
                  {supabaseTablesLoading ? (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      檢查中...
                    </div>
                  ) : supabaseTables.length > 0 ? (
                    <>
                      <span className="text-green-600">
                        已連線（可用表格 {supabaseTables.length}）
                      </span>
                      <div className="flex gap-1 flex-wrap">
                        {supabaseTables.map((table) => (
                          <Badge key={table} variant="outline" className="text-xs h-5 px-2">
                            {table}
                          </Badge>
                        ))}
                      </div>
                    </>
                  ) : (
                    <span className="text-amber-600">未連線</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 戰力報表 Tab */}
          <TabsContent value="reports" className="space-y-6">
            {/* 報表系統狀態 */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  報表系統狀態
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{spreadsheets.length}</div>
                    <div className="text-sm text-muted-foreground">已連接的數據源</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {spreadsheets.filter(s => {
                        const sheetWorksheets = allWorksheets.filter(w => w.spreadsheetId === s.spreadsheetId);
                        return sheetWorksheets.some(w => w.isEnabled);
                      }).length}
                    </div>
                    <div className="text-sm text-muted-foreground">啟用的數據源</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {enabledWorksheets.length}
                    </div>
                    <div className="text-sm text-muted-foreground">啟用的工作表</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 報表生成區 */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  報表生成
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-4">
                  <Button
                    onClick={() => generateReport('daily')}
                    disabled={isGenerating || spreadsheets.length === 0}
                    className="flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    生成每日報表
                  </Button>
                  <Button
                    onClick={() => generateReport('weekly')}
                    disabled={isGenerating || spreadsheets.length === 0}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <TrendingUp className="h-4 w-4" />
                    生成每週報表
                  </Button>
                </div>

                {isGenerating && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    正在生成報表...
                  </div>
                )}

                {spreadsheets.length === 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    請先在「Google Sheets 管理」頁面添加數據源
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 報表結果 */}
            {currentReport && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {currentReport.type === 'daily' ? '每日' : '每週'}戰力報表
                    </span>
                    <Badge variant="outline">
                      {new Date(currentReport.reportDate).toLocaleDateString('zh-TW')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <Users className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="text-2xl font-bold">{currentReport.data.metrics.classCount}</div>
                      <div className="text-sm text-muted-foreground">上課次數</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="text-2xl font-bold">{currentReport.data.metrics.purchaseCount}</div>
                      <div className="text-sm text-muted-foreground">購買人數</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <Users className="h-5 w-5 text-purple-500" />
                      </div>
                      <div className="text-2xl font-bold">{currentReport.data.metrics.dealCount}</div>
                      <div className="text-sm text-muted-foreground">成交人數</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <DollarSign className="h-5 w-5 text-orange-500" />
                      </div>
                      <div className="text-2xl font-bold">
                        {currentReport.data.metrics.totalRevenue.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">成交金額 (NT$)</div>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground mb-4">
                    統計期間: {new Date(currentReport.data.period.start).toLocaleDateString('zh-TW')}
                    ~ {new Date(currentReport.data.period.end).toLocaleDateString('zh-TW')}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI 建議顯示區 */}
            {currentReport && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      AI 策略建議
                    </span>
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <Button size="sm" onClick={saveInsights}>
                            <Save className="h-4 w-4 mr-1" />
                            保存
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                            取消
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                          <Edit className="h-4 w-4 mr-1" />
                          編輯
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={editedInsights}
                      onChange={(e) => setEditedInsights(e.target.value)}
                      className="min-h-[200px]"
                      placeholder="輸入您的策略建議..."
                    />
                  ) : (
                    <div className="whitespace-pre-wrap text-sm">
                      {currentReport.userModifiedInsights || currentReport.aiInsights}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 數據總報表 Tab */}
          <TabsContent value="total-report">
            <DashboardTrialReport />
          </TabsContent>

          {/* KPI 計算器 Tab */}
          <TabsContent value="kpi-calculator">
            <DashboardKPICalculator />
          </TabsContent>

          {/* AI 分析 Tab */}
          <TabsContent value="ai-analysis" className="space-y-6">
            <AIAnalysisTabContent />
          </TabsContent>

          {/* Raw Data MVP Tab */}
          <TabsContent value="raw-data-mvp" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Raw Data MVP
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  直接查詢原始資料，跳過 ETL 轉換，支援跨表 JOIN
                </p>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => window.location.href = '/dashboard/raw-data-mvp'}
                  className="w-full"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  開啟 Raw Data MVP 頁面
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <MetricSettingsDialog
        open={isMetricSettingsOpen}
        onOpenChange={setMetricSettingsOpen}
        onSave={() => {
          refetchAllWorksheets();
          refetchWorksheets();
          fetchSystemStatus();
        }}
      />

      {/* Supabase Mapping Dialog */}
      <SupabaseMappingDialog
        worksheet={supabaseMappingWorksheet}
        open={supabaseMappingOpen}
        onOpenChange={setSupabaseMappingOpen}
      />

      {/* AI Field Mapping Dialog */}
      {fieldMappingWorksheet && (
        <FieldMappingDialog
          open={fieldMappingOpen}
          onOpenChange={setFieldMappingOpen}
          worksheetId={fieldMappingWorksheet.id}
          worksheetName={fieldMappingWorksheet.worksheetName}
          googleColumns={fieldMappingWorksheet.headers || []}
          supabaseTable={fieldMappingWorksheet.supabaseTable || ''}
          onSave={async () => {
            // 儲存成功後，立即觸發同步使用新的欄位對應
            try {
              // 顯示同步進度
              setSyncProgress({
                isOpen: true,
                worksheetName: fieldMappingWorksheet.worksheetName,
                progress: 0,
                message: '開始使用新對應同步資料...'
              });

              // 觸發同步
              console.log('🚀 [START] Triggering sync for worksheet:', fieldMappingWorksheet.id);
              const syncResponse = await syncSingleWorksheetMutation.mutateAsync(fieldMappingWorksheet.id);

              console.log('✅ [RESPONSE] Sync completed, checking response...');
              console.log('🔍 [DEBUG] Full syncResponse:', JSON.stringify(syncResponse, null, 2));
              console.log('🔍 [DEBUG] syncResponse type:', typeof syncResponse);
              console.log('🔍 [DEBUG] syncResponse keys:', Object.keys(syncResponse || {}));
              console.log('🔍 [DEBUG] syncStats exists?', !!syncResponse?.syncStats);
              console.log('🔍 [DEBUG] syncStats:', syncResponse?.syncStats);

              // 更新進度
              setSyncProgress(prev => ({ ...prev, progress: 100, message: '同步完成！' }));

              // 2 秒後關閉進度對話框
              setTimeout(() => {
                setSyncProgress({ isOpen: false, worksheetName: '', progress: 0, message: '' });
              }, 2000);

              // 顯示詳細的同步結果
              const stats = syncResponse.syncStats;
              console.log('🔍 [DEBUG Field Mapping onSave] stats:', stats);
              console.log('🔍 [DEBUG Field Mapping onSave] invalidRecords:', stats?.invalidRecords);

              const statsMessage = stats ? (
                stats.hasSyncedToSupabase
                  ? `✅ 已同步 ${stats.insertedToSupabase} 筆資料到 Supabase${stats.invalidRows > 0 ? `（${stats.invalidRows} 筆無效）` : ''}`
                  : `⚠️ 未同步到 Supabase（未設定表格對應）`
              ) : '';

              // 如果有無效資料，儲存到狀態以顯示詳細資訊
              if (stats?.invalidRecords && stats.invalidRecords.length > 0) {
                console.log('✅ [DEBUG Field Mapping onSave] Setting invalidRecordsInfo:', {
                  worksheetName: fieldMappingWorksheet.worksheetName,
                  invalidRecords: stats.invalidRecords,
                });
                setInvalidRecordsInfo({
                  worksheetName: fieldMappingWorksheet.worksheetName,
                  invalidRecords: stats.invalidRecords,
                });
              } else {
                console.log('❌ [DEBUG Field Mapping onSave] No invalid records, clearing state');
                setInvalidRecordsInfo(null);
              }

              toast({
                title: '✅ 對應已儲存並同步完成',
                description: `${fieldMappingWorksheet.worksheetName}: ${statsMessage}`,
              });
            } catch (error: any) {
              setSyncProgress({ isOpen: false, worksheetName: '', progress: 0, message: '' });
              toast({
                title: '同步失敗',
                description: '欄位對應已儲存，但資料同步失敗：' + error.message,
                variant: 'destructive'
              });
            }
          }}
        />
      )}

      {/* 同步進度對話框 */}
      <Dialog open={syncProgress.isOpen} onOpenChange={(open) => !open && setSyncProgress({ isOpen: false, worksheetName: '', progress: 0, message: '' })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>同步工作表</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              正在同步：<span className="font-medium text-foreground">{syncProgress.worksheetName}</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{syncProgress.message}</span>
                <span className="font-medium">{syncProgress.progress}%</span>
              </div>
              <Progress value={syncProgress.progress} className="h-2" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

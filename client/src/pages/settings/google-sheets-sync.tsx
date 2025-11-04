/**
 * Google Sheets 同步管理頁面
 * Phase 39: 新的 Google Sheets 同步系統
 */

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Settings, RefreshCw, ExternalLink, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CreateSourceDialog } from '@/components/sheets/create-source-dialog';
import { FieldMappingDialog } from '@/components/sheets/field-mapping-dialog';
import { SyncLogsDialog } from '@/components/sheets/sync-logs-dialog';
import { SyncProgressDialog, SyncProgress } from '@/components/sheets/sync-progress-dialog';

interface GoogleSheetsSource {
  id: string;
  name: string;
  sheet_url: string;
  sheet_id: string;
  created_at: string;
}

interface SheetMapping {
  id: string;
  source_id: string;
  worksheet_name: string;
  target_table: string;
  field_mappings: Array<{
    googleColumn: string;
    supabaseColumn: string;
  }>;
  is_enabled: boolean;
  created_at: string;
}

function GoogleSheetsSyncContent() {
  const [sources, setSources] = useState<GoogleSheetsSource[]>([]);
  const [mappings, setMappings] = useState<SheetMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedMapping, setSelectedMapping] = useState<string | null>(null);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const { toast } = useToast();

  // 載入資料來源
  const loadSources = async () => {
    try {
      const response = await fetch('/api/sheets/sources');
      const data = await response.json();
      if (data.success) {
        setSources(data.data);
      }
    } catch (error) {
      console.error('載入資料來源失敗:', error);
    }
  };

  // 載入映射設定
  const loadMappings = async () => {
    try {
      const response = await fetch('/api/sheets/mappings');
      const data = await response.json();
      if (data.success) {
        setMappings(data.data);
      }
    } catch (error) {
      console.error('載入映射設定失敗:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadSources(), loadMappings()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // 刪除資料來源
  const handleDeleteSource = async (id: string) => {
    if (!confirm('確定要刪除此資料來源嗎?這將同時刪除所有相關的映射設定。')) {
      return;
    }

    try {
      const response = await fetch(`/api/sheets/sources/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: '刪除成功',
          description: '資料來源已刪除',
        });
        await Promise.all([loadSources(), loadMappings()]);
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: '刪除失敗',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // 手動同步 - 使用 SSE 顯示即時進度
  const handleManualSync = async (mappingId: string) => {
    // 開啟進度對話框
    setProgressDialogOpen(true);
    setSyncProgress({
      mappingId,
      stage: 'reading',
      current: 0,
      total: 0,
      message: '準備同步...',
      percentage: 0,
    });

    // 使用 EventSource 接收 SSE 進度更新
    const eventSource = new EventSource(`/api/sheets/sync/${mappingId}`);

    eventSource.onmessage = (event) => {
      const progress = JSON.parse(event.data);
      setSyncProgress(progress);

      // 同步完成或失敗時關閉連線
      if (progress.stage === 'completed') {
        eventSource.close();
        toast({
          title: '同步成功',
          description: `已成功同步 ${progress.current} 筆記錄`,
        });
        // 2 秒後關閉進度對話框
        setTimeout(() => {
          setProgressDialogOpen(false);
          setSyncProgress(null);
        }, 2000);
      } else if (progress.stage === 'failed') {
        eventSource.close();
        toast({
          title: '同步失敗',
          description: progress.message,
          variant: 'destructive',
        });
        // 3 秒後關閉進度對話框
        setTimeout(() => {
          setProgressDialogOpen(false);
          setSyncProgress(null);
        }, 3000);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE 連線錯誤:', error);
      eventSource.close();
      setSyncProgress({
        mappingId,
        stage: 'failed',
        current: 0,
        total: 0,
        message: '連線失敗，請檢查網路或稍後再試',
        percentage: 0,
      });
      toast({
        title: '連線失敗',
        description: '無法建立即時連線，請稍後再試',
        variant: 'destructive',
      });
      setTimeout(() => {
        setProgressDialogOpen(false);
        setSyncProgress(null);
      }, 3000);
    };
  };

  // 設定映射 (新增映射)
  const handleConfigureMapping = (sourceId: string) => {
    setSelectedSource(sourceId);
    setSelectedMapping(null); // 清空選中的映射,表示新增模式
    setMappingDialogOpen(true);
  };

  // 編輯映射
  const handleEditMapping = (mapping: SheetMapping) => {
    setSelectedSource(mapping.source_id);
    setSelectedMapping(mapping.id); // 設定選中的映射,表示編輯模式
    setMappingDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">載入中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Google Sheets 同步管理</h1>
          <p className="text-muted-foreground mt-1">
            管理 Google Sheets 資料來源，設定欄位映射，自動同步資料到 Supabase
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          新增資料來源
        </Button>
      </div>

      {/* 資料來源列表 */}
      <div className="grid gap-6">
        {sources.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">尚未新增任何 Google Sheets 資料來源</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                新增第一個資料來源
              </Button>
            </CardContent>
          </Card>
        ) : (
          sources.map((source) => {
            const sourceMappings = mappings.filter((m) => m.source_id === source.id);

            return (
              <Card key={source.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle>{source.name}</CardTitle>
                      <Badge variant="outline">
                        {sourceMappings.length} 個映射
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(source.sheet_url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        開啟試算表
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConfigureMapping(source.id)}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        設定映射
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSource(source.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {sourceMappings.length > 0 && (
                  <CardContent>
                    <div className="space-y-3">
                      {sourceMappings.map((mapping) => (
                        <div
                          key={mapping.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{mapping.worksheet_name}</span>
                              <span className="text-muted-foreground">→</span>
                              <code className="text-sm bg-muted px-2 py-1 rounded">
                                {mapping.target_table}
                              </code>
                              {mapping.is_enabled ? (
                                <Badge variant="default">已啟用</Badge>
                              ) : (
                                <Badge variant="secondary">已停用</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {mapping.field_mappings.length} 個欄位映射
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditMapping(mapping)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              編輯
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleManualSync(mapping.id)}
                              disabled={!mapping.is_enabled}
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              手動同步
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* 同步記錄按鈕 */}
      {mappings.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setLogsDialogOpen(true)}
          >
            查看同步記錄
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <CreateSourceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          loadSources();
          setCreateDialogOpen(false);
        }}
      />

      {selectedSource && (
        <FieldMappingDialog
          open={mappingDialogOpen}
          onOpenChange={setMappingDialogOpen}
          sourceId={selectedSource}
          mappingId={selectedMapping}
          onSuccess={() => {
            loadMappings();
            setMappingDialogOpen(false);
          }}
        />
      )}

      <SyncLogsDialog
        open={logsDialogOpen}
        onOpenChange={setLogsDialogOpen}
      />

      <SyncProgressDialog
        open={progressDialogOpen}
        onOpenChange={setProgressDialogOpen}
        progress={syncProgress}
      />
    </div>
  );
}

export default function GoogleSheetsSync() {
  return (
    <DashboardLayout title="Google Sheets 串接">
      <GoogleSheetsSyncContent />
    </DashboardLayout>
  );
}

/**
 * 欄位映射設定對話框
 * 讓使用者手動映射 Google Sheets 欄位到 Supabase 表格欄位
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface FieldMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceId: string;
  mappingId?: string | null; // 如果有 mappingId 表示編輯模式,否則為新增模式
  onSuccess: () => void;
}

interface FieldMapping {
  googleColumn: string;
  supabaseColumn: string;
}

export function FieldMappingDialog({
  open,
  onOpenChange,
  sourceId,
  mappingId,
  onSuccess,
}: FieldMappingDialogProps) {
  const [worksheets, setWorksheets] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedWorksheet, setSelectedWorksheet] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [googleColumns, setGoogleColumns] = useState<string[]>([]);
  const [supabaseColumns, setSupabaseColumns] = useState<string[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [syncSchedule, setSyncSchedule] = useState<string[]>(['02:00']);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const { toast } = useToast();

  // 載入工作表列表
  useEffect(() => {
    if (open && sourceId) {
      loadWorksheets();
      loadTables();

      // 如果是編輯模式,載入現有映射資料
      if (mappingId) {
        setIsEditMode(true);
        loadExistingMapping(mappingId);
      } else {
        setIsEditMode(false);
        resetForm();
      }
    }
  }, [open, sourceId, mappingId]);

  // 當選擇工作表時,載入欄位
  useEffect(() => {
    if (selectedWorksheet) {
      loadGoogleColumns();
    }
  }, [selectedWorksheet]);

  // 當選擇表格時,載入欄位
  useEffect(() => {
    if (selectedTable) {
      loadSupabaseColumns();
    }
  }, [selectedTable]);

  const loadWorksheets = async () => {
    try {
      console.log('📄 Loading worksheets for sourceId:', sourceId);
      const response = await fetch(`/api/sheets/${sourceId}/worksheets`);
      const data = await response.json();
      console.log('📄 Worksheets response:', data);

      if (data.success) {
        console.log('✅ Setting worksheets:', data.data.length, 'worksheets');
        setWorksheets(data.data);
      } else {
        console.error('❌ Failed to load worksheets:', data);
      }
    } catch (error) {
      console.error('❌ 載入工作表失敗:', error);
    }
  };

  const loadTables = async () => {
    try {
      const response = await fetch('/api/database/tables');
      const data = await response.json();
      console.log('📊 Database tables response:', data);

      // 處理兩種可能的回應格式
      if (data.success && data.tables) {
        console.log('✅ Setting tables (with success):', data.tables.length, 'tables');
        setTables(data.tables);
      } else if (data.tables) {
        // 舊版 API 格式（沒有 success 欄位）
        console.log('✅ Setting tables (legacy format):', data.tables.length, 'tables');
        setTables(data.tables);
      } else {
        console.error('❌ 無效的 API 回應格式:', data);
      }
    } catch (error) {
      console.error('❌ 載入表格失敗:', error);
    }
  };

  const loadGoogleColumns = async () => {
    try {
      const response = await fetch(
        `/api/sheets/${sourceId}/worksheets/${encodeURIComponent(selectedWorksheet)}/headers`
      );
      const data = await response.json();
      if (data.success) {
        setGoogleColumns(data.data);
      }
    } catch (error) {
      console.error('載入 Google Sheets 欄位失敗:', error);
    }
  };

  const loadSupabaseColumns = async () => {
    try {
      const response = await fetch(`/api/database/tables/${selectedTable}/columns`);
      const data = await response.json();
      // API 回傳格式: { columns: [{ column_name, data_type, ... }] }
      if (data.columns) {
        setSupabaseColumns(data.columns.map((col: any) => col.column_name));
      }
    } catch (error) {
      console.error('載入 Supabase 欄位失敗:', error);
    }
  };

  // 載入現有映射資料 (編輯模式)
  const loadExistingMapping = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sheets/mappings/${id}`);
      const data = await response.json();

      if (data.success) {
        const mapping = data.data;
        setSelectedWorksheet(mapping.worksheet_name);
        setSelectedTable(mapping.target_table);
        setMappings(mapping.field_mappings || []);
        setIsEnabled(mapping.is_enabled);
        setSyncSchedule(mapping.sync_schedule || ['02:00']);
      }
    } catch (error) {
      console.error('載入映射資料失敗:', error);
      toast({
        title: '載入失敗',
        description: '無法載入映射資料',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 重置表單 (新增模式)
  const resetForm = () => {
    setSelectedWorksheet('');
    setSelectedTable('');
    setMappings([]);
    setIsEnabled(true);
    setSyncSchedule(['02:00']);
  };

  const handleAddMapping = () => {
    setMappings([...mappings, { googleColumn: '', supabaseColumn: '' }]);
  };

  const handleRemoveMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const handleMappingChange = (
    index: number,
    field: 'googleColumn' | 'supabaseColumn',
    value: string
  ) => {
    const newMappings = [...mappings];
    newMappings[index][field] = value;
    setMappings(newMappings);
  };

  const handleSubmit = async () => {
    // 驗證
    if (!selectedWorksheet || !selectedTable) {
      toast({
        title: '請選擇工作表和目標表格',
        variant: 'destructive',
      });
      return;
    }

    if (mappings.length === 0) {
      toast({
        title: '請至少新增一個欄位映射',
        variant: 'destructive',
      });
      return;
    }

    // 檢查同步排程
    if (isEnabled && syncSchedule.length === 0) {
      toast({
        title: '請至少選擇一個同步時間',
        variant: 'destructive',
      });
      return;
    }

    // 檢查是否有未完成的映射
    const incompleteMappings = mappings.filter(
      (m) => !m.googleColumn || !m.supabaseColumn
    );
    if (incompleteMappings.length > 0) {
      toast({
        title: '請完成所有欄位映射',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      let response;

      if (isEditMode && mappingId) {
        // 編輯模式: PUT 更新
        response = await fetch(`/api/sheets/mappings/${mappingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field_mappings: mappings,
            is_enabled: isEnabled,
            sync_schedule: syncSchedule,
          }),
        });
      } else {
        // 新增模式: POST 建立
        response = await fetch('/api/sheets/mappings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_id: sourceId,
            worksheet_name: selectedWorksheet,
            target_table: selectedTable,
            field_mappings: mappings,
            is_enabled: isEnabled,
            sync_schedule: syncSchedule,
          }),
        });
      }

      const data = await response.json();

      if (data.success) {
        toast({
          title: '儲存成功',
          description: isEditMode ? '映射已更新' : '映射已建立',
        });
        // 重置表單
        resetForm();
        onSuccess();
      } else {
        throw new Error(data.message || '儲存失敗');
      }
    } catch (error: any) {
      toast({
        title: '儲存失敗',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 診斷函數
  const diagnose = () => {
    console.log('🔍 診斷資訊:');
    console.log('  open:', open);
    console.log('  sourceId:', sourceId);
    console.log('  mappingId:', mappingId);
    console.log('  isEditMode:', isEditMode);
    console.log('  worksheets:', worksheets);
    console.log('  tables:', tables);
    console.log('  selectedWorksheet:', selectedWorksheet);
    console.log('  selectedTable:', selectedTable);
    console.log('  loading:', loading);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? '編輯欄位映射' : '設定欄位映射'}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={diagnose}
              className="ml-4"
            >
              🔍 診斷
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 選擇工作表 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Google Sheets 工作表</Label>
              <Select
                value={selectedWorksheet}
                onValueChange={setSelectedWorksheet}
                disabled={loading || isEditMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇工作表" />
                </SelectTrigger>
                <SelectContent>
                  {worksheets.map((worksheet) => (
                    <SelectItem key={worksheet} value={worksheet}>
                      {worksheet}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEditMode && (
                <p className="text-xs text-muted-foreground">編輯模式下無法更改工作表</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>目標 Supabase 表格</Label>
              <Select
                value={selectedTable}
                onValueChange={setSelectedTable}
                disabled={loading || isEditMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇表格" />
                </SelectTrigger>
                <SelectContent>
                  {tables.length === 0 ? (
                    <div className="px-2 py-1 text-sm text-muted-foreground">
                      載入表格中...
                    </div>
                  ) : (
                    tables.map((table) => (
                      <SelectItem key={table} value={table}>
                        {table}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {isEditMode && (
                <p className="text-xs text-muted-foreground">編輯模式下無法更改目標表格</p>
              )}
              {!isEditMode && tables.length === 0 && (
                <p className="text-xs text-red-500">無法載入表格列表，請重新整理頁面</p>
              )}
              {!isEditMode && tables.length > 0 && (
                <p className="text-xs text-muted-foreground">已載入 {tables.length} 個表格</p>
              )}
            </div>
          </div>

          {/* 欄位映射 */}
          {selectedWorksheet && selectedTable && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>欄位映射</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddMapping}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    新增映射
                  </Button>
                </div>

                {mappings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    點擊「新增映射」開始設定欄位對應關係
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mappings.map((mapping, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <Select
                            value={mapping.googleColumn}
                            onValueChange={(value) =>
                              handleMappingChange(index, 'googleColumn', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Google Sheets 欄位" />
                            </SelectTrigger>
                            <SelectContent>
                              {googleColumns.map((col) => (
                                <SelectItem key={col} value={col}>
                                  {col}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />

                        <div className="flex-1">
                          <Select
                            value={mapping.supabaseColumn}
                            onValueChange={(value) =>
                              handleMappingChange(index, 'supabaseColumn', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Supabase 欄位" />
                            </SelectTrigger>
                            <SelectContent>
                              {supabaseColumns.map((col) => (
                                <SelectItem key={col} value={col}>
                                  {col}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMapping(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 同步排程設定 */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>啟用自動同步</Label>
                    <p className="text-sm text-muted-foreground">
                      選擇每日自動同步的時間點
                    </p>
                  </div>
                  <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
                </div>

                {isEnabled && (
                  <div className="space-y-3 pt-3 border-t">
                    <Label>同步時間設定</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {['00:00', '06:00', '12:00', '18:00', '02:00', '08:00', '14:00', '20:00'].map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => {
                            if (syncSchedule.includes(time)) {
                              setSyncSchedule(syncSchedule.filter((t) => t !== time));
                            } else {
                              setSyncSchedule([...syncSchedule, time].sort());
                            }
                          }}
                          className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                            syncSchedule.includes(time)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background hover:bg-muted border-input'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                    {syncSchedule.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        已選擇 {syncSchedule.length} 個時間點: {syncSchedule.sort().join(', ')}
                      </p>
                    )}
                    {syncSchedule.length === 0 && (
                      <p className="text-xs text-amber-600">
                        請至少選擇一個同步時間
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? '儲存中...' : '儲存映射'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

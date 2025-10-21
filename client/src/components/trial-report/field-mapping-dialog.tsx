/**
 * Field Mapping Dialog
 * 欄位對應管理介面：讓營運人員調整 Google Sheet → Supabase 的欄位對應
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Plus, RotateCcw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SheetMappingField {
  supabaseColumn: string;
  aliases: string[];
  required?: boolean;
  transform?: 'date' | 'number' | 'boolean' | null;
}

interface SheetFieldMapping {
  sheetType: 'trial_attendance' | 'trial_purchase' | 'eods';
  sheetNamePatterns: string[];
  targetTable: string;
  fields: SheetMappingField[];
  keyStrategy: 'spreadsheet_row' | 'email_date';
}

interface FieldMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHEET_TYPE_LABELS = {
  trial_attendance: '體驗課上課記錄',
  trial_purchase: '體驗課購買記錄',
  eods: 'EODs 成交記錄',
};

export function FieldMappingDialog({ open, onOpenChange }: FieldMappingDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'trial_attendance' | 'trial_purchase' | 'eods'>(
    'trial_attendance'
  );
  const [editedMapping, setEditedMapping] = useState<SheetFieldMapping | null>(null);
  const [newAlias, setNewAlias] = useState<Record<string, string>>({});

  // Use dev endpoint in development mode (no auth required)
  const isDev = import.meta.env.DEV;
  const apiEndpoint = isDev ? '/api/dev/sheet-mappings' : '/api/sheet-mappings';

  // Fetch all mappings
  const { data: mappings, isLoading } = useQuery<SheetFieldMapping[]>({
    queryKey: [apiEndpoint],
    enabled: open,
  });

  // Fetch introspection data to show available fields
  const { data: introspectData } = useQuery({
    queryKey: ['/api/tools/introspect-sheets/latest'],
    enabled: open,
  });

  // Update mapping mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { sheetType: string; updates: Partial<SheetFieldMapping> }) => {
      const response = await fetch(`${apiEndpoint}/${data.sheetType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.updates),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to update mapping');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
    },
  });

  // Reset mapping mutation
  const resetMutation = useMutation({
    mutationFn: async (sheetType: string) => {
      const response = await fetch(`${apiEndpoint}/${sheetType}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to reset mapping');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiEndpoint] });
      setEditedMapping(null);
    },
  });

  // Load current mapping when tab changes
  useEffect(() => {
    if (mappings) {
      const currentMapping = mappings.find((m) => m.sheetType === activeTab);
      if (currentMapping) {
        setEditedMapping(JSON.parse(JSON.stringify(currentMapping)));
      }
    }
  }, [activeTab, mappings]);

  const handleAddAlias = (fieldIndex: number) => {
    if (!editedMapping) return;
    const alias = newAlias[`${activeTab}_${fieldIndex}`];
    if (!alias || !alias.trim()) return;

    const updated = { ...editedMapping };
    updated.fields[fieldIndex].aliases.push(alias.trim());
    setEditedMapping(updated);
    setNewAlias({ ...newAlias, [`${activeTab}_${fieldIndex}`]: '' });
  };

  const handleRemoveAlias = (fieldIndex: number, aliasIndex: number) => {
    if (!editedMapping) return;
    const updated = { ...editedMapping };
    updated.fields[fieldIndex].aliases.splice(aliasIndex, 1);
    setEditedMapping(updated);
  };

  const handleToggleRequired = (fieldIndex: number) => {
    if (!editedMapping) return;
    const updated = { ...editedMapping };
    updated.fields[fieldIndex].required = !updated.fields[fieldIndex].required;
    setEditedMapping(updated);
  };

  const handleChangeTransform = (fieldIndex: number, transform: string) => {
    if (!editedMapping) return;
    const updated = { ...editedMapping };
    updated.fields[fieldIndex].transform = transform === 'none' ? null : (transform as any);
    setEditedMapping(updated);
  };

  const handleSave = () => {
    if (!editedMapping) return;
    updateMutation.mutate({
      sheetType: activeTab,
      updates: {
        fields: editedMapping.fields,
        keyStrategy: editedMapping.keyStrategy,
      },
    });
  };

  const handleReset = () => {
    if (confirm('確定要重置為預設設定嗎？此操作無法復原。')) {
      resetMutation.mutate(activeTab);
    }
  };

  const getAvailableFields = () => {
    if (!introspectData?.data?.sheets) return [];
    const allFields = new Set<string>();
    introspectData.data.sheets.forEach((sheet: any) => {
      sheet.fields?.forEach((field: string) => allFields.add(field));
    });
    return Array.from(allFields).sort();
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>欄位對應管理</DialogTitle>
            <DialogDescription>載入中...</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>欄位對應管理</DialogTitle>
          <DialogDescription>
            設定 Google Sheet 欄位如何對應到 Supabase 資料表，支援多個別名與型別轉換。
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trial_attendance">上課記錄</TabsTrigger>
            <TabsTrigger value="trial_purchase">購買記錄</TabsTrigger>
            <TabsTrigger value="eods">EODs 記錄</TabsTrigger>
          </TabsList>

          {['trial_attendance', 'trial_purchase', 'eods'].map((sheetType) => (
            <TabsContent key={sheetType} value={sheetType} className="space-y-4 mt-4">
              {editedMapping && editedMapping.sheetType === sheetType ? (
                <>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      目標表：<strong>{editedMapping.targetTable}</strong> | Unique Key 策略：
                      <strong>
                        {editedMapping.keyStrategy === 'spreadsheet_row'
                          ? 'Spreadsheet + Row'
                          : 'Email + Date'}
                      </strong>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4 border rounded-lg p-4 max-h-[450px] overflow-y-auto">
                    {editedMapping.fields.map((field, fieldIndex) => (
                      <div
                        key={field.supabaseColumn}
                        className="border-b pb-4 last:border-b-0 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Label className="font-semibold">{field.supabaseColumn}</Label>
                            {field.required && (
                              <Badge variant="destructive" className="text-xs">
                                必填
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={field.required || false}
                              onCheckedChange={() => handleToggleRequired(fieldIndex)}
                            />
                            <span className="text-sm text-muted-foreground">必填</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">型別轉換</Label>
                            <Select
                              value={field.transform || 'none'}
                              onValueChange={(v) => handleChangeTransform(fieldIndex, v)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">無</SelectItem>
                                <SelectItem value="date">日期</SelectItem>
                                <SelectItem value="number">數字</SelectItem>
                                <SelectItem value="boolean">布林值</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs text-muted-foreground">
                              欄位別名 ({field.aliases.length})
                            </Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {field.aliases.map((alias, aliasIndex) => (
                                <Badge
                                  key={aliasIndex}
                                  variant="secondary"
                                  className="text-xs flex items-center gap-1"
                                >
                                  {alias}
                                  <X
                                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                                    onClick={() => handleRemoveAlias(fieldIndex, aliasIndex)}
                                  />
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Input
                            placeholder="新增別名（如：姓名、學員姓名...）"
                            value={newAlias[`${sheetType}_${fieldIndex}`] || ''}
                            onChange={(e) =>
                              setNewAlias({
                                ...newAlias,
                                [`${sheetType}_${fieldIndex}`]: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddAlias(fieldIndex);
                              }
                            }}
                            className="h-8"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddAlias(fieldIndex)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {getAvailableFields().length > 0 && (
                    <Alert>
                      <AlertDescription>
                        <div className="text-sm">
                          <strong>最近盤點到的欄位：</strong>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {getAvailableFields().slice(0, 20).map((field) => (
                              <Badge key={field} variant="outline" className="text-xs">
                                {field}
                              </Badge>
                            ))}
                            {getAvailableFields().length > 20 && (
                              <span className="text-xs text-muted-foreground">
                                ...等 {getAvailableFields().length} 個欄位
                              </span>
                            )}
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">載入中...</div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={resetMutation.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            重置為預設
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? '儲存中...' : '儲存設定'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

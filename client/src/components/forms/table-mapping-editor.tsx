/**
 * Table Mapping Editor
 * 欄位映射編輯器組件
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { StorageType, FormField, TableColumn } from '@/types/custom-form';

interface TableMappingEditorProps {
  storageType: StorageType;
  targetTable?: string;
  fieldMappings?: Record<string, string>;
  fields: FormField[];
  onStorageTypeChange: (type: StorageType) => void;
  onTargetTableChange: (table: string) => void;
  onFieldMappingsChange: (mappings: Record<string, string>) => void;
}

export function TableMappingEditor({
  storageType,
  targetTable,
  fieldMappings = {},
  fields,
  onStorageTypeChange,
  onTargetTableChange,
  onFieldMappingsChange,
}: TableMappingEditorProps) {
  const [tables, setTables] = useState<string[]>([]);
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (targetTable) {
      loadColumns(targetTable);
    }
  }, [targetTable]);

  const loadTables = async () => {
    try {
      const response = await fetch('/api/database/tables');
      const data = await response.json();
      setTables(data.tables || []);
    } catch (error) {
      console.error('載入資料表失敗:', error);
    }
  };

  const loadColumns = async (tableName: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/database/tables/${tableName}/columns`);
      const data = await response.json();
      setColumns(data.columns || []);
    } catch (error) {
      console.error('載入欄位失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStorageTypeChange = (type: StorageType) => {
    onStorageTypeChange(type);
    if (type === 'form_submissions') {
      onTargetTableChange('');
      onFieldMappingsChange({});
    }
  };

  const handleMappingChange = (fieldId: string, columnName: string) => {
    const newMappings = { ...fieldMappings, [fieldId]: columnName };
    onFieldMappingsChange(newMappings);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>資料存放方式</CardTitle>
        <CardDescription>
          選擇表單資料要存放在哪裡
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 存放方式選擇 */}
        <RadioGroup value={storageType} onValueChange={handleStorageTypeChange}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="form_submissions" id="storage-unified" />
            <Label htmlFor="storage-unified" className="font-normal cursor-pointer">
              <div>
                <div className="font-medium">存到統一表單資料表（推薦）</div>
                <div className="text-sm text-muted-foreground">
                  簡單易用，所有表單資料存在同一個表
                </div>
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom_table" id="storage-custom" />
            <Label htmlFor="storage-custom" className="font-normal cursor-pointer">
              <div>
                <div className="font-medium">對應到現有 Supabase 表</div>
                <div className="text-sm text-muted-foreground">
                  直接寫入現有資料表，需要手動映射欄位
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>

        {/* 自訂表設定 */}
        {storageType === 'custom_table' && (
          <div className="space-y-4 pl-6 border-l-2">
            {/* 選擇目標表 */}
            <div className="space-y-2">
              <Label htmlFor="target-table">目標資料表</Label>
              <Select value={targetTable || ''} onValueChange={onTargetTableChange}>
                <SelectTrigger id="target-table">
                  <SelectValue placeholder="選擇資料表" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 欄位映射 */}
            {targetTable && fields.length > 0 && (
              <div className="space-y-3">
                <Label className="text-base">欄位映射</Label>
                <p className="text-sm text-muted-foreground">
                  將表單欄位對應到資料表欄位
                </p>

                {loading ? (
                  <div className="text-sm text-muted-foreground">載入欄位中...</div>
                ) : columns.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      無法載入表欄位，請確認表名稱是否正確
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {fields.map((field) => (
                      <div key={field.id} className="grid grid-cols-2 gap-4 items-center">
                        <div className="text-sm">
                          <div className="font-medium">{field.label}</div>
                          <div className="text-muted-foreground">({field.type})</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">→</span>
                          <Select
                            value={fieldMappings[field.id] || ''}
                            onValueChange={(value) => handleMappingChange(field.id, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="選擇欄位" />
                            </SelectTrigger>
                            <SelectContent>
                              {columns.map((col) => (
                                <SelectItem key={col.column_name} value={col.column_name}>
                                  {col.column_name}
                                  <span className="text-muted-foreground ml-2">
                                    ({col.data_type})
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}

                    {/* 驗證提示 */}
                    {fields.some(f => !fieldMappings[f.id]) && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          還有欄位尚未映射，請完成所有欄位的映射設定
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            )}

            {targetTable && fields.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  請先新增表單欄位，才能進行欄位映射
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

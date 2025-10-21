/**
 * Field Mapping Dialog Component
 * 欄位對應編輯對話框
 *
 * 功能：
 * 1. 顯示 AI 建議的欄位對應（以 Supabase 欄位為主）
 * 2. 手動調整對應
 * 3. 顯示信心分數
 * 4. 儲存對應到資料庫
 *
 * 更新 (2025-10-06):
 * - 反轉對應方向：Supabase 欄位 → Google Sheets 欄位
 * - 優化儲存流程：延遲關閉對話框讓使用者看到成功訊息
 * - 必填欄位警告
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MappingSuggestion {
  googleColumn: string;
  supabaseColumn: string;
  confidence: number;
  dataType: string;
  transformFunction?: string;
  isRequired: boolean;
  reasoning: string;
}

interface SupabaseColumnInfo {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

interface FieldMappingAnalysis {
  worksheetName: string;
  supabaseTable: string;
  suggestions: MappingSuggestion[];
  unmappedGoogleColumns: string[];
  unmappedSupabaseColumns: string[];
  unmappedRequiredColumns?: string[]; // 未對應的必填欄位
  overallConfidence: number;
}

interface FieldMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worksheetId: string;
  worksheetName: string;
  googleColumns: string[];
  supabaseTable: string;
  onSave?: (mappings: MappingSuggestion[]) => void;
}

export function FieldMappingDialog({
  open,
  onOpenChange,
  worksheetId,
  worksheetName,
  googleColumns,
  supabaseTable,
  onSave
}: FieldMappingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analysis, setAnalysis] = useState<FieldMappingAnalysis | null>(null);
  const [mappings, setMappings] = useState<MappingSuggestion[]>([]);
  const [supabaseSchema, setSupabaseSchema] = useState<SupabaseColumnInfo[]>([]);
  const { toast } = useToast();

  // 載入欄位對應建議
  useEffect(() => {
    if (open && googleColumns.length > 0) {
      analyzeFields();
    }
  }, [open, worksheetId, googleColumns, supabaseTable]);

  const analyzeFields = async () => {
    setLoading(true);
    try {
      // 1. 先取得 Supabase schema
      const schemaResponse = await fetch(`/api/field-mapping/schemas/${supabaseTable}`);
      const schemaData = await schemaResponse.json();

      if (!schemaData.success) {
        throw new Error('無法取得 Supabase schema');
      }

      setSupabaseSchema(schemaData.data.columns);

      // 2. 檢查是否有已儲存的對應
      const savedMappingResponse = await fetch(`/api/worksheets/${worksheetId}/mapping`);
      const savedMappingData = await savedMappingResponse.json();

      let finalMappings: MappingSuggestion[] = [];
      let useSavedMapping = false;

      if (savedMappingData.success && savedMappingData.data.length > 0) {
        // 有已儲存的對應，使用儲存的對應
        console.log('✅ 載入已儲存的對應:', savedMappingData.data.length, '筆');
        useSavedMapping = true;

        finalMappings = savedMappingData.data.map((saved: any) => ({
          supabaseColumn: saved.supabase_column,
          googleColumn: saved.google_column,
          confidence: saved.ai_confidence || 0,
          dataType: saved.data_type || 'text',
          transformFunction: saved.transform_function,
          isRequired: saved.is_required || false,
          reasoning: saved.ai_reasoning || '已儲存的對應'
        }));
      } else {
        // 沒有已儲存的對應，使用 AI 分析
        console.log('🤖 沒有已儲存的對應，使用 AI 分析');
        const response = await fetch(`/api/worksheets/${worksheetId}/analyze-fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            googleColumns,
            supabaseTable
          })
        });

        const data = await response.json();

        if (data.success) {
          finalMappings = data.data.suggestions;
          setAnalysis(data.data);
        } else {
          throw new Error(data.error || '無法分析欄位對應');
        }
      }

      // 設定最終的對應
      setMappings(finalMappings);

      // 如果使用已儲存的對應，也需要設定 analysis（用於顯示整體資訊）
      if (useSavedMapping) {
        const mappedSupabaseColumns = new Set(finalMappings.map(m => m.supabaseColumn));
        const unmappedSupabaseColumns = schemaData.data.columns
          .map((col: any) => col.name)
          .filter((name: string) => !mappedSupabaseColumns.has(name));

        const unmappedRequiredColumns = schemaData.data.columns
          .filter((col: any) => col.required && !mappedSupabaseColumns.has(col.name))
          .map((col: any) => col.name);

        const overallConfidence = finalMappings.length > 0
          ? finalMappings.reduce((sum, m) => sum + m.confidence, 0) / finalMappings.length
          : 0;

        setAnalysis({
          worksheetName,
          supabaseTable,
          suggestions: finalMappings,
          unmappedGoogleColumns: [],
          unmappedSupabaseColumns,
          unmappedRequiredColumns,
          overallConfidence
        });
      }
    } catch (error) {
      console.error('Error analyzing fields:', error);
      toast({
        title: '錯誤',
        description: error instanceof Error ? error.message : '分析欄位時發生錯誤',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // 修改對應：改為 Supabase → Google 的方向
  const handleMappingChange = (supabaseColumn: string, newGoogleColumn: string) => {
    setMappings(prev => {
      // 找出該 Supabase 欄位的舊對應（用於保留 AI 信心分數）
      const oldMapping = prev.find(m => m.supabaseColumn === supabaseColumn);

      // 移除該 Supabase 欄位的舊對應
      const filtered = prev.filter(m => m.supabaseColumn !== supabaseColumn);

      // 如果選擇「不對應」，就不新增
      if (!newGoogleColumn || newGoogleColumn === 'none') {
        return filtered;
      }

      // 檢查是否更改了對應
      const isChanged = !oldMapping || oldMapping.googleColumn !== newGoogleColumn;

      // 新增新對應
      const schemaCol = supabaseSchema.find(col => col.name === supabaseColumn);
      return [...filtered, {
        supabaseColumn,
        googleColumn: newGoogleColumn,
        // 如果手動更改，信心分數設為 1.0（100%），否則保留原本的 AI 分數
        confidence: isChanged ? 1.0 : (oldMapping?.confidence || 0),
        dataType: schemaCol?.type || 'text',
        isRequired: schemaCol?.required || false,
        reasoning: isChanged ? '手動調整' : (oldMapping?.reasoning || 'AI 建議')
      }];
    });
  };

  const handleSave = async () => {
    // 驗證必填欄位是否都有對應
    const mappedSupabaseColumns = new Set(mappings.map(m => m.supabaseColumn));
    const unmappedRequired = supabaseSchema
      .filter(col => col.required && !mappedSupabaseColumns.has(col.name))
      .map(col => col.name);

    if (unmappedRequired.length > 0) {
      toast({
        title: '必填欄位未對應',
        description: `以下必填欄位尚未對應：${unmappedRequired.join(', ')}`,
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/worksheets/${worksheetId}/save-mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabaseTable,
          mappings
        })
      });

      const data = await response.json();

      if (data.success) {
        // 儲存成功，呼叫 onSave 回調
        // onSave 會負責：1. 觸發同步  2. 顯示最終的成功訊息  3. 關閉對話框
        if (onSave) {
          await onSave(mappings);
        } else {
          // 如果沒有 onSave 回調，顯示預設訊息並關閉
          toast({
            title: '✅ 儲存成功',
            description: `已儲存 ${mappings.length} 個欄位對應`,
          });
          setTimeout(() => {
            onOpenChange(false);
          }, 1500);
        }
      } else {
        toast({
          title: '儲存失敗',
          description: data.error || '無法儲存欄位對應',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error saving mappings:', error);
      toast({
        title: '錯誤',
        description: '儲存對應時發生錯誤',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    const percentage = Math.round(confidence * 100);

    if (confidence >= 0.8) {
      return <Badge className="bg-green-500">{percentage}%</Badge>;
    } else if (confidence >= 0.5) {
      return <Badge className="bg-yellow-500">{percentage}%</Badge>;
    } else {
      return <Badge variant="destructive">{percentage}%</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>欄位對應設定</DialogTitle>
          <DialogDescription>
            為 {worksheetName} 設定 Google Sheets 到 {supabaseTable} 的欄位對應
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">分析欄位中...</span>
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            {/* 對應狀態摘要 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-semibold">整體信心分數</p>
                  <p className="text-sm text-muted-foreground">
                    AI 分析了 {googleColumns.length} 個欄位
                  </p>
                </div>
                <div className="text-2xl font-bold">
                  {getConfidenceBadge(analysis.overallConfidence)}
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-900">已對應欄位</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">
                  {mappings.length} / {supabaseSchema.length}
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-semibold text-green-900">手動調整</p>
                <p className="text-2xl font-bold text-green-700 mt-1">
                  {mappings.filter(m => m.confidence === 1.0).length} 筆
                </p>
              </div>
            </div>

            {/* 欄位對應表格 (新版：以 Supabase 欄位為主) */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Supabase 欄位 (目標)</th>
                    <th className="px-4 py-3 text-center w-12"></th>
                    <th className="px-4 py-3 text-left font-semibold">Google Sheets 欄位 (來源)</th>
                    <th className="px-4 py-3 text-center font-semibold">信心</th>
                    <th className="px-4 py-3 text-left font-semibold">說明</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {supabaseSchema.map((schemaCol) => {
                    // 找出這個 Supabase 欄位的對應
                    const mapping = mappings.find(m => m.supabaseColumn === schemaCol.name);

                    return (
                      <tr key={schemaCol.name} className={`hover:bg-muted/50 ${schemaCol.required && !mapping ? 'bg-yellow-50' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{schemaCol.name}</span>
                            {schemaCol.required && (
                              <Badge variant="destructive" className="text-xs">必填</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {schemaCol.type}
                            {schemaCol.description && ` • ${schemaCol.description}`}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <ArrowRight className="h-4 w-4 text-primary rotate-180" />
                        </td>
                        <td className="px-4 py-3">
                          {mapping?.googleColumn && mapping.googleColumn !== 'none' ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-primary">{mapping.googleColumn}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={() => handleMappingChange(schemaCol.name, 'none')}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Select
                              value={mapping?.googleColumn || 'none'}
                              onValueChange={(value) => handleMappingChange(schemaCol.name, value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={schemaCol.required ? "請選擇欄位" : "選擇欄位或不對應"} />
                              </SelectTrigger>
                              <SelectContent>
                                {!schemaCol.required && (
                                  <SelectItem value="none">
                                    <span className="text-muted-foreground">⊗ 不對應此欄位</span>
                                  </SelectItem>
                                )}
                                {googleColumns.map(col => (
                                  <SelectItem key={col} value={col}>
                                    {col}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {mapping ? getConfidenceBadge(mapping.confidence) : (
                            <Badge variant="outline" className="text-xs">未對應</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-muted-foreground">
                            {mapping?.reasoning || (schemaCol.required ? '⚠️ 必填欄位' : '選填欄位')}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 未對應的必填欄位警告 */}
            {analysis.unmappedRequiredColumns && analysis.unmappedRequiredColumns.length > 0 && (
              <div className="border border-yellow-300 rounded-lg overflow-hidden bg-yellow-50">
                <div className="p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-800">必填欄位未對應</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        以下必填欄位尚未對應到 Google Sheets 欄位，請在上方表格中設定：
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {analysis.unmappedRequiredColumns.map(col => (
                          <Badge key={col} variant="destructive" className="text-xs">
                            {col}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving || !analysis}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                儲存中...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                儲存對應
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

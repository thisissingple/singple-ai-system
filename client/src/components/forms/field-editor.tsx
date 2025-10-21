/**
 * Field Editor
 * 欄位編輯器組件
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { FormField, FieldType, DataSource } from '@/types/custom-form';
import { FIELD_TYPE_LABELS, DATA_SOURCE_LABELS } from '@/types/custom-form';

interface FieldEditorProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}

export function FieldEditor({ fields, onChange }: FieldEditorProps) {
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAddField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: '',
      required: false,
      order: fields.length + 1,
    };
    setEditingField(newField);
    setIsDialogOpen(true);
  };

  const handleEditField = (field: FormField) => {
    setEditingField({ ...field });
    setIsDialogOpen(true);
  };

  const handleSaveField = () => {
    if (!editingField || !editingField.label.trim()) {
      return;
    }

    const existingIndex = fields.findIndex(f => f.id === editingField.id);

    if (existingIndex >= 0) {
      // 更新現有欄位
      const newFields = [...fields];
      newFields[existingIndex] = editingField;
      onChange(newFields);
    } else {
      // 新增欄位
      onChange([...fields, editingField]);
    }

    setIsDialogOpen(false);
    setEditingField(null);
  };

  const handleDeleteField = (fieldId: string) => {
    onChange(fields.filter(f => f.id !== fieldId));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newFields = [...fields];
    [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
    // 更新 order
    newFields.forEach((f, i) => f.order = i + 1);
    onChange(newFields);
  };

  const handleMoveDown = (index: number) => {
    if (index === fields.length - 1) return;
    const newFields = [...fields];
    [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    // 更新 order
    newFields.forEach((f, i) => f.order = i + 1);
    onChange(newFields);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>表單欄位</CardTitle>
          <Button onClick={handleAddField} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            新增欄位
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {fields.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>尚無欄位</p>
            <p className="text-sm mt-2">點擊「新增欄位」開始</p>
          </div>
        ) : (
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === fields.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{field.label}</span>
                    {field.required && (
                      <Badge variant="destructive" className="text-xs">必填</Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {FIELD_TYPE_LABELS[field.type]}
                    </Badge>
                  </div>
                  {field.placeholder && (
                    <p className="text-sm text-muted-foreground mt-1">
                      提示：{field.placeholder}
                    </p>
                  )}
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditField(field)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteField(field.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 編輯對話框 */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingField && fields.find(f => f.id === editingField.id) ? '編輯欄位' : '新增欄位'}
              </DialogTitle>
              <DialogDescription>
                設定欄位的屬性和驗證規則
              </DialogDescription>
            </DialogHeader>

            {editingField && (
              <div className="space-y-4">
                {/* 欄位類型 */}
                <div className="space-y-2">
                  <Label htmlFor="field-type">欄位類型</Label>
                  <Select
                    value={editingField.type}
                    onValueChange={(value: FieldType) =>
                      setEditingField({ ...editingField, type: value })
                    }
                  >
                    <SelectTrigger id="field-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 欄位標籤 */}
                <div className="space-y-2">
                  <Label htmlFor="field-label">欄位標籤 *</Label>
                  <Input
                    id="field-label"
                    value={editingField.label}
                    onChange={(e) =>
                      setEditingField({ ...editingField, label: e.target.value })
                    }
                    placeholder="例如：學員姓名"
                  />
                </div>

                {/* Placeholder */}
                <div className="space-y-2">
                  <Label htmlFor="field-placeholder">提示文字</Label>
                  <Input
                    id="field-placeholder"
                    value={editingField.placeholder || ''}
                    onChange={(e) =>
                      setEditingField({ ...editingField, placeholder: e.target.value })
                    }
                    placeholder="例如：請輸入學員姓名"
                  />
                </div>

                {/* 必填 */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="field-required"
                    checked={editingField.required}
                    onCheckedChange={(checked) =>
                      setEditingField({ ...editingField, required: checked as boolean })
                    }
                  />
                  <Label htmlFor="field-required" className="font-normal cursor-pointer">
                    此欄位為必填
                  </Label>
                </div>

                {/* 特殊設定：下拉選單/多選框的選項 */}
                {(editingField.type === 'select' || editingField.type === 'checkbox') && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="field-data-source">資料來源</Label>
                      <Select
                        value={editingField.dataSource || 'manual'}
                        onValueChange={(value: DataSource) =>
                          setEditingField({ ...editingField, dataSource: value })
                        }
                      >
                        <SelectTrigger id="field-data-source">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(DATA_SOURCE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 只有選擇「手動輸入」時才顯示選項輸入框 */}
                    {(!editingField.dataSource || editingField.dataSource === 'manual') && (
                      <div className="space-y-2">
                        <Label htmlFor="field-options">選項（每行一個）</Label>
                        <Textarea
                          id="field-options"
                          value={(editingField.options || []).join('\n')}
                          onChange={(e) =>
                            setEditingField({
                              ...editingField,
                              options: e.target.value.split('\n').filter(o => o.trim())
                            })
                          }
                          placeholder="選項 1&#10;選項 2&#10;選項 3"
                          rows={5}
                        />
                      </div>
                    )}
                  </>
                )}

                {/* 特殊設定：數字的範圍 */}
                {editingField.type === 'number' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="field-min">最小值</Label>
                      <Input
                        id="field-min"
                        type="number"
                        value={editingField.min || ''}
                        onChange={(e) =>
                          setEditingField({
                            ...editingField,
                            min: e.target.value ? Number(e.target.value) : undefined
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="field-max">最大值</Label>
                      <Input
                        id="field-max"
                        type="number"
                        value={editingField.max || ''}
                        onChange={(e) =>
                          setEditingField({
                            ...editingField,
                            max: e.target.value ? Number(e.target.value) : undefined
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleSaveField}
                disabled={!editingField?.label.trim()}
              >
                儲存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

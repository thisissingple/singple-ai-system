import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronRight, Database, FileSpreadsheet, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DataField {
  id: string;
  name: string;
  displayName: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  source: string;
  category: 'basic' | 'calculated' | 'aggregated';
  description?: string;
}

export interface SelectedField {
  field: DataField;
  alias?: string;
  operation?: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'group_by';
}

interface FieldSelectorProps {
  availableFields: DataField[];
  selectedFields: SelectedField[];
  onFieldsChange: (fields: SelectedField[]) => void;
  maxFields?: number;
  className?: string;
}

const FIELD_OPERATIONS = {
  'count': { label: '計數', icon: '#', description: '統計記錄數量' },
  'sum': { label: '求和', icon: 'Σ', description: '數值欄位總和' },
  'avg': { label: '平均', icon: '≈', description: '數值欄位平均值' },
  'min': { label: '最小值', icon: '↓', description: '數值欄位最小值' },
  'max': { label: '最大值', icon: '↑', description: '數值欄位最大值' },
  'group_by': { label: '分組', icon: '⊞', description: '按此欄位分組' }
};

export function FieldSelector({ 
  availableFields, 
  selectedFields, 
  onFieldsChange, 
  maxFields = 10,
  className 
}: FieldSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['basic']));
  const [searchTerm, setSearchTerm] = useState('');

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const addField = (field: DataField, operation: string = 'count') => {
    if (selectedFields.length >= maxFields) return;
    
    const newField: SelectedField = {
      field,
      operation: operation as SelectedField['operation']
    };
    
    onFieldsChange([...selectedFields, newField]);
  };

  const removeField = (index: number) => {
    const newFields = selectedFields.filter((_, i) => i !== index);
    onFieldsChange(newFields);
  };

  const updateFieldOperation = (index: number, operation: string) => {
    const newFields = selectedFields.map((field, i) => 
      i === index ? { ...field, operation: operation as SelectedField['operation'] } : field
    );
    onFieldsChange(newFields);
  };

  const updateFieldAlias = (index: number, alias: string) => {
    const newFields = selectedFields.map((field, i) => 
      i === index ? { ...field, alias } : field
    );
    onFieldsChange(newFields);
  };

  const filteredFields = availableFields.filter(field => 
    field.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedFields = filteredFields.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, DataField[]>);

  const isFieldSelected = (fieldId: string) => {
    return selectedFields.some(sf => sf.field.id === fieldId);
  };

  const getFieldTypeIcon = (type: DataField['type']) => {
    switch (type) {
      case 'number': return '123';
      case 'date': return '📅';
      case 'boolean': return '✓';
      default: return 'T';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'basic': return <Database className="h-4 w-4" />;
      case 'calculated': return <FileSpreadsheet className="h-4 w-4" />;
      case 'aggregated': return <Plus className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case 'basic': return '基本欄位';
      case 'calculated': return '計算欄位';
      case 'aggregated': return '聚合欄位';
      default: return category;
    }
  };

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6", className)}>
      {/* Available Fields Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            可用欄位
          </CardTitle>
          <CardDescription>
            從資料來源選擇要使用的欄位
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="搜尋欄位..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              data-testid="field-search-input"
            />
          </div>

          <ScrollArea className="h-[400px]">
            {Object.entries(groupedFields).map(([category, fields]) => (
              <div key={category} className="mb-4">
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center justify-between w-full p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                  data-testid={`category-toggle-${category}`}
                >
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(category)}
                    <span className="font-medium">{getCategoryDisplayName(category)}</span>
                    <Badge variant="secondary">{fields.length}</Badge>
                  </div>
                  {expandedCategories.has(category) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {expandedCategories.has(category) && (
                  <div className="ml-6 mt-2 space-y-2">
                    {fields.map((field) => (
                      <div
                        key={field.id}
                        className={cn(
                          "p-3 border rounded-md transition-colors",
                          isFieldSelected(field.id) 
                            ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
                            : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                              {getFieldTypeIcon(field.type)}
                            </span>
                            <div>
                              <div className="font-medium">{field.displayName}</div>
                              <div className="text-sm text-gray-500">{field.name}</div>
                            </div>
                          </div>
                          
                          {!isFieldSelected(field.id) && (
                            <div className="flex gap-1">
                              {Object.entries(FIELD_OPERATIONS).map(([op, config]) => (
                                <Button
                                  key={op}
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addField(field, op)}
                                  disabled={selectedFields.length >= maxFields}
                                  className="h-7 px-2 text-xs"
                                  title={config.description}
                                  data-testid={`add-field-${field.id}-${op}`}
                                >
                                  {config.icon}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {field.description && (
                          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {field.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Selected Fields Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              已選擇欄位
            </span>
            <Badge variant="outline">
              {selectedFields.length} / {maxFields}
            </Badge>
          </CardTitle>
          <CardDescription>
            配置所選欄位的計算方式和別名
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {selectedFields.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <div className="text-center">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>尚未選擇任何欄位</p>
                  <p className="text-sm">從左側選擇要使用的欄位</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedFields.map((selectedField, index) => (
                  <div
                    key={`${selectedField.field.id}-${index}`}
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-md"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                          {getFieldTypeIcon(selectedField.field.type)}
                        </span>
                        <div>
                          <div className="font-medium">{selectedField.field.displayName}</div>
                          <div className="text-sm text-gray-500">{selectedField.field.name}</div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeField(index)}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        data-testid={`remove-field-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {/* Operation Selection */}
                      <div>
                        <label className="text-sm font-medium">計算方式</label>
                        <select
                          value={selectedField.operation || 'count'}
                          onChange={(e) => updateFieldOperation(index, e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          data-testid={`operation-select-${index}`}
                        >
                          {Object.entries(FIELD_OPERATIONS).map(([op, config]) => (
                            <option key={op} value={op}>
                              {config.icon} {config.label} - {config.description}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Alias Input */}
                      <div>
                        <label className="text-sm font-medium">顯示名稱 (可選)</label>
                        <input
                          type="text"
                          value={selectedField.alias || ''}
                          onChange={(e) => updateFieldAlias(index, e.target.value)}
                          placeholder={`預設: ${selectedField.field.displayName}`}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          data-testid={`alias-input-${index}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
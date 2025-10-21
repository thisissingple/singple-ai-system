import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calculator, 
  Plus, 
  X, 
  Info, 
  CheckCircle, 
  AlertTriangle,
  Code,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CalculationRule {
  id?: string;
  name: string;
  displayName: string;
  description?: string;
  formula: string;
  resultType: 'number' | 'percentage' | 'timeseries' | 'group';
  sourceFields: string[];
  category?: string;
  isActive: boolean;
}

interface FormulaTemplate {
  id: string;
  name: string;
  description: string;
  formula: string;
  resultType: CalculationRule['resultType'];
  requiredFields: string[];
  category: string;
  example: string;
}

interface CalculationRuleEditorProps {
  rule?: CalculationRule;
  availableFields: string[];
  onSave: (rule: CalculationRule) => void;
  onCancel: () => void;
  className?: string;
}

const FORMULA_TEMPLATES: FormulaTemplate[] = [
  {
    id: 'count_all',
    name: '總計數',
    description: '統計所有記錄的數量',
    formula: 'COUNT(*)',
    resultType: 'number',
    requiredFields: [],
    category: 'basic',
    example: 'COUNT(*) → 132'
  },
  {
    id: 'count_conditional',
    name: '條件計數',
    description: '統計符合條件的記錄數量',
    formula: 'COUNT(CASE WHEN {field} = \'{value}\' THEN 1 END)',
    resultType: 'number',
    requiredFields: ['field', 'value'],
    category: 'conditional',
    example: 'COUNT(CASE WHEN 是否已確認 = \'是\' THEN 1 END) → 89'
  },
  {
    id: 'percentage',
    name: '百分比計算',
    description: '計算某條件佔總數的百分比',
    formula: '(COUNT(CASE WHEN {field} = \'{value}\' THEN 1 END) / COUNT(*)) * 100',
    resultType: 'percentage',
    requiredFields: ['field', 'value'],
    category: 'percentage',
    example: '確認率: (89 / 132) * 100 = 67.4%'
  },
  {
    id: 'sum_field',
    name: '欄位求和',
    description: '計算數值欄位的總和',
    formula: 'SUM({field})',
    resultType: 'number',
    requiredFields: ['field'],
    category: 'aggregation',
    example: 'SUM(課程費用) → 456,000'
  },
  {
    id: 'average_field',
    name: '欄位平均值',
    description: '計算數值欄位的平均值',
    formula: 'AVG({field})',
    resultType: 'number',
    requiredFields: ['field'],
    category: 'aggregation',
    example: 'AVG(課程費用) → 3,454'
  },
  {
    id: 'group_by_count',
    name: '分組計數',
    description: '按某欄位分組並計算每組的數量',
    formula: 'GROUP BY {field} COUNT(*)',
    resultType: 'group',
    requiredFields: ['field'],
    category: 'grouping',
    example: 'GROUP BY 授課老師 → 張老師: 23, 李老師: 19'
  },
  {
    id: 'monthly_trend',
    name: '月度趨勢',
    description: '按月統計數據變化趨勢',
    formula: 'GROUP BY MONTH({date_field}) COUNT(*)',
    resultType: 'timeseries',
    requiredFields: ['date_field'],
    category: 'time',
    example: '2024-01: 15, 2024-02: 18, 2024-03: 22'
  },
  {
    id: 'conversion_rate',
    name: '轉換率計算',
    description: '計算兩個狀態間的轉換比率',
    formula: '(COUNT(CASE WHEN {field} = \'{target_value}\' THEN 1 END) / COUNT(CASE WHEN {field} IN (\'{source_value}\', \'{target_value}\') THEN 1 END)) * 100',
    resultType: 'percentage',
    requiredFields: ['field', 'source_value', 'target_value'],
    category: 'conversion',
    example: '課程轉換率: (已報名 / (已報名 + 待考慮)) * 100'
  }
];

const RESULT_TYPE_OPTIONS = [
  { value: 'number', label: '數值', description: '單一數值結果' },
  { value: 'percentage', label: '百分比', description: '百分比數值（0-100）' },
  { value: 'timeseries', label: '時間序列', description: '按時間排序的數據點' },
  { value: 'group', label: '分組數據', description: '多個類別的數值組合' }
];

const CATEGORY_OPTIONS = [
  { value: 'basic', label: '基本統計' },
  { value: 'conditional', label: '條件計算' },
  { value: 'percentage', label: '百分比' },
  { value: 'aggregation', label: '聚合函數' },
  { value: 'grouping', label: '分組分析' },
  { value: 'time', label: '時間分析' },
  { value: 'conversion', label: '轉換分析' },
  { value: 'custom', label: '自定義' }
];

export function CalculationRuleEditor({
  rule,
  availableFields,
  onSave,
  onCancel,
  className
}: CalculationRuleEditorProps) {
  const [formData, setFormData] = useState<CalculationRule>({
    name: '',
    displayName: '',
    description: '',
    formula: '',
    resultType: 'number',
    sourceFields: [],
    category: 'basic',
    isActive: true,
    ...rule
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [formulaVariables, setFormulaVariables] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showTemplates, setShowTemplates] = useState(!rule);

  useEffect(() => {
    if (rule) {
      setFormData(rule);
      setShowTemplates(false);
    }
  }, [rule]);

  const validateRule = (): string[] => {
    const errors: string[] = [];

    if (!formData.name.trim()) {
      errors.push('規則名稱不能為空');
    }

    if (!formData.displayName.trim()) {
      errors.push('顯示名稱不能為空');
    }

    if (!formData.formula.trim()) {
      errors.push('計算公式不能為空');
    }

    // Check if formula has unresolved variables
    const variablePattern = /\{(\w+)\}/g;
    const matches = formData.formula.match(variablePattern);
    if (matches) {
      const unresolvedVars = matches.filter(match => {
        const varName = match.slice(1, -1);
        return !formulaVariables[varName];
      });
      
      if (unresolvedVars.length > 0) {
        errors.push(`公式中有未設定的變數: ${unresolvedVars.join(', ')}`);
      }
    }

    return errors;
  };

  const handleSave = () => {
    const errors = validateRule();
    setValidationErrors(errors);

    if (errors.length === 0) {
      // Replace variables in formula
      let processedFormula = formData.formula;
      Object.entries(formulaVariables).forEach(([variable, value]) => {
        processedFormula = processedFormula.replace(new RegExp(`\\{${variable}\\}`, 'g'), value);
      });

      onSave({
        ...formData,
        formula: processedFormula
      });
    }
  };

  const applyTemplate = (template: FormulaTemplate) => {
    setFormData({
      ...formData,
      name: template.id,
      displayName: template.name,
      description: template.description,
      formula: template.formula,
      resultType: template.resultType,
      category: template.category
    });

    // Initialize variables for template
    const variables: Record<string, string> = {};
    template.requiredFields.forEach(field => {
      variables[field] = '';
    });
    setFormulaVariables(variables);
    setSelectedTemplate(template.id);
    setShowTemplates(false);
  };

  const getTemplatesByCategory = () => {
    return FORMULA_TEMPLATES.reduce((acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = [];
      }
      acc[template.category].push(template);
      return acc;
    }, {} as Record<string, FormulaTemplate[]>);
  };

  const extractFormulaVariables = (formula: string) => {
    const variablePattern = /\{(\w+)\}/g;
    const matches = formula.match(variablePattern);
    return matches ? matches.map(match => match.slice(1, -1)) : [];
  };

  useEffect(() => {
    const variables = extractFormulaVariables(formData.formula);
    const newVariables: Record<string, string> = {};
    variables.forEach(variable => {
      newVariables[variable] = formulaVariables[variable] || '';
    });
    setFormulaVariables(newVariables);
  }, [formData.formula]);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {rule ? '編輯計算規則' : '新增計算規則'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            創建自定義計算規則來處理和分析數據
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} data-testid="cancel-button">
            取消
          </Button>
          <Button onClick={handleSave} data-testid="save-button">
            <CheckCircle className="h-4 w-4 mr-2" />
            儲存規則
          </Button>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700 dark:text-red-300">
            <div className="font-medium mb-1">驗證錯誤:</div>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Rule Configuration */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">基本設定</CardTitle>
              <CardDescription>配置計算規則的基本信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">規則名稱 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例如: confirmed_students_count"
                    data-testid="rule-name-input"
                  />
                </div>
                
                <div>
                  <Label htmlFor="displayName">顯示名稱 *</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="例如: 已確認學生數量"
                    data-testid="rule-display-name-input"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">描述說明</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="描述這個計算規則的用途和計算邏輯..."
                  rows={3}
                  data-testid="rule-description-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="resultType">結果類型</Label>
                  <Select value={formData.resultType} onValueChange={(value: any) => setFormData({ ...formData, resultType: value })}>
                    <SelectTrigger data-testid="result-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESULT_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-gray-500">{option.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="category">分類</Label>
                  <Select value={formData.category || 'basic'} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger data-testid="category-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  計算公式
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplates(!showTemplates)}
                  data-testid="toggle-templates-button"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  公式模板
                </Button>
              </CardTitle>
              <CardDescription>定義數據的計算邏輯</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="formula">公式 *</Label>
                <Textarea
                  id="formula"
                  value={formData.formula}
                  onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
                  placeholder="例如: COUNT(CASE WHEN 是否已確認 = '是' THEN 1 END)"
                  rows={4}
                  className="font-mono text-sm"
                  data-testid="formula-input"
                />
                <div className="text-xs text-gray-500 mt-1">
                  使用 SQL 語法，可使用 {"{變數名}"} 來定義可配置的參數
                </div>
              </div>

              {/* Formula Variables */}
              {Object.keys(formulaVariables).length > 0 && (
                <div>
                  <Label>公式變數設定</Label>
                  <div className="space-y-3 mt-2">
                    {Object.entries(formulaVariables).map(([variable, value]) => (
                      <div key={variable} className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">
                          {"{" + variable + "}"}
                        </Badge>
                        <div className="flex-1">
                          {availableFields.length > 0 ? (
                            <Select 
                              value={value} 
                              onValueChange={(newValue) => 
                                setFormulaVariables({ ...formulaVariables, [variable]: newValue })
                              }
                            >
                              <SelectTrigger data-testid={`variable-${variable}-select`}>
                                <SelectValue placeholder="選擇欄位或輸入值" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableFields.map((field) => (
                                  <SelectItem key={field} value={field}>
                                    {field}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={value}
                              onChange={(e) => 
                                setFormulaVariables({ ...formulaVariables, [variable]: e.target.value })
                              }
                              placeholder={`設定 ${variable} 的值`}
                              data-testid={`variable-${variable}-input`}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Templates and Preview */}
        <div className="space-y-6">
          {showTemplates && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  公式模板
                </CardTitle>
                <CardDescription>選擇預建的公式模板快速開始</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {Object.entries(getTemplatesByCategory()).map(([category, templates]) => (
                    <div key={category} className="mb-6">
                      <h4 className="font-medium mb-3 text-sm uppercase tracking-wide text-gray-500">
                        {CATEGORY_OPTIONS.find(opt => opt.value === category)?.label || category}
                      </h4>
                      <div className="space-y-2">
                        {templates.map((template) => (
                          <div
                            key={template.id}
                            className={cn(
                              "p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800",
                              selectedTemplate === template.id && "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950"
                            )}
                            onClick={() => applyTemplate(template)}
                            data-testid={`template-${template.id}`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="font-medium">{template.name}</div>
                              <Badge variant="outline" className="text-xs">
                                {RESULT_TYPE_OPTIONS.find(opt => opt.value === template.resultType)?.label}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {template.description}
                            </div>
                            <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                              {template.example}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {!showTemplates && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  規則預覽
                </CardTitle>
                <CardDescription>檢查計算規則的配置</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">名稱:</span>
                    <span className="text-sm">{formData.displayName || '未設定'}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">類型:</span>
                    <Badge variant="outline">
                      {RESULT_TYPE_OPTIONS.find(opt => opt.value === formData.resultType)?.label}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">分類:</span>
                    <span className="text-sm">
                      {CATEGORY_OPTIONS.find(opt => opt.value === formData.category)?.label}
                    </span>
                  </div>

                  <Separator />

                  <div>
                    <div className="text-sm font-medium mb-2">處理後的公式:</div>
                    <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-3 rounded border">
                      {formData.formula ? (
                        Object.entries(formulaVariables).reduce(
                          (formula, [variable, value]) => 
                            formula.replace(new RegExp(`\\{${variable}\\}`, 'g'), value || `{${variable}}`),
                          formData.formula
                        )
                      ) : (
                        <span className="text-gray-500">尚未設定公式</span>
                      )}
                    </div>
                  </div>

                  {formData.description && (
                    <div>
                      <div className="text-sm font-medium mb-2">說明:</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {formData.description}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
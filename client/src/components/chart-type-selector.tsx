import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  TrendingUp, 
  Hash,
  Info,
  Check
} from 'lucide-react';

export type ChartType = 'number' | 'bar' | 'line' | 'pie' | 'area';

export interface ChartTypeOption {
  type: ChartType;
  name: string;
  description: string;
  icon: React.ReactNode;
  bestFor: string[];
  example: string;
  dataRequirements: {
    minFields: number;
    preferredFieldTypes: string[];
    aggregationRequired: boolean;
  };
}

interface ChartTypeSelectorProps {
  selectedType: ChartType;
  onTypeChange: (type: ChartType) => void;
  availableFields: number;
  hasNumericFields: boolean;
  hasDateFields: boolean;
  hasCategoricalFields: boolean;
  className?: string;
}

const CHART_TYPE_OPTIONS: ChartTypeOption[] = [
  {
    type: 'number',
    name: '數字卡片',
    description: '顯示單一重要數值或KPI指標',
    icon: <Hash className="h-6 w-6" />,
    bestFor: ['總數統計', 'KPI指標', '百分比', '比率'],
    example: '總學生數: 132',
    dataRequirements: {
      minFields: 1,
      preferredFieldTypes: ['number'],
      aggregationRequired: true
    }
  },
  {
    type: 'bar',
    name: '柱狀圖',
    description: '比較不同類別或組別的數值',
    icon: <BarChart3 className="h-6 w-6" />,
    bestFor: ['類別比較', '排名顯示', '分組統計', '績效對比'],
    example: '各老師學生數量對比',
    dataRequirements: {
      minFields: 2,
      preferredFieldTypes: ['categorical', 'number'],
      aggregationRequired: true
    }
  },
  {
    type: 'line',
    name: '折線圖',
    description: '顯示數值隨時間變化的趨勢',
    icon: <LineChart className="h-6 w-6" />,
    bestFor: ['時間趨勢', '變化分析', '預測展示', '週期模式'],
    example: '月度新增學生趨勢',
    dataRequirements: {
      minFields: 2,
      preferredFieldTypes: ['date', 'number'],
      aggregationRequired: true
    }
  },
  {
    type: 'pie',
    name: '圓餅圖',
    description: '顯示整體中各部分的占比關係',
    icon: <PieChart className="h-6 w-6" />,
    bestFor: ['比例顯示', '構成分析', '市場佔有率', '分類統計'],
    example: '學生確認狀態分布',
    dataRequirements: {
      minFields: 2,
      preferredFieldTypes: ['categorical', 'number'],
      aggregationRequired: true
    }
  },
  {
    type: 'area',
    name: '面積圖',
    description: '顯示數值累積趨勢和整體變化',
    icon: <TrendingUp className="h-6 w-6" />,
    bestFor: ['累積趨勢', '堆疊分析', '容量顯示', '填充展示'],
    example: '累積確認學生數趨勢',
    dataRequirements: {
      minFields: 2,
      preferredFieldTypes: ['date', 'number'],
      aggregationRequired: true
    }
  }
];

export function ChartTypeSelector({
  selectedType,
  onTypeChange,
  availableFields,
  hasNumericFields,
  hasDateFields,
  hasCategoricalFields,
  className
}: ChartTypeSelectorProps) {
  const [showDetails, setShowDetails] = useState<ChartType | null>(null);

  const isTypeAvailable = (option: ChartTypeOption): boolean => {
    // Check minimum fields requirement
    if (availableFields < option.dataRequirements.minFields) {
      return false;
    }

    // Check field type requirements
    const requirements = option.dataRequirements.preferredFieldTypes;
    
    if (requirements.includes('number') && !hasNumericFields) {
      return false;
    }
    
    if (requirements.includes('date') && !hasDateFields) {
      return false;
    }
    
    if (requirements.includes('categorical') && !hasCategoricalFields) {
      return false;
    }

    return true;
  };

  const getAvailabilityReason = (option: ChartTypeOption): string => {
    if (availableFields < option.dataRequirements.minFields) {
      return `需要至少 ${option.dataRequirements.minFields} 個欄位`;
    }

    const requirements = option.dataRequirements.preferredFieldTypes;
    const missing = [];
    
    if (requirements.includes('number') && !hasNumericFields) {
      missing.push('數值欄位');
    }
    if (requirements.includes('date') && !hasDateFields) {
      missing.push('日期欄位');
    }
    if (requirements.includes('categorical') && !hasCategoricalFields) {
      missing.push('分類欄位');
    }

    if (missing.length > 0) {
      return `需要 ${missing.join('或')}`;
    }

    return '';
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-lg font-semibold mb-2">選擇圖表類型</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          根據你的數據和展示需求選擇最合適的圖表類型
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CHART_TYPE_OPTIONS.map((option) => {
          const isAvailable = isTypeAvailable(option);
          const isSelected = selectedType === option.type;
          const unavailableReason = !isAvailable ? getAvailabilityReason(option) : '';

          return (
            <Card
              key={option.type}
              className={cn(
                "relative cursor-pointer transition-all duration-200 hover:shadow-md",
                isSelected && "ring-2 ring-blue-500 border-blue-300",
                !isAvailable && "opacity-60 cursor-not-allowed"
              )}
              onClick={() => isAvailable && onTypeChange(option.type)}
              data-testid={`chart-type-${option.type}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      isSelected 
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    )}>
                      {option.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{option.name}</CardTitle>
                      {isSelected && (
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <Check className="h-4 w-4" />
                          <span className="text-sm">已選擇</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDetails(showDetails === option.type ? null : option.type);
                    }}
                    className="h-8 w-8 p-0"
                    data-testid={`chart-details-${option.type}`}
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <CardDescription className="mb-3">
                  {option.description}
                </CardDescription>

                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium mb-1">範例</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 italic">
                      {option.example}
                    </div>
                  </div>

                  {!isAvailable && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                      <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-sm text-yellow-700 dark:text-yellow-300">
                        {unavailableReason}
                      </span>
                    </div>
                  )}

                  {showDetails === option.type && (
                    <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md border">
                      <div>
                        <div className="text-sm font-medium mb-2">適用場景</div>
                        <div className="flex flex-wrap gap-1">
                          {option.bestFor.map((use) => (
                            <Badge key={use} variant="secondary" className="text-xs">
                              {use}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-2">數據要求</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                          <div>• 最少欄位: {option.dataRequirements.minFields} 個</div>
                          <div>• 建議欄位類型: {option.dataRequirements.preferredFieldTypes.join(', ')}</div>
                          <div>• 需要聚合: {option.dataRequirements.aggregationRequired ? '是' : '否'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedType && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-900 dark:text-blue-100">
              已選擇: {CHART_TYPE_OPTIONS.find(opt => opt.type === selectedType)?.name}
            </span>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {CHART_TYPE_OPTIONS.find(opt => opt.type === selectedType)?.description}
          </p>
        </div>
      )}
    </div>
  );
}
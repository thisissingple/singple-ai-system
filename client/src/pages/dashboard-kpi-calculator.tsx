/**
 * KPI Calculator Dashboard
 * Displays detailed KPI calculation process with expandable sections
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, RefreshCw, AlertTriangle, Database, TrendingUp, Activity } from 'lucide-react';
import { DataSourceCard } from '@/components/kpi-calculator/data-source-card';
import { CollapsibleSection } from '@/components/kpi-calculator/collapsible-section';
import { WarningsPanel } from '@/components/kpi-calculator/warnings-panel';
import { Step4KPIResults } from '@/components/kpi-calculator/step4-kpi-results';
import type { PeriodType } from '@/types/trial-report';

interface BaseVariable {
  value: number;
  source: string;
  originalValue?: number;
}

interface IntermediateCalculation {
  value: number;
  calculation?: {
    [key: string]: any;
    formula: string;
    result: number;
  };
  warnings?: string[];
}

interface KPICalculationDetail {
  metricId: string;
  label: string;
  description: string;
  formula: string;
  isCustomFormula: boolean;
  variables: Record<string, number>;
  substitutedFormula: string;
  rawResult: number;
  finalResult: number;
  unit?: string;
  warnings?: string[];
}

interface CalculationDetail {
  step1_baseVariables: Record<string, BaseVariable>;
  step2_intermediateCalculations: Record<string, IntermediateCalculation>;
  step3_formulaContext: Record<string, number>;
  step4_kpiCalculations: KPICalculationDetail[];
}

interface KPICalculationResult {
  mode: 'supabase' | 'storage' | 'mock';
  rawDataSummary: {
    source: string;
    attendance: { count: number; source: string };
    purchases: { count: number; source: string };
    deals: { count: number; source: string };
    dateRange: { start: string; end: string };
    lastSync: string | null;
  };
  calculationDetail: CalculationDetail;
  summaryMetrics: any;
  warnings: string[];
}

export default function DashboardKPICalculator() {
  const [period] = useState<PeriodType>('all');  // Use 'all' to fetch all data
  const [selectedDate] = useState<Date>(new Date());

  const {
    data: result,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<KPICalculationResult>({
    queryKey: ['kpi-calculator-detail', period, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const params = new URLSearchParams({
        period,
        baseDate: format(selectedDate, 'yyyy-MM-dd'),
      });

      const response = await fetch(`/api/kpi-calculator/detail?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to fetch KPI details');
      }

      return json.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">計算 KPI 中...</p>
        </div>
      </div>
    );
  }

  if (isError || !result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            載入失敗：{error instanceof Error ? error.message : '未知錯誤'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { calculationDetail, warnings } = result;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Calculator className="h-8 w-8" />
              KPI 計算器
            </h1>
            <p className="text-muted-foreground mt-2">
              查看所有 KPI 指標的詳細計算過程
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            重新計算
          </Button>
        </div>

        {/* Data Source Card */}
        <DataSourceCard mode={result.mode} rawDataSummary={result.rawDataSummary} />

        {/* Warnings */}
        <WarningsPanel warnings={warnings} />

        {/* Calculation Steps */}
        <div className="space-y-4">
          {/* Step 1: Base Variables */}
          <CollapsibleSection
            title="Step 1: 基礎變數"
            description="從原始資料中萃取的基礎數值"
            icon={<Database className="h-5 w-5 text-blue-600" />}
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(calculationDetail.step1_baseVariables).map(([key, variable]) => (
                <Card key={key} className="border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-mono">{key}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-3xl font-bold">{variable.value}</div>
                    <div className="text-xs text-muted-foreground">
                      來源：{variable.source}
                    </div>
                    {variable.originalValue !== undefined && (
                      <div className="text-xs text-orange-600 dark:text-orange-400">
                        原始值：{variable.originalValue}（已修正）
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CollapsibleSection>

          {/* Step 2: Intermediate Calculations */}
          <CollapsibleSection
            title="Step 2: 中間計算"
            description="複雜的衍生計算（如平均轉換時間、平均客單價）"
            icon={<Activity className="h-5 w-5 text-purple-600" />}
          >
            <div className="space-y-4">
              {Object.entries(calculationDetail.step2_intermediateCalculations).map(([key, calc]) => (
                <div key={key} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold font-mono text-lg">{key}</h3>
                    <div className="text-2xl font-bold">{calc.value}</div>
                  </div>

                  {calc.calculation && (
                    <div className="bg-muted p-3 rounded space-y-2 text-sm">
                      <div className="font-mono text-xs">
                        {calc.calculation.formula}
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(calc.calculation)
                          .filter(([k]) => !['formula', 'result'].includes(k))
                          .map(([k, v]) => (
                            <div key={k} className="flex justify-between">
                              <span className="text-muted-foreground">{k}:</span>
                              <span className="font-mono">{String(v)}</span>
                            </div>
                          ))}
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span>結果：</span>
                        <span className="font-mono">{calc.calculation.result}</span>
                      </div>
                    </div>
                  )}

                  {calc.warnings && calc.warnings.length > 0 && (
                    <WarningsPanel warnings={calc.warnings} />
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Step 3: Formula Context */}
          <CollapsibleSection
            title="Step 3: 公式運算 Context"
            description="傳入 Formula Engine 的完整變數列表"
            icon={<TrendingUp className="h-5 w-5 text-green-600" />}
          >
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
              {Object.entries(calculationDetail.step3_formulaContext)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 border rounded">
                    <span className="font-mono text-sm text-muted-foreground">{key}</span>
                    <span className="font-bold font-mono">{value}</span>
                  </div>
                ))}
            </div>
          </CollapsibleSection>

          {/* Step 4: KPI Results */}
          <CollapsibleSection
            title="Step 4: KPI 計算結果"
            description="最終的 KPI 指標與詳細計算過程"
            defaultOpen={true}
            icon={<Calculator className="h-5 w-5 text-orange-600" />}
          >
            <Step4KPIResults
              kpiCalculations={calculationDetail.step4_kpiCalculations}
              onFormulaUpdated={() => refetch()}
            />
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
}

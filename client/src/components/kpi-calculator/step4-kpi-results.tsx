/**
 * Step 4: KPI Results Component
 * Displays final KPI calculations with formula editing capability
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edit, CheckCircle2, AlertTriangle } from 'lucide-react';
import { FormulaEditorDialog } from './formula-editor-dialog';

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

interface Step4KPIResultsProps {
  kpiCalculations: KPICalculationDetail[];
  onFormulaUpdated?: () => void;
}

export function Step4KPIResults({ kpiCalculations, onFormulaUpdated }: Step4KPIResultsProps) {
  const [editingMetric, setEditingMetric] = useState<{
    id: string;
    label: string;
    formula: string;
  } | null>(null);

  return (
    <div className="space-y-4">
      {kpiCalculations.map((kpi) => (
        <Card key={kpi.metricId} className="border-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle>{kpi.label}</CardTitle>
                  {kpi.isCustomFormula && (
                    <Badge variant="secondary" className="text-xs">
                      自訂公式
                    </Badge>
                  )}
                </div>
                <CardDescription className="mt-2">{kpi.description}</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-4xl font-bold text-primary">
                    {kpi.finalResult.toLocaleString()}
                    {kpi.unit && <span className="text-2xl ml-1">{kpi.unit}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 font-mono">
                    {kpi.metricId}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditingMetric({
                      id: kpi.metricId,
                      label: kpi.label,
                      formula: kpi.formula,
                    })
                  }
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Formula */}
            <div className="space-y-2">
              <div className="text-sm font-medium">公式</div>
              <div className="bg-muted p-3 rounded font-mono text-sm">
                {kpi.formula}
              </div>
            </div>

            {/* Variables */}
            <div className="space-y-2">
              <div className="text-sm font-medium">代入變數</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(kpi.variables).map(([varName, varValue]) => (
                  <div
                    key={varName}
                    className="flex items-center justify-between p-2 bg-muted rounded"
                  >
                    <span className="font-mono text-sm text-muted-foreground">{varName}</span>
                    <span className="font-mono font-bold">{varValue}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Substituted Formula */}
            <div className="space-y-2">
              <div className="text-sm font-medium">計算過程</div>
              <div className="bg-green-50 dark:bg-green-950 p-3 rounded border border-green-200 dark:border-green-800">
                <div className="font-mono text-sm text-green-900 dark:text-green-100">
                  {kpi.substitutedFormula}
                </div>
                <div className="flex items-center gap-2 mt-2 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">= {kpi.rawResult.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Warnings */}
            {kpi.warnings && kpi.warnings.length > 0 && (
              <Alert variant="default" className="border-orange-200 bg-orange-50 dark:bg-orange-950">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-700 dark:text-orange-300">
                  <ul className="list-disc list-inside text-sm">
                    {kpi.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Formula Editor Dialog */}
      {editingMetric && (
        <FormulaEditorDialog
          open={!!editingMetric}
          onOpenChange={(open) => !open && setEditingMetric(null)}
          metricId={editingMetric.id}
          label={editingMetric.label}
          currentFormula={editingMetric.formula}
          onSave={() => {
            setEditingMetric(null);
            onFormulaUpdated?.();
          }}
        />
      )}
    </div>
  );
}

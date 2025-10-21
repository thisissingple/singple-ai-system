/**
 * Formula Editor Dialog Component
 * Allows editing KPI formulas with real-time validation
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, Loader2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FormulaEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricId: string;
  label: string;
  currentFormula: string;
  onSave?: () => void;
}

interface MetricConfig {
  metricId: string;
  label: string;
  description: string;
  defaultFormula: string;
  sourceFields: string[];
  manualFormula?: string;
}

export function FormulaEditorDialog({
  open,
  onOpenChange,
  metricId,
  label,
  currentFormula,
  onSave,
}: FormulaEditorDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formula, setFormula] = useState(currentFormula);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    error?: string;
  } | null>(null);

  // Fetch config
  const { data: config, isLoading: configLoading } = useQuery<MetricConfig>({
    queryKey: ['metric-config', metricId],
    queryFn: async () => {
      const response = await fetch(`/api/report-metrics/config/${metricId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch config');
      const json = await response.json();
      return json.data;
    },
    enabled: open,
  });

  // Validate formula
  const validateFormula = async (formulaText: string) => {
    try {
      const response = await fetch('/api/formula/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ formula: formulaText }),
      });

      const json = await response.json();
      if (json.success) {
        setValidationResult(json.data);
      } else {
        setValidationResult({ valid: false, error: json.error });
      }
    } catch (error) {
      setValidationResult({
        valid: false,
        error: error instanceof Error ? error.message : '驗證失敗',
      });
    }
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (newFormula: string) => {
      const response = await fetch('/api/report-metrics/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          metricId,
          manualFormula: newFormula,
        }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || 'Failed to update formula');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-calculator-detail'] });
      queryClient.invalidateQueries({ queryKey: ['metric-config', metricId] });
      toast({
        title: '公式已更新',
        description: '重新計算 KPI 中...',
      });
      onSave?.();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: '更新失敗',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/report-metrics/config/${metricId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to reset formula');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-calculator-detail'] });
      queryClient.invalidateQueries({ queryKey: ['metric-config', metricId] });
      toast({
        title: '已重置為預設公式',
      });
      onSave?.();
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (formula && formula !== currentFormula) {
      const timer = setTimeout(() => {
        validateFormula(formula);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formula]);

  const handleSave = () => {
    if (validationResult?.valid) {
      updateMutation.mutate(formula);
    }
  };

  const handleReset = () => {
    if (confirm('確定要重置為預設公式嗎？')) {
      resetMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>編輯公式：{label}</DialogTitle>
          <DialogDescription>修改計算公式並即時驗證</DialogDescription>
        </DialogHeader>

        {configLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : config ? (
          <div className="space-y-4">
            {/* Current formula */}
            <div className="space-y-2">
              <Label>預設公式</Label>
              <div className="p-3 bg-muted rounded font-mono text-sm">
                {config.defaultFormula}
              </div>
              {config.manualFormula && (
                <Badge variant="secondary">目前使用自訂公式</Badge>
              )}
            </div>

            <Separator />

            {/* Formula editor */}
            <div className="space-y-2">
              <Label htmlFor="formula">自訂公式</Label>
              <Input
                id="formula"
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                placeholder="輸入公式，例如：(conversions / trials) * 100"
                className="font-mono"
              />
            </div>

            {/* Validation result */}
            {validationResult && (
              <Alert
                variant={validationResult.valid ? 'default' : 'destructive'}
                className={
                  validationResult.valid
                    ? 'border-green-200 bg-green-50 dark:bg-green-950'
                    : ''
                }
              >
                {validationResult.valid ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {validationResult.valid ? (
                    <span className="text-green-700 dark:text-green-300">公式驗證通過</span>
                  ) : (
                    <span>{validationResult.error}</span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Available variables */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">可用變數</Label>
              <div className="flex flex-wrap gap-2">
                {config.sourceFields.map((field) => (
                  <Badge key={field} variant="outline" className="font-mono text-xs">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={resetMutation.isPending || !config?.manualFormula}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            重置為預設
          </Button>
          <Button onClick={() => onOpenChange(false)} variant="ghost">
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={!validationResult?.valid || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                儲存中...
              </>
            ) : (
              '儲存公式'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

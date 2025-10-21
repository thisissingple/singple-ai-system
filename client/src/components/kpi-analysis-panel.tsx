/**
 * KPI Analysis Panel
 * 顯示 KPI 驗證結果，並提供一鍵修正功能
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Info, Sparkles, RefreshCw } from 'lucide-react';

interface KPIValidationResult {
  name: string;
  label: string;
  isCorrect: boolean;
  currentValue: number;
  suggestedValue: number | null;
  currentFormula: string;
  suggestedFormula: string | null;
  reason: string;
  severity: 'error' | 'warning' | 'info' | 'success';
  autoFixable: boolean;
}

interface KPIValidationReport {
  timestamp: string;
  totalKPIs: number;
  correctCount: number;
  warningCount: number;
  errorCount: number;
  results: KPIValidationResult[];
}

interface KPIAnalysisPanelProps {
  currentMetrics: Record<string, number>;
  onAutoFix?: (fixedMetrics: Record<string, number>) => void;
}

export function KPIAnalysisPanel({ currentMetrics, onAutoFix }: KPIAnalysisPanelProps) {
  const [validationReport, setValidationReport] = useState<KPIValidationReport | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  const validateKPIs = async () => {
    setIsValidating(true);
    try {
      const response = await fetch('/api/reports/trial-class/validate-kpis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentMetrics }),
      });

      const result = await response.json();
      if (result.success) {
        setValidationReport(result.data);
      }
    } catch (error) {
      console.error('Error validating KPIs:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const autoFixKPIs = async () => {
    setIsFixing(true);
    try {
      const response = await fetch('/api/reports/trial-class/auto-fix-kpis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentMetrics }),
      });

      const result = await response.json();
      if (result.success) {
        setValidationReport(result.data.validationReport);
        if (onAutoFix) {
          onAutoFix(result.data.fixedMetrics);
        }
      }
    } catch (error) {
      console.error('Error auto-fixing KPIs:', error);
    } finally {
      setIsFixing(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
      success: 'default',
      error: 'destructive',
      warning: 'secondary',
      info: 'outline',
    };
    return variants[severity] || 'outline';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              KPI 智能分析
            </CardTitle>
            <CardDescription>
              自動檢測 KPI 計算是否正確，並提供修正建議
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={validateKPIs}
              disabled={isValidating}
            >
              {isValidating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  分析 KPI
                </>
              )}
            </Button>
            {validationReport && validationReport.errorCount > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={autoFixKPIs}
                disabled={isFixing}
              >
                {isFixing ? '修正中...' : '一鍵修正'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {validationReport && (
        <CardContent>
          {/* 統計摘要 */}
          <div className="mb-4 flex gap-4">
            <Badge variant="default" className="bg-green-600">
              ✓ {validationReport.correctCount} 個正確
            </Badge>
            {validationReport.errorCount > 0 && (
              <Badge variant="destructive">
                ✗ {validationReport.errorCount} 個錯誤
              </Badge>
            )}
            {validationReport.warningCount > 0 && (
              <Badge variant="secondary">
                ⚠ {validationReport.warningCount} 個警告
              </Badge>
            )}
          </div>

          {/* KPI 驗證結果列表 */}
          <div className="space-y-3">
            {validationReport.results.map((result) => (
              <Alert
                key={result.name}
                variant={result.severity === 'error' ? 'destructive' : 'default'}
                className={
                  result.severity === 'success'
                    ? 'border-green-200 bg-green-50 dark:bg-green-950'
                    : result.severity === 'warning'
                      ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950'
                      : ''
                }
              >
                <div className="flex items-start gap-3">
                  {getSeverityIcon(result.severity)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{result.label}</span>
                      <Badge variant={getSeverityBadge(result.severity)}>
                        {result.currentValue}
                        {result.name.includes('Rate') ? '%' : ''}
                      </Badge>
                    </div>
                    <AlertDescription className="text-sm">
                      {result.reason}
                    </AlertDescription>
                    {!result.isCorrect && result.suggestedValue !== null && (
                      <div className="mt-2 text-sm">
                        <span className="font-medium text-green-700 dark:text-green-400">
                          💡 建議值: {result.suggestedValue}
                          {result.name.includes('Rate') ? '%' : ''}
                        </span>
                        {result.suggestedFormula && (
                          <div className="text-xs text-muted-foreground mt-1">
                            公式: {result.suggestedFormula}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            最後分析時間: {new Date(validationReport.timestamp).toLocaleString('zh-TW')}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

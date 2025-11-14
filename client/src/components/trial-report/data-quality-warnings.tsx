/**
 * Data Quality Warnings Component
 * Displays actionable warnings with fix buttons that navigate to data management pages
 */

import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useLocation } from 'wouter';
import type { DataQualityWarning } from '@/types/trial-report';

interface DataQualityWarningsProps {
  warnings?: DataQualityWarning[];
  legacyWarnings?: string[]; // For backward compatibility
}

export function DataQualityWarnings({ warnings, legacyWarnings }: DataQualityWarningsProps) {
  const [, setLocation] = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't filter out any warnings - show all data quality issues
  const filteredLegacyWarnings = legacyWarnings || [];

  const hasWarnings = (warnings && warnings.length > 0) || filteredLegacyWarnings.length > 0;

  // Debug logging
  console.log('[DataQualityWarnings] Received props:', {
    warnings,
    warningsLength: warnings?.length,
    legacyWarnings,
    legacyWarningsLength: legacyWarnings?.length,
    hasWarnings
  });

  if (!hasWarnings) {
    console.log('[DataQualityWarnings] No warnings, returning null');
    return null;
  }

  const totalWarnings = (warnings?.length || 0) + filteredLegacyWarnings.length;

  const handleFixClick = () => {
    // 將所有警告訊息編碼到 URL 中
    const allWarnings = [
      ...(warnings || []).map(w => ({
        type: w.type,
        message: w.message,
        severity: w.severity
      })),
      ...(legacyWarnings || []).map(w => ({
        type: 'legacy',
        message: w,
        severity: 'warning' as const
      }))
    ];

    const params = new URLSearchParams({
      warnings: JSON.stringify(allWarnings)
    });

    setLocation(`/tools/database-browser?${params.toString()}`);
  };

  return (
    <div className="border rounded-lg border-orange-200 bg-orange-50 dark:bg-orange-950">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <span className="font-semibold text-orange-800 dark:text-orange-200">
            資料品質警告
          </span>
          <span className="text-sm text-orange-600 dark:text-orange-400">
            ({totalWarnings} 個問題)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 bg-white hover:bg-orange-100"
            onClick={(e) => {
              e.stopPropagation();
              handleFixClick();
            }}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            前往修正
          </Button>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-orange-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-orange-600" />
          )}
        </div>
      </button>

      {/* Expanded Content - List Layout */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {/* Structured Warnings */}
          {warnings?.map((warning, index) => {
            const title = warning.type === 'missing_plan' ? '⚠️ 方案名稱錯誤'
              : warning.type === 'missing_purchase' ? '⚠️ 缺少購買記錄'
              : warning.message.includes('重複') ? '⚠️ 重複購買記錄'
              : warning.message.includes('💡') ? '💡 特殊情況提醒'
              : '⚠️ 缺少學員信箱';

            return (
              <div
                key={`structured-${index}`}
                className={`flex items-start gap-3 p-3 rounded-md border ${
                  warning.severity === 'error'
                    ? 'border-red-300 bg-red-50 dark:bg-red-950'
                    : warning.severity === 'info'
                      ? 'border-blue-300 bg-blue-50 dark:bg-blue-950'
                      : 'border-orange-300 bg-white dark:bg-orange-900'
                }`}
              >
                <div className={`font-medium text-sm whitespace-nowrap ${
                  warning.severity === 'error'
                    ? 'text-red-800 dark:text-red-200'
                    : warning.severity === 'info'
                      ? 'text-blue-800 dark:text-blue-200'
                      : 'text-orange-800 dark:text-orange-200'
                }`}>
                  {title}
                </div>
                <div className={`text-sm flex-1 ${
                  warning.severity === 'error'
                    ? 'text-red-700 dark:text-red-300'
                    : warning.severity === 'info'
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-orange-700 dark:text-orange-300'
                }`}>
                  {warning.message}
                </div>
              </div>
            );
          })}

          {/* Legacy Warnings */}
          {filteredLegacyWarnings.map((warning, index) => (
            <div
              key={`legacy-${index}`}
              className="flex items-start gap-3 p-3 rounded-md border border-orange-300 bg-white dark:bg-orange-900"
            >
              <div className="text-sm text-orange-700 dark:text-orange-300">
                {warning}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

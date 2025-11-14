/**
 * Data Quality Warnings Component
 * Displays actionable warnings with fix buttons that navigate to data management pages
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { useLocation } from 'wouter';
import type { DataQualityWarning } from '@/types/trial-report';

interface DataQualityWarningsProps {
  warnings?: DataQualityWarning[];
  legacyWarnings?: string[]; // For backward compatibility
}

export function DataQualityWarnings({ warnings, legacyWarnings }: DataQualityWarningsProps) {
  const [, setLocation] = useLocation();

  // Filter out Supabase-related legacy warnings
  const filteredLegacyWarnings = (legacyWarnings || []).filter(
    (warning) => !/資料來源|Supabase/i.test(warning)
  );

  const hasWarnings = (warnings && warnings.length > 0) || filteredLegacyWarnings.length > 0;

  if (!hasWarnings) {
    return null;
  }

  const handleActionClick = (warning: DataQualityWarning) => {
    if (warning.actionRoute) {
      setLocation(warning.actionRoute);
    }
  };

  const getVariantFromSeverity = (severity?: 'error' | 'warning' | 'info') => {
    if (severity === 'error') return 'destructive';
    return 'default';
  };

  const getBorderColorFromSeverity = (severity?: 'error' | 'warning' | 'info') => {
    if (severity === 'error') return 'border-red-200 bg-red-50 dark:bg-red-950';
    return 'border-orange-200 bg-orange-50 dark:bg-orange-950';
  };

  return (
    <div className="space-y-3">
      {/* Structured Warnings with Action Buttons */}
      {warnings?.map((warning, index) => (
        <Alert
          key={`structured-${index}`}
          variant={getVariantFromSeverity(warning.severity)}
          className={getBorderColorFromSeverity(warning.severity)}
        >
          <AlertTriangle className={`h-4 w-4 ${
            warning.severity === 'error' ? 'text-red-600' : 'text-orange-600'
          }`} />
          <div className="flex-1">
            <AlertTitle className={
              warning.severity === 'error'
                ? 'text-red-800 dark:text-red-200'
                : 'text-orange-800 dark:text-orange-200'
            }>
              資料品質警告
            </AlertTitle>
            <AlertDescription className={
              warning.severity === 'error'
                ? 'text-red-700 dark:text-red-300'
                : 'text-orange-700 dark:text-orange-300'
            }>
              <div className="whitespace-pre-wrap">{warning.message}</div>
              {warning.actionLabel && warning.actionRoute && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => handleActionClick(warning)}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {warning.actionLabel}
                </Button>
              )}
            </AlertDescription>
          </div>
        </Alert>
      ))}

      {/* Legacy String Warnings (for backward compatibility) */}
      {filteredLegacyWarnings.length > 0 && (
        <Alert variant="default" className="border-orange-200 bg-orange-50 dark:bg-orange-950">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800 dark:text-orange-200">資料品質警告</AlertTitle>
          <AlertDescription className="text-orange-700 dark:text-orange-300">
            <ul className="list-disc list-inside space-y-1 mt-2">
              {filteredLegacyWarnings.map((warning, index) => (
                <li key={`legacy-${index}`}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

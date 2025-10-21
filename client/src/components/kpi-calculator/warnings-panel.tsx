/**
 * Warnings Panel Component
 * Displays calculation warnings with appropriate styling
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';

interface WarningsPanelProps {
  warnings: string[];
}

export function WarningsPanel({ warnings }: WarningsPanelProps) {
  if (warnings.length === 0) return null;

  // Categorize warnings
  const criticalWarnings = warnings.filter(w =>
    w.includes('失敗') || w.includes('異常') || w.includes('錯誤')
  );
  const infoWarnings = warnings.filter(w => !criticalWarnings.includes(w));

  return (
    <div className="space-y-3">
      {criticalWarnings.length > 0 && (
        <Alert variant="default" className="border-orange-200 bg-orange-50 dark:bg-orange-950">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800 dark:text-orange-200">計算警告</AlertTitle>
          <AlertDescription className="text-orange-700 dark:text-orange-300">
            <ul className="list-disc list-inside space-y-1 mt-2">
              {criticalWarnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {infoWarnings.length > 0 && (
        <Alert variant="default">
          <Info className="h-4 w-4" />
          <AlertTitle>資訊提示</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
              {infoWarnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

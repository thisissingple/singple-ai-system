/**
 * KPI Definition Dialog
 * 顯示 KPI 完整定義的對話框
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Info, Calculator } from 'lucide-react';
import { getKPIDefinition } from '@/config/kpi-definitions';
import ReactMarkdown from 'react-markdown';

interface KPIDefinitionDialogProps {
  open: boolean;
  onClose: () => void;
  kpiId: string;
  currentValue?: number | string;
}

export function KPIDefinitionDialog({
  open,
  onClose,
  kpiId,
  currentValue
}: KPIDefinitionDialogProps) {
  const definition = getKPIDefinition(kpiId);

  if (!definition) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-2xl">{definition.title}</DialogTitle>
            {currentValue !== undefined && (
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {currentValue} {definition.unit}
              </Badge>
            )}
          </div>
          <DialogDescription className="text-base mt-2">
            {definition.shortDesc}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* 計算公式 */}
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">計算公式</h3>
            </div>
            <code className="text-sm text-blue-800 dark:text-blue-200 font-mono">
              {definition.formula}
            </code>
          </div>

          {/* 完整定義 */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-base m-0">詳細說明</h3>
            </div>
            <ReactMarkdown
              components={{
                // 自訂 markdown 渲染樣式
                strong: ({ children }) => (
                  <strong className="text-foreground font-semibold">{children}</strong>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1 ml-2">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1 ml-2">{children}</ol>
                ),
                p: ({ children }) => (
                  <p className="text-muted-foreground leading-relaxed mb-3">{children}</p>
                )
              }}
            >
              {definition.fullDesc}
            </ReactMarkdown>
          </div>
        </div>

        {/* 數據來源說明 */}
        <div className="mt-6 pt-4 border-t text-xs text-muted-foreground">
          <p>
            💡 數據來源：體驗課上課記錄、體驗課購買記錄、成交記錄（EODs）
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

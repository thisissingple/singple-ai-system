/**
 * KPI Definition Dialog (Enhanced)
 * 顯示 KPI 完整定義的對話框 - 包含詳細數字計算範例
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Info, Calculator, Hash, HelpCircle } from 'lucide-react';
import { getKPIDefinition } from '@/config/kpi-definitions';
import ReactMarkdown from 'react-markdown';

interface KPIDefinitionDialogProps {
  open: boolean;
  onClose: () => void;
  kpiId: string;
  currentValue?: number | string;
  calculationData?: {
    baseVariables?: Record<string, {value: number; source: string}>;
    numerator?: number;
    denominator?: number;
    rawValue?: number;
  };
}

export function KPIDefinitionDialog({
  open,
  onClose,
  kpiId,
  currentValue,
  calculationData
}: KPIDefinitionDialogProps) {
  const definition = getKPIDefinition(kpiId);

  if (!definition) {
    return null;
  }

  // 根據 kpiId 準備計算範例數據
  const getCalculationExample = () => {
    if (!calculationData?.baseVariables) return null;

    const vars = calculationData.baseVariables;

    switch (kpiId) {
      case 'conversionRate': {
        const converted = vars.convertedStudents?.value || 0;
        const completed = vars.completedStudents?.value || 0;
        const rate = completed > 0 ? ((converted / completed) * 100).toFixed(1) : '0.0';
        return {
          numerator: { label: '已轉高學生數', value: converted, definition: '有購買高階方案（包含「高階一對一」或「高音」）的學生數量' },
          denominator: { label: '已上完課學生數', value: completed, definition: '完成體驗課程的學生數量（包含「已轉高」和「未轉高」狀態）' },
          result: `${rate}%`,
          calculation: `${converted} ÷ ${completed} × 100 = ${rate}%`
        };
      }
      case 'trialCompletionRate': {
        const completed = vars.completedStudents?.value || 0;
        const total = vars.totalStudents?.value || 0;
        const rate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0.0';
        return {
          numerator: { label: '已上完課學生數', value: completed, definition: '完成體驗課程的學生數量' },
          denominator: { label: '所有體驗課學員', value: total, definition: '購買體驗課的總學生數（去重後）' },
          result: `${rate}%`,
          calculation: `${completed} ÷ ${total} × 100 = ${rate}%`
        };
      }
      case 'startRate': {
        const started = vars.startedStudents?.value || 0;
        const total = vars.totalStudents?.value || 0;
        const rate = total > 0 ? ((started / total) * 100).toFixed(1) : '0.0';
        return {
          numerator: { label: '已開始學員', value: started, definition: '至少上過一堂體驗課的學生數（包含「體驗中」、「未轉高」、「已轉高」）' },
          denominator: { label: '總學員數', value: total, definition: '購買體驗課的總學生數（去重後）' },
          result: `${rate}%`,
          calculation: `${started} ÷ ${total} × 100 = ${rate}%`
        };
      }
      default:
        return null;
    }
  };

  const example = getCalculationExample();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
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

          {/* 🆕 實際數字計算範例 */}
          {example && (
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-3">
                <Hash className="h-4 w-4 text-green-600 dark:text-green-400" />
                <h3 className="font-semibold text-green-900 dark:text-green-100">實際數字計算</h3>
              </div>

              {/* 分子說明 */}
              <div className="mb-3 pb-3 border-b border-green-200 dark:border-green-800">
                <div className="flex items-start gap-2 mb-1">
                  <HelpCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-green-900 dark:text-green-100">
                      {example.numerator.label}: <span className="text-xl font-bold">{example.numerator.value}</span> 位
                    </div>
                    <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                      {example.numerator.definition}
                    </div>
                  </div>
                </div>
              </div>

              {/* 分母說明 */}
              <div className="mb-3 pb-3 border-b border-green-200 dark:border-green-800">
                <div className="flex items-start gap-2 mb-1">
                  <HelpCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-green-900 dark:text-green-100">
                      {example.denominator.label}: <span className="text-xl font-bold">{example.denominator.value}</span> 位
                    </div>
                    <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                      {example.denominator.definition}
                    </div>
                  </div>
                </div>
              </div>

              {/* 最終計算 */}
              <div className="bg-white dark:bg-green-900/20 rounded-md p-3 mt-3">
                <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                  詳細計算過程：
                </div>
                <code className="text-base text-green-800 dark:text-green-200 font-mono block">
                  {example.calculation}
                </code>
                <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-700">
                  <div className="text-lg font-bold text-green-900 dark:text-green-100">
                    最終結果：{example.result}
                  </div>
                </div>
              </div>
            </div>
          )}

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

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
          numerator: { label: '已轉高學生數', value: converted, definition: '體驗課後購買高階方案（「高階一對一」或「高音」）的學生數（成交日期需在最早上課日期之後）' },
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
          numerator: { label: '已上完課學生數', value: completed, definition: '完成體驗課程的學生數量（包含「已轉高」和「未轉高」狀態）' },
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
      case 'avgConversionTime': {
        const totalDays = vars.totalConversionDays?.value || 0;
        const validPairs = vars.validConversionPairs?.value || 0;
        const avgDays = validPairs > 0 ? (totalDays / validPairs).toFixed(1) : '0.0';
        return {
          numerator: { label: '總轉換天數', value: totalDays, definition: '所有已轉高學生從「最早上課日期」到「成交日期」的天數總和' },
          denominator: { label: '有效配對數', value: validPairs, definition: '成功配對上課日期和成交日期的已轉高學生數' },
          result: `${avgDays} 天`,
          calculation: `${totalDays} ÷ ${validPairs} = ${avgDays} 天`
        };
      }
      case 'potentialRevenue': {
        const revenue = vars.potentialRevenue?.value || 0;
        const students = vars.convertedStudents?.value || 0;
        return {
          numerator: { label: '已轉高實收金額', value: revenue, definition: '已轉高學生購買高階方案（包含「高階一對一」或「高音」）的實收金額總和' },
          denominator: { label: '已轉高學生數', value: students, definition: '有購買高階方案的學生總數' },
          result: `NT$ ${revenue.toLocaleString()}`,
          calculation: `已轉高 ${students} 位學生的高階方案總收益 = NT$ ${revenue.toLocaleString()}`
        };
      }
      case 'totalStudents': {
        const total = vars.totalStudents?.value || 0;
        const consultations = vars.totalConsultations?.value || 0;
        return {
          numerator: { label: '總學生數', value: total, definition: '購買體驗課的唯一學生數（按 Email 去重）' },
          denominator: { label: '諮詢記錄數', value: consultations, definition: '在 EODs 表中的諮詢記錄總數' },
          result: `${total} 人`,
          calculation: `體驗課學生總數 = ${total} 人（諮詢記錄 ${consultations} 筆）`
        };
      }
      case 'pendingStudents': {
        const pending = vars.pending?.value || 0;
        const inProgress = vars.inProgressStudents?.value || 0;
        const notStarted = vars.notStartedStudents?.value || 0;
        return {
          numerator: { label: '體驗中學生', value: inProgress, definition: '已開始上課但尚未完成體驗課的學生數' },
          denominator: { label: '未開始學生', value: notStarted, definition: '已購買但尚未開始上課的學生數' },
          result: `${pending} 人`,
          calculation: `${inProgress} + ${notStarted} = ${pending} 人`
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
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* 實際計算 - 最醒目，放最上面 */}
          {example && (
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-6 border-2 border-green-300 dark:border-green-700">
              <div className="flex items-center gap-2 mb-3">
                <Hash className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h3 className="font-semibold text-lg text-green-900 dark:text-green-100">實際計算</h3>
              </div>
              <code className="text-2xl text-green-800 dark:text-green-200 font-mono font-bold block">
                {example.calculation}
              </code>
            </div>
          )}

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

          {/* 定義說明 */}
          {example && (
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">定義說明</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    • {example.numerator.label}: {example.numerator.value} 位
                  </span>
                  <div className="text-slate-600 dark:text-slate-400 ml-4 mt-0.5">
                    {example.numerator.definition}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    • {example.denominator.label}: {example.denominator.value} 位
                  </span>
                  <div className="text-slate-600 dark:text-slate-400 ml-4 mt-0.5">
                    {example.denominator.definition}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

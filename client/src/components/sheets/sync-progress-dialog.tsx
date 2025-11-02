/**
 * 同步進度對話框
 * 顯示即時同步進度
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export interface SyncProgress {
  mappingId: string;
  stage: 'reading' | 'transforming' | 'clearing' | 'inserting' | 'completed' | 'failed';
  current: number;
  total: number;
  message: string;
  percentage: number;
}

interface SyncProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: SyncProgress | null;
}

export function SyncProgressDialog({
  open,
  onOpenChange,
  progress,
}: SyncProgressDialogProps) {
  const getStageIcon = () => {
    if (!progress) return null;

    switch (progress.stage) {
      case 'completed':
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case 'failed':
        return <XCircle className="w-12 h-12 text-red-500" />;
      default:
        return <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />;
    }
  };

  const getStageText = () => {
    if (!progress) return '';

    switch (progress.stage) {
      case 'reading':
        return '正在讀取資料';
      case 'transforming':
        return '正在轉換資料';
      case 'clearing':
        return '正在清空表格';
      case 'inserting':
        return '正在寫入資料';
      case 'completed':
        return '同步完成';
      case 'failed':
        return '同步失敗';
      default:
        return '處理中';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>同步進度</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 圖示 */}
          <div className="flex justify-center">
            {getStageIcon()}
          </div>

          {/* 階段文字 */}
          <div className="text-center">
            <h3 className="text-lg font-semibold">{getStageText()}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {progress?.message || '準備中...'}
            </p>
          </div>

          {/* 進度條 */}
          {progress && progress.stage !== 'failed' && (
            <div className="space-y-2">
              <Progress value={progress.percentage} className="h-2" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{progress.percentage}%</span>
                {progress.total > 0 && (
                  <span>
                    {progress.current} / {progress.total} 筆
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 完成或失敗時的說明 */}
          {progress?.stage === 'completed' && (
            <p className="text-center text-sm text-green-600">
              ✓ 資料已成功同步到 Supabase
            </p>
          )}

          {progress?.stage === 'failed' && (
            <p className="text-center text-sm text-red-600">
              ✗ 同步過程中發生錯誤,請稍後再試
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

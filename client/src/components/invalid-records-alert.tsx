import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface InvalidRecord {
  rowIndex: number;
  errors: string[];
}

interface InvalidRecordsAlertProps {
  invalidRecords: InvalidRecord[];
  worksheetName: string;
}

export function InvalidRecordsAlert({ invalidRecords, worksheetName }: InvalidRecordsAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!invalidRecords || invalidRecords.length === 0) {
    return null;
  }

  const displayRecords = isExpanded ? invalidRecords : invalidRecords.slice(0, 5);
  const hasMore = invalidRecords.length > 5;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>同步時發現 {invalidRecords.length} 筆無效資料</span>
        <Badge variant="destructive">{worksheetName}</Badge>
      </AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-2">
          <p className="text-sm">
            以下資料列缺少必填欄位，未同步到 Supabase：
          </p>
          <div className="bg-background/50 rounded-md p-3 space-y-1 text-xs font-mono max-h-64 overflow-y-auto">
            {displayRecords.map((record, idx) => (
              <div key={idx} className="flex items-start gap-2 py-1 border-b last:border-0">
                <span className="text-muted-foreground shrink-0">Google Sheets 第 {record.rowIndex + 2} 列:</span>
                <span className="text-destructive">{record.errors.join(', ')}</span>
              </div>
            ))}
          </div>
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  顯示較少
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  顯示全部 ({invalidRecords.length} 筆)
                </>
              )}
            </Button>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            💡 提示：請檢查 Google Sheets 中這些資料列是否填寫完整必填欄位
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * 同步記錄對話框
 * 顯示 Google Sheets 同步歷史記錄，包含重複和跳過記錄詳情
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface SyncLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DuplicateDetail {
  key: string;
  count: number;
  rows: number[];
}

interface SkippedDetail {
  row: number;
  reason: string;
  missingFields: string[];
}

interface SyncLog {
  id: string;
  mapping_id: string;
  status: 'success' | 'failed' | 'running';
  records_synced: number;
  error_message: string | null;
  synced_at: string;
  // 新增欄位
  source_records?: number;
  duplicate_records?: number;
  skipped_records?: number;
  duplicate_details?: DuplicateDetail[] | string;
  skipped_details?: SkippedDetail[] | string;
  mapping?: {
    worksheet_name: string;
    target_table: string;
  };
}

export function SyncLogsDialog({ open, onOpenChange }: SyncLogsDialogProps) {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      loadLogs();
    }
  }, [open]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sheets/logs');
      const data = await response.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (error) {
      console.error('載入同步記錄失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="w-3 h-3" />
            成功
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            失敗
          </Badge>
        );
      case 'running':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            執行中
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // 解析 JSON 字串（如果是字串的話）
  const parseJsonField = <T,>(field: T[] | string | undefined): T[] => {
    if (!field) return [];
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch {
        return [];
      }
    }
    return field;
  };

  // 檢查是否有詳細資訊可顯示
  const hasDetails = (log: SyncLog): boolean => {
    return (
      (log.duplicate_records ?? 0) > 0 ||
      (log.skipped_records ?? 0) > 0
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>同步記錄</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[600px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">載入中...</div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">尚無同步記錄</div>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const duplicateDetails = parseJsonField<DuplicateDetail>(log.duplicate_details);
                const skippedDetails = parseJsonField<SkippedDetail>(log.skipped_details);
                const isExpanded = expandedLogs.has(log.id);
                const showDetails = hasDetails(log);

                return (
                  <div
                    key={log.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    {/* 主要資訊區 */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {log.mapping && (
                            <span className="font-medium">
                              {log.mapping.worksheet_name} → {log.mapping.target_table}
                            </span>
                          )}
                          {getStatusBadge(log.status)}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(log.synced_at), 'yyyy/MM/dd HH:mm:ss', {
                            locale: zhTW,
                          })}
                        </span>
                      </div>

                      {/* 同步統計 */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        {log.source_records !== undefined && log.source_records > 0 && (
                          <span className="text-muted-foreground">
                            來源: <span className="font-medium text-foreground">{log.source_records}</span> 筆
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          已同步: <span className="font-medium text-green-600">{log.records_synced}</span> 筆
                        </span>
                        {(log.duplicate_records ?? 0) > 0 && (
                          <span className="text-muted-foreground">
                            重複: <span className="font-medium text-amber-600">{log.duplicate_records}</span> 筆
                          </span>
                        )}
                        {(log.skipped_records ?? 0) > 0 && (
                          <span className="text-muted-foreground">
                            跳過: <span className="font-medium text-red-600">{log.skipped_records}</span> 筆
                          </span>
                        )}
                      </div>

                      {/* 警告提示 */}
                      {showDetails && (
                        <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          <span>
                            {(log.duplicate_records ?? 0) > 0 && `${log.duplicate_records} 筆重複記錄被合併`}
                            {(log.duplicate_records ?? 0) > 0 && (log.skipped_records ?? 0) > 0 && '，'}
                            {(log.skipped_records ?? 0) > 0 && `${log.skipped_records} 筆記錄因缺少必要欄位被跳過`}
                          </span>
                        </div>
                      )}

                      {log.error_message && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded">
                          <p className="text-sm text-destructive">
                            {log.error_message}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 詳細資訊展開區 */}
                    {showDetails && (
                      <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(log.id)}>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full h-10 border-t rounded-none flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4" />
                                收起詳細資訊
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4" />
                                查看詳細資訊
                              </>
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="p-4 pt-0 space-y-4">
                            {/* 重複記錄詳情 */}
                            {duplicateDetails.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="font-medium text-amber-700 flex items-center gap-2">
                                  <Copy className="w-4 h-4" />
                                  重複記錄詳情（Google Sheets 中重複的資料）
                                </h4>
                                <div className="bg-amber-50/50 rounded border border-amber-100 divide-y divide-amber-100">
                                  {duplicateDetails.map((dup, idx) => (
                                    <div key={idx} className="p-3 text-sm">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline" className="text-amber-700 border-amber-300">
                                          重複 {dup.count} 次
                                        </Badge>
                                        <span className="text-muted-foreground">行號:</span>
                                        <span className="font-mono text-xs bg-amber-100 px-2 py-0.5 rounded">
                                          {dup.rows.join(', ')}
                                        </span>
                                      </div>
                                      <p className="mt-1 text-muted-foreground font-mono text-xs break-all">
                                        唯一鍵: {dup.key}
                                      </p>
                                    </div>
                                  ))}
                                  {duplicateDetails.length >= 50 && (
                                    <div className="p-3 text-sm text-muted-foreground text-center">
                                      ... 僅顯示前 50 組重複記錄
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 跳過記錄詳情 */}
                            {skippedDetails.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="font-medium text-red-700 flex items-center gap-2">
                                  <XCircle className="w-4 h-4" />
                                  跳過記錄詳情（缺少必要欄位的資料）
                                </h4>
                                <div className="bg-red-50/50 rounded border border-red-100 divide-y divide-red-100">
                                  {skippedDetails.map((skip, idx) => (
                                    <div key={idx} className="p-3 text-sm">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline" className="text-red-700 border-red-300">
                                          行 {skip.row}
                                        </Badge>
                                        <span className="text-red-600">{skip.reason}</span>
                                      </div>
                                    </div>
                                  ))}
                                  {skippedDetails.length >= 50 && (
                                    <div className="p-3 text-sm text-muted-foreground text-center">
                                      ... 僅顯示前 50 筆跳過記錄
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

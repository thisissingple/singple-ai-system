/**
 * 同步記錄對話框
 * 顯示 Google Sheets 同步歷史記錄
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface SyncLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SyncLog {
  id: string;
  mapping_id: string;
  status: 'success' | 'failed' | 'running';
  records_synced: number;
  error_message: string | null;
  synced_at: string;
  mapping?: {
    worksheet_name: string;
    target_table: string;
  };
}

export function SyncLogsDialog({ open, onOpenChange }: SyncLogsDialogProps) {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>同步記錄</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
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
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 border rounded-lg space-y-2"
                >
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

                  {log.status === 'success' && (
                    <p className="text-sm text-muted-foreground">
                      已同步 {log.records_synced} 筆記錄
                    </p>
                  )}

                  {log.error_message && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded">
                      <p className="text-sm text-destructive">
                        {log.error_message}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

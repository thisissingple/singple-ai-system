/**
 * Metric Settings Dialog Component
 * Allows users to configure custom formulas and source fields for report metrics
 */

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, RotateCcw } from 'lucide-react';

interface ReportMetricConfig {
  metricId: string;
  label: string;
  defaultFormula: string;
  manualFormula?: string | null;
  sourceFields?: string[];
  updatedAt?: Date;
}

interface MetricSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function MetricSettingsDialog({
  open,
  onOpenChange,
  onSave,
}: MetricSettingsDialogProps) {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<ReportMetricConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch configs when dialog opens
  useEffect(() => {
    if (open) {
      fetchConfigs();
    }
  }, [open]);

  const fetchConfigs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/report-metrics/config', {
        credentials: 'include',
      });

      const json = await response.json();

      if (json.success) {
        setConfigs(json.data);
      } else {
        toast({
          title: '載入失敗',
          description: json.error || '無法載入指標設定',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '載入失敗',
        description: '網路錯誤或權限不足',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateConfig = async (metricId: string, manualFormula: string) => {
    try {
      const response = await fetch('/api/report-metrics/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          metricId,
          manualFormula: manualFormula.trim() || null,
        }),
      });

      const json = await response.json();

      if (json.success) {
        // Update local state
        setConfigs((prev) =>
          prev.map((c) => (c.metricId === metricId ? json.data : c))
        );

        toast({
          title: '已更新',
          description: `指標「${json.data.label}」已更新`,
        });
      } else {
        toast({
          title: '更新失敗',
          description: json.error || '無法更新指標設定',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '更新失敗',
        description: '網路錯誤或權限不足',
        variant: 'destructive',
      });
    }
  };

  const handleResetConfig = async (metricId: string) => {
    try {
      const response = await fetch(`/api/report-metrics/config/${metricId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const json = await response.json();

      if (response.ok && json.success) {
        setConfigs((prev) =>
          prev.map((c) => (c.metricId === metricId ? json.data : c))
        );

        toast({
          title: '已重置',
          description: `指標「${json.data.label}」已恢復預設值`,
        });
      } else {
        toast({
          title: '重置失敗',
          description: json.error || '無法重置指標設定',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '重置失敗',
        description: '網路錯誤或權限不足',
        variant: 'destructive',
      });
    }
  };

  const handleSaveAndClose = () => {
    onSave();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>指標設定</DialogTitle>
          <DialogDescription>
            自訂報表指標的計算公式。支援變數：trials（體驗數）、conversions（成交數）、purchases（購買數）、
            pending（待追蹤數）、totalRevenue（總收入）、avgDealAmount（平均成交額）
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 my-4">
            {configs.map((config) => (
              <Card key={config.metricId}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{config.label}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        預設公式：<code className="text-xs bg-muted px-1 py-0.5 rounded">{config.defaultFormula}</code>
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleResetConfig(config.metricId)}
                      className="gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      重置
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor={`formula-${config.metricId}`}>自訂公式（選填）</Label>
                    <Textarea
                      id={`formula-${config.metricId}`}
                      defaultValue={config.manualFormula || ''}
                      placeholder="輸入自訂公式，留空則使用預設公式"
                      className="font-mono text-sm"
                      rows={2}
                      onBlur={(e) => {
                        const newValue = e.target.value;
                        if (newValue !== (config.manualFormula || '')) {
                          handleUpdateConfig(config.metricId, newValue);
                        }
                      }}
                    />
                    {config.manualFormula && (
                      <Badge variant="secondary" className="text-xs">
                        使用自訂公式
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            關閉
          </Button>
          <Button onClick={handleSaveAndClose}>
            儲存並重新整理報表
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

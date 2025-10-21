import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Table as TableIcon,
  Plus,
  Settings,
  Trash2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type Worksheet, type CustomDashboard } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface WidgetProps {
  title: string;
  config: any;
  onEdit?: () => void;
  onDelete?: () => void;
}

// KPI 卡片小部件
export function KPIWidget({ title, config, onEdit, onDelete }: WidgetProps) {
  const format = config?.format || 'number';
  const prefix = config?.prefix || '';
  const suffix = config?.suffix || '';
  
  // 使用實時數據 API 獲取當前值
  const { data: aggregateData, isLoading } = useQuery({
    queryKey: ['/api/worksheets', config?.worksheetId, 'aggregate', config?.columns?.[0], config?.calculation],
    queryFn: async () => {
      const params = new URLSearchParams({
        column: config?.columns?.[0] || '',
        operation: config?.calculation || ''
      });
      return apiRequest('GET', `/api/worksheets/${config?.worksheetId}/aggregate?${params}`);
    },
    enabled: !!(config?.worksheetId && config?.columns?.[0] && config?.calculation),
    refetchInterval: 30000, // 每30秒刷新一次
  });
  
  const value = aggregateData?.result || 0;
  const previousValue = config?.previousValue || 0; // 暫時保留，可以後續實現歷史比較
  const change = previousValue !== 0 ? ((value - previousValue) / previousValue * 100) : 0;
  const isPositive = change >= 0;
  
  const formatValue = (val: number) => {
    if (format === 'currency') return `${prefix}${val.toLocaleString()}${suffix}`;
    if (format === 'percentage') return `${val.toFixed(1)}%`;
    return `${prefix}${val.toLocaleString()}${suffix}`;
  };
  
  return (
    <Card className="group relative">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button size="sm" variant="ghost" onClick={onEdit} data-testid="edit-widget">
          <Settings className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete} data-testid="delete-widget">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold" data-testid="kpi-value">
            {isLoading ? '加載中...' : formatValue(value)}
          </div>
          <div className="flex items-center space-x-1">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <span className={`text-xs font-medium ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`} data-testid="kpi-change">
              {Math.abs(change).toFixed(1)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 表格小部件
export function TableWidget({ title, config, onEdit, onDelete }: WidgetProps) {
  // 獲取實時表格數據
  const { data: tableData, isLoading: dataLoading } = useQuery({
    queryKey: ['/api/worksheets', config?.worksheetId, 'data'],
    enabled: !!config?.worksheetId,
    refetchInterval: 30000, // 每30秒刷新一次
  });
  
  // 獲取工作表標題
  const { data: headersData, isLoading: headersLoading } = useQuery({
    queryKey: ['/api/worksheets', config?.worksheetId, 'headers'],
    queryFn: async () => {
      return apiRequest('GET', `/api/worksheets/${config?.worksheetId}/headers`);
    },
    enabled: !!config?.worksheetId,
  });
  
  const data = Array.isArray(tableData) ? tableData : [];
  const columns = Array.isArray(config?.columns) && config.columns.length > 0
    ? config.columns
    : (Array.isArray(headersData?.headers) ? headersData.headers : []);
  
  return (
    <Card className="group relative">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button size="sm" variant="ghost" onClick={onEdit} data-testid="edit-widget">
          <Settings className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete} data-testid="delete-widget">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <TableIcon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {dataLoading || headersLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 animate-spin" />
            <p>加載中...</p>
          </div>
        ) : data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="data-table">
              <thead>
                <tr className="border-b">
                  {columns.map((col: string, idx: number) => (
                    <th key={idx} className="text-left p-2 font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 5).map((row: any, idx: number) => (
                  <tr key={idx} className="border-b">
                    {columns.map((col: string, colIdx: number) => (
                      <td key={colIdx} className="p-2">
                        {row?.data?.[col] || row?.[col] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length > 5 && (
              <p className="text-xs text-muted-foreground mt-2">
                顯示 5 / {data.length} 筆記錄
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <TableIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>無數據</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 圖表小部件（占位符）
export function ChartWidget({ title, config, onEdit, onDelete }: WidgetProps) {
  const chartType = config?.chartType || 'bar';
  const data = config?.data || [];
  
  return (
    <Card className="group relative">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button size="sm" variant="ghost" onClick={onEdit} data-testid="edit-widget">
          <Settings className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete} data-testid="delete-widget">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-40 flex items-center justify-center border-2 border-dashed border-border rounded">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">{chartType.toUpperCase()} 圖表</p>
            <p className="text-sm">即將實現圖表功能</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 小部件創建器對話框
interface WidgetBuilderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWidget: (widget: any) => void;
  editingWidget?: any;
}

export function WidgetBuilderDialog({ isOpen, onClose, onCreateWidget, editingWidget }: WidgetBuilderDialogProps) {
  const [widgetType, setWidgetType] = useState('kpi');
  const [title, setTitle] = useState('');
  const [selectedWorksheet, setSelectedWorksheet] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('');
  const [calculation, setCalculation] = useState('sum');

  // 編輯模式：當 editingWidget 存在時，預填表單數據
  useEffect(() => {
    if (editingWidget) {
      setWidgetType(editingWidget.type || 'kpi');
      setTitle(editingWidget.title || '');
      setSelectedWorksheet(editingWidget.config?.worksheetId || '');
      setSelectedColumn(editingWidget.config?.columns?.[0] || '');
      setCalculation(editingWidget.config?.calculation || 'sum');
    } else {
      // 重置表單
      setWidgetType('kpi');
      setTitle('');
      setSelectedWorksheet('');
      setSelectedColumn('');
      setCalculation('sum');
    }
  }, [editingWidget]);
  
  // 獲取可用的工作表
  const { data: spreadsheets = [] } = useQuery<any[]>({
    queryKey: ['/api/spreadsheets'],
  });
  
  // 獲取選中工作表的數據
  const { data: worksheets = [] } = useQuery<Worksheet[]>({
    queryKey: ['/api/worksheets'],
    enabled: spreadsheets.length > 0,
  });
  
  // 獲取選中工作表的標題
  const { data: headersData } = useQuery({
    queryKey: ['/api/worksheets', selectedWorksheet, 'headers'],
    queryFn: async () => {
      return apiRequest('GET', `/api/worksheets/${selectedWorksheet}/headers`);
    },
    enabled: !!selectedWorksheet,
  });

  const handleCreate = () => {
    const widget = {
      type: widgetType,
      title: title || `新的${widgetType === 'kpi' ? 'KPI' : widgetType === 'table' ? '表格' : '圖表'}`,
      config: {
        dataSource: 'google_sheets',
        worksheetId: selectedWorksheet,
        columns: widgetType === 'table' ? [] : [selectedColumn],
        calculation: widgetType === 'kpi' ? calculation : undefined,
        chartType: widgetType === 'chart' ? 'bar' : undefined,
        format: widgetType === 'kpi' ? 'number' : undefined,
      },
      position: { x: 0, y: 0, w: widgetType === 'table' ? 2 : 1, h: 1 }
    };
    
    onCreateWidget(widget);
    
    // 重置表單
    setTitle('');
    setWidgetType('kpi');
    setSelectedWorksheet('');
    setSelectedColumn('');
    setCalculation('sum');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="widget-editor">
            {editingWidget ? '編輯小部件' : '創建新小部件'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">小部件類型</label>
            <Select value={widgetType} onValueChange={setWidgetType}>
              <SelectTrigger data-testid="widget-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kpi">KPI 卡片</SelectItem>
                <SelectItem value="table">數據表格</SelectItem>
                <SelectItem value="chart">圖表</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium">標題</label>
            <Input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="輸入小部件標題"
              data-testid="widget-title-input"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">數據源工作表</label>
            <Select value={selectedWorksheet} onValueChange={setSelectedWorksheet}>
              <SelectTrigger data-testid="worksheet-select">
                <SelectValue placeholder="選擇工作表" />
              </SelectTrigger>
              <SelectContent>
                {worksheets.map((worksheet: Worksheet) => (
                  <SelectItem key={worksheet.id} value={worksheet.id}>
                    {worksheet.worksheetName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {widgetType === 'kpi' && (
            <>
              <div>
                <label className="text-sm font-medium">計算欄位</label>
                <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                  <SelectTrigger data-testid="column-select">
                    <SelectValue placeholder="選擇欄位" />
                  </SelectTrigger>
                  <SelectContent>
                    {(headersData?.headers || []).map((header: string) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">計算方式</label>
                <Select value={calculation} onValueChange={setCalculation}>
                  <SelectTrigger data-testid="calculation-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sum">總和</SelectItem>
                    <SelectItem value="average">平均</SelectItem>
                    <SelectItem value="count">計數</SelectItem>
                    <SelectItem value="max">最大值</SelectItem>
                    <SelectItem value="min">最小值</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} data-testid="cancel-widget">
              取消
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={!title.trim() || !selectedWorksheet}
              data-testid="create-widget"
            >
              {editingWidget ? '保存更改' : '創建小部件'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
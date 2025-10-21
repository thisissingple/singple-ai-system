import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Database, 
  RotateCcw, 
  Bell, 
  Shield, 
  Palette,
  Clock,
  Download,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Trash2,
  Save
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type Spreadsheet, type User } from '@shared/schema';

interface SettingsViewProps {
  spreadsheet: Spreadsheet | null;
  user: User | undefined;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  autoRefresh: boolean;
  onAutoRefreshChange: (enabled: boolean) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

interface DashboardSettings {
  theme: 'light' | 'dark' | 'auto';
  refreshInterval: number;
  enableNotifications: boolean;
  enableSounds: boolean;
  chartAnimations: boolean;
  showGridLines: boolean;
  dataRetentionDays: number;
  exportFormat: 'csv' | 'json';
  timezone: string;
  language: 'zh-TW' | 'en-US';
}

export function SettingsView({ 
  spreadsheet, 
  user, 
  connectionStatus, 
  autoRefresh, 
  onAutoRefreshChange,
  onRefresh,
  isRefreshing
}: SettingsViewProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<DashboardSettings>({
    theme: 'auto',
    refreshInterval: 30,
    enableNotifications: true,
    enableSounds: false,
    chartAnimations: true,
    showGridLines: true,
    dataRetentionDays: 30,
    exportFormat: 'csv',
    timezone: 'Asia/Taipei',
    language: 'zh-TW'
  });
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('oh-sheet-dashboard-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    }
  }, []);

  const handleSettingChange = <K extends keyof DashboardSettings>(
    key: K, 
    value: DashboardSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setUnsavedChanges(true);
  };

  const saveSettings = () => {
    localStorage.setItem('oh-sheet-dashboard-settings', JSON.stringify(settings));
    setUnsavedChanges(false);
    toast({
      title: '設定已保存',
      description: '您的偏好設定已成功保存。',
    });
  };

  const resetSettings = () => {
    setSettings({
      theme: 'auto',
      refreshInterval: 30,
      enableNotifications: true,
      enableSounds: false,
      chartAnimations: true,
      showGridLines: true,
      dataRetentionDays: 30,
      exportFormat: 'csv',
      timezone: 'Asia/Taipei',
      language: 'zh-TW'
    });
    setUnsavedChanges(true);
    toast({
      title: '設定已重置',
      description: '所有設定已重置為預設值。',
      variant: 'destructive'
    });
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `oh-sheet-settings-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast({
      title: '設定已導出',
      description: '設定檔案已下載到您的裝置。',
    });
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        setSettings(prev => ({ ...prev, ...importedSettings }));
        setUnsavedChanges(true);
        toast({
          title: '設定已匯入',
          description: '設定檔案已成功匯入。請記得保存變更。',
        });
      } catch (error) {
        toast({
          title: '匯入失敗',
          description: '設定檔案格式無效。',
          variant: 'destructive'
        });
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    event.target.value = '';
  };

  const getConnectionStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-600" />,
          text: '已連接',
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200'
        };
      case 'connecting':
        return {
          icon: <RefreshCw className="h-4 w-4 animate-spin text-yellow-600" />,
          text: '連接中',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 border-yellow-200'
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-4 w-4 text-red-600" />,
          text: '連接錯誤',
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200'
        };
      default:
        return {
          icon: <AlertCircle className="h-4 w-4 text-gray-600" />,
          text: '未連接',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 border-gray-200'
        };
    }
  };

  const statusInfo = getConnectionStatusInfo();

  return (
    <div className="space-y-6" data-testid="settings-view">
      {/* Settings Header */}
      <Card className="glass-card dark:glass-card-dark border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                設定管理
              </CardTitle>
              <CardDescription>
                自定義您的儀表板體驗和系統行為
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {unsavedChanges && (
                <Badge variant="outline" className="text-amber-600 border-amber-600">
                  有未保存的變更
                </Badge>
              )}
              <Button
                onClick={saveSettings}
                disabled={!unsavedChanges}
                className="glass dark:glass-dark"
                data-testid="save-settings"
              >
                <Save className="h-4 w-4 mr-2" />
                保存設定
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="general" className="space-y-6">
        <div className="glass-card dark:glass-card-dark border-0 p-1 rounded-xl">
          <TabsList className="w-full bg-transparent h-12 p-1">
            <TabsTrigger value="general" className="flex-1">一般設定</TabsTrigger>
            <TabsTrigger value="sync" className="flex-1">同步設定</TabsTrigger>
            <TabsTrigger value="display" className="flex-1">顯示設定</TabsTrigger>
            <TabsTrigger value="system" className="flex-1">系統狀態</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general" className="space-y-6">
          <Card className="glass-card dark:glass-card-dark border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                介面與體驗
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="theme">主題模式</Label>
                  <Select 
                    value={settings.theme} 
                    onValueChange={(value: 'light' | 'dark' | 'auto') => handleSettingChange('theme', value)}
                  >
                    <SelectTrigger className="glass dark:glass-dark">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">淺色模式</SelectItem>
                      <SelectItem value="dark">深色模式</SelectItem>
                      <SelectItem value="auto">跟隨系統</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">語言</Label>
                  <Select 
                    value={settings.language} 
                    onValueChange={(value: 'zh-TW' | 'en-US') => handleSettingChange('language', value)}
                  >
                    <SelectTrigger className="glass dark:glass-dark">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh-TW">繁體中文</SelectItem>
                      <SelectItem value="en-US">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notifications">桌面通知</Label>
                    <p className="text-sm text-muted-foreground">接收數據更新和同步狀態通知</p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={settings.enableNotifications}
                    onCheckedChange={(checked) => handleSettingChange('enableNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sounds">音效提醒</Label>
                    <p className="text-sm text-muted-foreground">播放操作成功和錯誤音效</p>
                  </div>
                  <Switch
                    id="sounds"
                    checked={settings.enableSounds}
                    onCheckedChange={(checked) => handleSettingChange('enableSounds', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="animations">圖表動畫</Label>
                    <p className="text-sm text-muted-foreground">啟用圖表載入和轉換動畫</p>
                  </div>
                  <Switch
                    id="animations"
                    checked={settings.chartAnimations}
                    onCheckedChange={(checked) => handleSettingChange('chartAnimations', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync" className="space-y-6">
          <Card className="glass-card dark:glass-card-dark border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                同步與更新設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-refresh">自動重新整理</Label>
                  <p className="text-sm text-muted-foreground">自動同步最新的 Google Sheets 數據</p>
                </div>
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={onAutoRefreshChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="refresh-interval">重新整理間隔 (秒)</Label>
                <Select 
                  value={settings.refreshInterval.toString()} 
                  onValueChange={(value) => handleSettingChange('refreshInterval', parseInt(value))}
                >
                  <SelectTrigger className="glass dark:glass-dark">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 秒</SelectItem>
                    <SelectItem value="30">30 秒</SelectItem>
                    <SelectItem value="60">1 分鐘</SelectItem>
                    <SelectItem value="300">5 分鐘</SelectItem>
                    <SelectItem value="600">10 分鐘</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retention">數據保留天數</Label>
                <Select 
                  value={settings.dataRetentionDays.toString()} 
                  onValueChange={(value) => handleSettingChange('dataRetentionDays', parseInt(value))}
                >
                  <SelectTrigger className="glass dark:glass-dark">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 天</SelectItem>
                    <SelectItem value="30">30 天</SelectItem>
                    <SelectItem value="90">90 天</SelectItem>
                    <SelectItem value="365">1 年</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  超過此時間的數據將被自動清理
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <Button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="w-full glass dark:glass-dark"
                  data-testid="manual-refresh"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? '同步中...' : '立即同步'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="display" className="space-y-6">
          <Card className="glass-card dark:glass-card-dark border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                顯示與格式設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="grid-lines">顯示網格線</Label>
                  <p className="text-sm text-muted-foreground">在表格和圖表中顯示網格線</p>
                </div>
                <Switch
                  id="grid-lines"
                  checked={settings.showGridLines}
                  onCheckedChange={(checked) => handleSettingChange('showGridLines', checked)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="export-format">預設導出格式</Label>
                  <Select 
                    value={settings.exportFormat} 
                    onValueChange={(value: 'csv' | 'json') => handleSettingChange('exportFormat', value)}
                  >
                    <SelectTrigger className="glass dark:glass-dark">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV 格式</SelectItem>
                      <SelectItem value="json">JSON 格式</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">時區</Label>
                  <Select 
                    value={settings.timezone} 
                    onValueChange={(value) => handleSettingChange('timezone', value)}
                  >
                    <SelectTrigger className="glass dark:glass-dark">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Taipei">台北時間 (GMT+8)</SelectItem>
                      <SelectItem value="Asia/Shanghai">北京時間 (GMT+8)</SelectItem>
                      <SelectItem value="Asia/Tokyo">東京時間 (GMT+9)</SelectItem>
                      <SelectItem value="UTC">UTC 時間 (GMT+0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card className="glass-card dark:glass-card-dark border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                系統狀態
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connection Status */}
              <Alert className={statusInfo.bgColor}>
                <div className="flex items-center gap-2">
                  {statusInfo.icon}
                  <div>
                    <h4 className="font-medium">連接狀態</h4>
                    <AlertDescription className={statusInfo.color}>
                      {statusInfo.text}
                      {connectionStatus === 'connected' && spreadsheet && (
                        <span className="ml-2">
                          - 已連接到 "{spreadsheet.name}"
                        </span>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>

              {/* User Information */}
              {user && (
                <div className="glass dark:glass-dark rounded-lg p-4">
                  <h4 className="font-medium mb-3">用戶資訊</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">用戶名稱：</span>
                      <span className="ml-2">{user.firstName} {user.lastName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">電子郵件：</span>
                      <span className="ml-2">{user.email}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">權限等級：</span>
                      <Badge variant="outline" className="ml-2">{user.role}</Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">部門：</span>
                      <span className="ml-2">{user.department || '未設定'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Spreadsheet Information */}
              {spreadsheet && (
                <div className="glass dark:glass-dark rounded-lg p-4">
                  <h4 className="font-medium mb-3">電子表格資訊</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">名稱：</span>
                      <span className="ml-2">{spreadsheet.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">記錄數量：</span>
                      <span className="ml-2">{spreadsheet.rowCount || 0} 筆</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">最後同步：</span>
                      <span className="ml-2">
                        {spreadsheet.lastSyncAt ? 
                          new Date(spreadsheet.lastSyncAt).toLocaleString() : 
                          '從未同步'
                        }
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">範圍：</span>
                      <span className="ml-2">{spreadsheet.range || 'A1:Z1000'}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Settings Management */}
          <Card className="glass-card dark:glass-card-dark border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                設定管理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  onClick={exportSettings}
                  className="glass dark:glass-dark"
                  data-testid="export-settings"
                >
                  <Download className="h-4 w-4 mr-2" />
                  導出設定
                </Button>
                
                <div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={importSettings}
                    className="hidden"
                    id="import-settings"
                  />
                  <Label htmlFor="import-settings">
                    <Button
                      variant="outline"
                      className="glass dark:glass-dark w-full cursor-pointer"
                      asChild
                    >
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        匯入設定
                      </span>
                    </Button>
                  </Label>
                </div>

                <Button
                  variant="destructive"
                  onClick={resetSettings}
                  className="glass dark:glass-dark"
                  data-testid="reset-settings"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  重置設定
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
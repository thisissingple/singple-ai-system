import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Table2, 
  FileText, 
  Settings, 
  Activity,
  Database
} from 'lucide-react';

interface DashboardNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  totalRecords: number;
  activeRecords: number;
  isConnected: boolean;
}

export function DashboardNavigation({ 
  activeTab, 
  onTabChange, 
  totalRecords, 
  activeRecords, 
  isConnected 
}: DashboardNavigationProps) {
  return (
    <div className="mb-8">
      <div className="glass-card dark:glass-card-dark border-0 p-1 rounded-xl">
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
          <TabsList className="w-full bg-transparent h-14 p-1">
            <TabsTrigger
              value="analytics"
              className="flex-1 gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
              data-testid="tab-analytics"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">數據分析</span>
              <span className="sm:hidden">分析</span>
              {activeTab === 'analytics' && (
                <Badge variant="secondary" className="ml-2 h-5 text-xs">
                  {totalRecords}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger
              value="details"
              className="flex-1 gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
              data-testid="tab-details"
            >
              <Table2 className="h-4 w-4" />
              <span className="hidden sm:inline">詳細數據</span>
              <span className="sm:hidden">數據</span>
              {activeTab === 'details' && (
                <Badge variant="secondary" className="ml-2 h-5 text-xs">
                  {totalRecords}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger
              value="reports"
              className="flex-1 gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
              data-testid="tab-reports"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">報告分析</span>
              <span className="sm:hidden">報告</span>
              {activeTab === 'reports' && activeRecords > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 text-xs bg-green-100 text-green-800">
                  {activeRecords} 活躍
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger
              value="settings"
              className="flex-1 gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
              data-testid="tab-settings"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">設定管理</span>
              <span className="sm:hidden">設定</span>
              {activeTab === 'settings' && (
                <div className="flex items-center gap-1 ml-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <Activity className="h-3 w-3" />
                </div>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Quick Stats Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 p-4 glass dark:glass-dark rounded-lg">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">總計</span>
            <span className="text-sm font-semibold">{totalRecords.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-600" />
            <span className="text-sm text-muted-foreground">活躍</span>
            <span className="text-sm font-semibold text-green-600">{activeRecords.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-muted-foreground">狀態</span>
            <span className={`text-sm font-semibold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? '已連接' : '離線'}
            </span>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          當前頁面: {getTabDisplayName(activeTab)}
        </div>
      </div>
    </div>
  );
}

function getTabDisplayName(tab: string): string {
  switch (tab) {
    case 'analytics':
      return '數據分析';
    case 'details':
      return '詳細數據';
    case 'reports':
      return '報告分析';
    case 'settings':
      return '設定管理';
    default:
      return '未知頁面';
  }
}
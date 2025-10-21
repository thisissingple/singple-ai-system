import { Card, CardContent } from '@/components/ui/card';
import { Database, CheckCircle, RefreshCw } from 'lucide-react';
import { type Spreadsheet } from '@shared/schema';

interface StatsCardsProps {
  spreadsheet: Spreadsheet | null;
  totalRecords: number;
  activeRecords: number;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastSyncTime?: Date | string;
}

export function StatsCards({
  spreadsheet,
  totalRecords,
  activeRecords,
  connectionStatus,
  lastSyncTime,
}: StatsCardsProps) {
  const formatLastSync = (date?: Date | string) => {
    if (!date) return 'Never';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hours ago`;
  };

  const getActivePercentage = () => {
    if (totalRecords === 0) return 0;
    return ((activeRecords / totalRecords) * 100).toFixed(1);
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Live';
      case 'connecting':
        return 'Connecting';
      case 'error':
        return 'Error';
      default:
        return 'Offline';
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6" data-testid="stats-cards">
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Records</p>
              <p className="text-2xl font-bold text-foreground" data-testid="total-records">
                {totalRecords.toLocaleString()}
              </p>
            </div>
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Database className="text-primary" size={16} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2" data-testid="total-records-change">
            {spreadsheet && (
              <span className="text-green-600">
                {spreadsheet.rowCount || 0} from sheet
              </span>
            )}
          </p>
        </CardContent>
      </Card>
      
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Records</p>
              <p className="text-2xl font-bold text-foreground" data-testid="active-records">
                {activeRecords.toLocaleString()}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-600" size={16} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2" data-testid="active-percentage">
            {getActivePercentage()}% of total records
          </p>
        </CardContent>
      </Card>
      
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sync Status</p>
              <p className={`text-2xl font-bold ${getConnectionStatusColor()}`} data-testid="sync-status">
                {getConnectionStatusText()}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <RefreshCw className="text-green-600" size={16} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2" data-testid="last-sync">
            Last sync: {formatLastSync(lastSyncTime)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

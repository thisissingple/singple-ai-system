import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { TrendingUp, TrendingDown, Users, Activity, Calendar, Download } from 'lucide-react';
import { type Spreadsheet, type SheetData } from '@shared/schema';

interface AnalyticsOverviewProps {
  spreadsheet: Spreadsheet | null;
  sheetData: SheetData[];
  totalRecords: number;
  activeRecords: number;
}

// Chart color palette for Apple-style design
const COLORS = [
  'hsl(215, 100%, 50%)',  // Primary Blue
  'hsl(140, 70%, 45%)',   // Green
  'hsl(45, 100%, 55%)',   // Amber
  'hsl(330, 80%, 55%)',   // Pink
  'hsl(260, 85%, 58%)',   // Purple
  'hsl(195, 100%, 50%)',  // Cyan
];

const chartConfig = {
  total: {
    label: "Total",
  },
  active: {
    label: "Active",
  },
  inactive: {
    label: "Inactive",
  },
  data: {
    label: "Data",
  }
};

export function AnalyticsOverview({ 
  spreadsheet, 
  sheetData, 
  totalRecords, 
  activeRecords 
}: AnalyticsOverviewProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');

  // Process data for different visualizations
  const processDataForCharts = () => {
    if (!sheetData || sheetData.length === 0) {
      return {
        statusData: [],
        trendData: [],
        categoryData: [],
        dataSourceData: []
      };
    }

    // Status distribution
    const statusCount: Record<string, number> = {};
    const categoryCount: Record<string, number> = {};
    const membershipCount: Record<string, number> = {};
    const dailyData: Record<string, { date: string; total: number; active: number }> = {};

    sheetData.forEach((row) => {
      const data = row.data;
      
      // Process status
      const status = data.Status || data.status || data.狀態 || 'unknown';
      statusCount[status] = (statusCount[status] || 0) + 1;

      // Process categories
      const category = data.Category || data.category || data.類別 || data.Type || data.type || 'other';
      categoryCount[category] = (categoryCount[category] || 0) + 1;

      // Process data types/sources
      const dataSource = data.DataSource || data.dataSource || data.資料來源 || data.Source || 'general';
      membershipCount[dataSource] = (membershipCount[dataSource] || 0) + 1;

      // Process daily trend (simulated)
      const date = new Date(row.lastUpdated || new Date()).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { date, total: 0, active: 0 };
      }
      dailyData[date].total += 1;
      if (status?.toLowerCase().includes('active') || status?.toLowerCase().includes('正常')) {
        dailyData[date].active += 1;
      }
    });

    return {
      statusData: Object.entries(statusCount).map(([name, value]) => ({ 
        name: name.charAt(0).toUpperCase() + name.slice(1), 
        value, 
        percentage: ((value / totalRecords) * 100).toFixed(1) 
      })),
      trendData: Object.values(dailyData).slice(-7), // Last 7 days
      categoryData: Object.entries(categoryCount).map(([name, value]) => ({ 
        name: name.charAt(0).toUpperCase() + name.slice(1), 
        value 
      })),
      dataSourceData: Object.entries(membershipCount).map(([name, value]) => ({ 
        name: name.charAt(0).toUpperCase() + name.slice(1), 
        value,
        percentage: ((value / totalRecords) * 100).toFixed(1)
      }))
    };
  };

  const { statusData, trendData, categoryData, dataSourceData } = processDataForCharts();

  const inactiveRecords = totalRecords - activeRecords;
  const activePercentage = totalRecords > 0 ? ((activeRecords / totalRecords) * 100).toFixed(1) : '0';
  const growth = trendData.length > 1 && trendData[0].total > 0 ? 
    ((trendData[trendData.length - 1].total - trendData[0].total) / trendData[0].total * 100).toFixed(1) : '0';

  const exportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Type,Name,Value,Percentage\n"
      + statusData.map(item => `Status,${item.name},${item.value},${item.percentage}%`).join("\n")
      + "\n" + categoryData.map(item => `Category,${item.name},${item.value},`).join("\n")
      + "\n" + dataSourceData.map(item => `DataSource,${item.name},${item.value},${item.percentage}%`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analytics-${spreadsheet?.name || 'data'}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!spreadsheet) {
    return (
      <Card className="glass-card dark:glass-card-dark border-0">
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Data Available</h3>
            <p className="text-sm text-muted-foreground">
              Please select a spreadsheet to view analytics
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="analytics-overview">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass-card dark:glass-card-dark border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {totalRecords.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 glass dark:glass-dark rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              {growth !== '0' && (
                <>
                  {parseFloat(growth) > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${parseFloat(growth) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {Math.abs(parseFloat(growth))}%
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">vs last period</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card dark:glass-card-dark border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Records</p>
                <p className="text-3xl font-bold text-green-600">
                  {activeRecords.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 glass dark:glass-dark rounded-xl flex items-center justify-center">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {activePercentage}% Active
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card dark:glass-card-dark border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Categories</p>
                <p className="text-3xl font-bold text-purple-600">
                  {categoryData.length}
                </p>
              </div>
              <div className="w-12 h-12 glass dark:glass-dark rounded-xl flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-sm text-muted-foreground">
                {categoryData.length > 0 ? `${Math.round(totalRecords / categoryData.length)} avg per category` : 'No categories'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card dark:glass-card-dark border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Sync</p>
                <p className="text-lg font-bold text-foreground">
                  {spreadsheet.lastSyncAt ? 
                    new Date(spreadsheet.lastSyncAt).toLocaleDateString() : 
                    'Never'
                  }
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={exportData}
                className="glass dark:glass-dark hover:bg-primary/10"
                data-testid="export-data"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center mt-4">
              <span className="text-sm text-muted-foreground">
                {spreadsheet.lastSyncAt ? 
                  `${Math.round((Date.now() - new Date(spreadsheet.lastSyncAt).getTime()) / (1000 * 60 * 60))}h ago` : 
                  'Click refresh to sync'
                }
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="glass dark:glass-dark border-0">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="datasource">數據來源</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <Card className="glass-card dark:glass-card-dark border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Status Distribution
                </CardTitle>
                <CardDescription>
                  Breakdown of record statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {statusData.slice(0, 4).map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-sm text-muted-foreground ml-auto">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card className="glass-card dark:glass-card-dark border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  Category Breakdown
                </CardTitle>
                <CardDescription>
                  Distribution across categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={categoryData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="hsl(260, 85%, 58%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card className="glass-card dark:glass-card-dark border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Data Trends
              </CardTitle>
              <CardDescription>
                Total and active records over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[400px]">
                <AreaChart data={trendData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stackId="1"
                    stroke="hsl(215, 100%, 50%)" 
                    fill="hsl(215, 100%, 50%)" 
                    fillOpacity={0.6} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="active" 
                    stackId="2"
                    stroke="hsl(140, 70%, 45%)" 
                    fill="hsl(140, 70%, 45%)" 
                    fillOpacity={0.8} 
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-6">
          <Card className="glass-card dark:glass-card-dark border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Active vs Inactive Distribution
              </CardTitle>
              <CardDescription>
                Current status breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[400px]">
                <BarChart 
                  data={[
                    { name: 'Active', value: activeRecords, color: 'hsl(140, 70%, 45%)' },
                    { name: 'Inactive', value: inactiveRecords, color: 'hsl(0, 70%, 55%)' }
                  ]}
                  layout="horizontal"
                >
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(140, 70%, 45%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="datasource" className="space-y-6">
          <Card className="glass-card dark:glass-card-dark border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                數據來源分佈
              </CardTitle>
              <CardDescription>
                不同數據來源的分佈情況
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <PieChart>
                    <Pie
                      data={dataSourceData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                    >
                      {dataSourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
                
                <div className="space-y-4">
                  {dataSourceData.map((item, index) => (
                    <div key={item.name} className="glass dark:glass-dark rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <Badge variant="outline">{item.percentage}%</Badge>
                      </div>
                      <div className="text-2xl font-bold text-foreground">{item.value}</div>
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300" 
                          style={{ 
                            width: `${item.percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
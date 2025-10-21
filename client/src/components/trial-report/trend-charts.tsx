/**
 * Trend Charts Component
 * Visualizes funnel data, trend lines, and category breakdowns using recharts
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type {
  TrendDataPoint,
  FunnelDataPoint,
  CategoryBreakdown,
  PeriodType,
} from '@/types/trial-report';

interface TrendChartsProps {
  trendData: TrendDataPoint[];
  funnelData: FunnelDataPoint[];
  categoryBreakdown: CategoryBreakdown[];
  period: PeriodType;
}

export function TrendCharts({
  trendData,
  funnelData,
  categoryBreakdown,
  period,
}: TrendChartsProps) {
  // Format X-axis labels based on period
  const formatXAxis = (value: string) => {
    if (period === 'daily' && value.includes(':')) {
      return value; // Hour format
    }
    if (value.includes('-')) {
      const parts = value.split('-');
      return `${parts[1]}/${parts[2]}`; // MM/DD format
    }
    return value;
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Funnel Chart */}
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle>轉換漏斗</CardTitle>
          <CardDescription>從體驗課到成交的轉換流程</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={funnelData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="stage" type="category" />
              <Tooltip
                formatter={(value: number) => [`${value} 人`, '數量']}
                labelStyle={{ color: '#333' }}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {funnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle>課程類別分布</CardTitle>
          <CardDescription>各類型課程的學生人數</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={categoryBreakdown}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value: number, name: string, props: any) => [
                  `${value} 人 (${props.payload.percentage}%)`,
                  '學生數',
                ]}
                labelStyle={{ color: '#333' }}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Trend Line Chart */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>趨勢分析</CardTitle>
          <CardDescription>
            {period === 'daily'
              ? '當日各時段數據變化'
              : period === 'weekly'
              ? '本週每日數據趨勢'
              : '本月每日數據趨勢'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart
              data={trendData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorTrials" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                angle={period === 'monthly' ? -45 : 0}
                textAnchor={period === 'monthly' ? 'end' : 'middle'}
                height={period === 'monthly' ? 60 : 30}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                labelStyle={{ color: '#333' }}
                formatter={(value: number, name: string) => {
                  if (name === 'revenue') return [`NT$ ${value.toLocaleString()}`, '收入'];
                  if (name === 'trials') return [value, '體驗課'];
                  if (name === 'conversions') return [value, '轉換數'];
                  return [value, name];
                }}
              />
              <Legend
                formatter={(value: string) => {
                  if (value === 'trials') return '體驗課數';
                  if (value === 'conversions') return '轉換數';
                  if (value === 'revenue') return '收入';
                  return value;
                }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="trials"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorTrials)"
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="conversions"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorConversions)"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke="#f59e0b"
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Contact Rate Line Chart */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>聯繫率趨勢</CardTitle>
          <CardDescription>體驗課後的學生聯繫成功率</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={trendData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                angle={period === 'monthly' ? -45 : 0}
                textAnchor={period === 'monthly' ? 'end' : 'middle'}
                height={period === 'monthly' ? 60 : 30}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)}%`, '聯繫率']}
                labelStyle={{ color: '#333' }}
              />
              <Line
                type="monotone"
                dataKey="contactRate"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

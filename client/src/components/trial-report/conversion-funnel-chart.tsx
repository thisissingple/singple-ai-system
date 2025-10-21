/**
 * Conversion Funnel Chart Component
 * Displays the conversion funnel from trial class to deal
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { FunnelDataPoint } from '@/types/trial-report';

interface ConversionFunnelChartProps {
  funnelData: FunnelDataPoint[];
}

export function ConversionFunnelChart({ funnelData }: ConversionFunnelChartProps) {
  if (!funnelData || funnelData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>轉換漏斗</CardTitle>
          <CardDescription>從未開始到已轉高的轉換流程</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            暫無資料
          </div>
        </CardContent>
      </Card>
    );
  }

  // 找出最後一個階段的流失學生數
  const lastStage = funnelData[funnelData.length - 1];
  const lostStudents = lastStage?.lostStudents || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>轉換漏斗</CardTitle>
        <CardDescription>從未開始到已轉高的轉換流程</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
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
        </div>

        {lostStudents > 0 && (
          <div className="flex items-center justify-end gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            <span className="text-xs uppercase tracking-wide text-red-500">流失學生（未轉高）</span>
            <span className="text-lg font-bold">{lostStudents} 人</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

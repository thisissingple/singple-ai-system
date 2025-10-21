/**
 * Course Category Chart Component
 * Displays the distribution of students across different course categories
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { CategoryBreakdown } from '@/types/trial-report';

interface CourseCategoryChartProps {
  categoryBreakdown: CategoryBreakdown[];
}

export function CourseCategoryChart({ categoryBreakdown }: CourseCategoryChartProps) {
  if (!categoryBreakdown || categoryBreakdown.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>課程類別分布</CardTitle>
          <CardDescription>各類型課程的學生人數</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            暫無資料
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>課程類別分布</CardTitle>
        <CardDescription>各類型課程的學生人數與佔比</CardDescription>
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
              formatter={(value: number) => [`${value} 人`, '學生人數']}
              labelFormatter={(label) => {
                const category = categoryBreakdown.find(c => c.name === label);
                return `${label}${category ? ` (${category.percentage.toFixed(1)}%)` : ''}`;
              }}
            />
            <Legend />
            <Bar dataKey="value" fill="hsl(var(--chart-2))" name="學生人數" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

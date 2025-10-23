/**
 * 上課打卡記錄組件
 * 設計風格: 簡潔表格式
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar } from 'lucide-react';
import { format, parseISO, isToday, isYesterday, differenceInDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import type { TeacherClassRecord } from './teacher-insights';

interface AttendanceLogProps {
  classRecords: TeacherClassRecord[];
  maxRecords?: number;
}

export function AttendanceLog({ classRecords, maxRecords = 20 }: AttendanceLogProps) {
  // 按日期排序（最新的在前）
  const sortedRecords = [...classRecords]
    .filter(record => record.classDate)
    .sort((a, b) => {
      const dateA = a.classDate ? new Date(a.classDate) : new Date(0);
      const dateB = b.classDate ? new Date(b.classDate) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, maxRecords);

  // 格式化相對日期
  const formatRelativeDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (isToday(date)) return '今天';
      if (isYesterday(date)) return '昨天';
      const daysAgo = differenceInDays(new Date(), date);
      if (daysAgo <= 7) return `${daysAgo} 天前`;
      return format(date, 'MM/dd', { locale: zhTW });
    } catch {
      return dateString;
    }
  };

  if (sortedRecords.length === 0) {
    return (
      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            最近上課記錄
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-400">
            <p className="text-xs">尚無上課記錄</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200 shadow-sm bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            最近上課記錄
          </CardTitle>
          <span className="text-xs text-gray-500">
            最近 {sortedRecords.length} 筆
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[80px] h-8 text-xs">日期</TableHead>
              <TableHead className="w-[100px] h-8 text-xs">教師</TableHead>
              <TableHead className="h-8 text-xs">學生</TableHead>
              <TableHead className="w-[100px] h-8 text-xs">狀態</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRecords.map((record) => (
              <TableRow key={record.id} className="h-10 hover:bg-gray-50">
                {/* 日期 */}
                <TableCell className="py-2 text-xs text-gray-600">
                  {record.classDate && formatRelativeDate(record.classDate)}
                </TableCell>

                {/* 教師 */}
                <TableCell className="py-2 text-xs text-gray-700">
                  {record.teacherName || '未分配'}
                </TableCell>

                {/* 學生 */}
                <TableCell className="py-2 text-sm text-gray-900">
                  {record.studentName || '未命名'}
                </TableCell>

                {/* 狀態 */}
                <TableCell className="py-2">
                  {record.status ? (
                    <span
                      className={`text-xs px-2 py-1 rounded-full inline-block ${
                        record.status === '已完成' || record.status === '出席'
                          ? 'bg-green-50 text-green-700'
                          : record.status === '缺席'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {record.status}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* 總記錄數提示 */}
        {classRecords.length > maxRecords && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              顯示最近 {maxRecords} 筆，共 {classRecords.length} 筆記錄
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

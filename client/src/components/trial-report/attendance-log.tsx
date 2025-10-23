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

export function AttendanceLog({ classRecords, maxRecords = 40 }: AttendanceLogProps) {
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
      <CardHeader className="pb-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            最近上課記錄
          </CardTitle>
          <span className="text-[10px] text-gray-500">
            最近 {sortedRecords.length} 筆
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="overflow-hidden -mx-3">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-gray-200">
                <TableHead className="w-[60px] h-6 text-[10px] px-2 py-1 font-medium">日期</TableHead>
                <TableHead className="w-[65px] h-6 text-[10px] px-2 py-1 font-medium">教師</TableHead>
                <TableHead className="h-6 text-[10px] px-2 py-1 font-medium">學生</TableHead>
                <TableHead className="w-[70px] h-6 text-[10px] px-2 py-1 text-center font-medium">狀態</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRecords.map((record) => (
                <TableRow key={record.id} className="h-5 hover:bg-gray-50 border-b border-gray-100">
                  {/* 日期 */}
                  <TableCell className="px-2 py-0.5 text-[11px] text-gray-600 w-[60px]">
                    {record.classDate && formatRelativeDate(record.classDate)}
                  </TableCell>

                  {/* 教師 */}
                  <TableCell className="px-2 py-0.5 text-[11px] text-gray-700 w-[65px]">
                    {record.teacherName || '未分配'}
                  </TableCell>

                  {/* 學生 */}
                  <TableCell className="px-2 py-0.5 text-[11px] text-gray-900 font-medium">
                    {record.studentName || '未命名'}
                  </TableCell>

                  {/* 狀態 */}
                  <TableCell className="px-2 py-0.5 w-[70px] text-center">
                    {record.status ? (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded inline-block ${
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
                      <span className="text-[10px] text-gray-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* 總記錄數提示 */}
        {classRecords.length > maxRecords && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-[10px] text-gray-500 text-center">
              顯示最近 {maxRecords} 筆，共 {classRecords.length} 筆記錄
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

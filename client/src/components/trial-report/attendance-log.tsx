/**
 * 上課打卡記錄組件
 * 設計風格: 清單式表格（參考學生跟進頁面）
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, GraduationCap } from 'lucide-react';
import { format, parseISO, isToday, isYesterday, differenceInDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import type { TeacherClassRecord } from './teacher-insights';

interface AttendanceLogProps {
  classRecords: TeacherClassRecord[];
  maxRecords?: number;
}

export function AttendanceLog({ classRecords, maxRecords = 40 }: AttendanceLogProps) {
  const [displayCount, setDisplayCount] = useState<number>(maxRecords);

  // 按日期排序並限制數量
  const sortedRecords = [...classRecords]
    .filter(record => record.classDate)
    .sort((a, b) => {
      const dateA = a.classDate ? new Date(a.classDate) : new Date(0);
      const dateB = b.classDate ? new Date(b.classDate) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, displayCount);

  // 格式化日期時間
  const formatDateTime = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (isToday(date)) {
        return `今天 ${format(date, 'HH:mm')}`;
      }
      if (isYesterday(date)) {
        return `昨天 ${format(date, 'HH:mm')}`;
      }
      const daysAgo = differenceInDays(new Date(), date);
      if (daysAgo <= 7) {
        return `${daysAgo}天前 ${format(date, 'HH:mm')}`;
      }
      return format(date, 'MM/dd HH:mm', { locale: zhTW });
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
            <p className="text-sm">尚無上課記錄</p>
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
            <span className="text-xs font-normal text-gray-500">({classRecords.length} 筆)</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">顯示</span>
            <Select
              value={displayCount.toString()}
              onValueChange={(value) => setDisplayCount(Number(value))}
            >
              <SelectTrigger className="h-7 w-20 text-xs border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 筆</SelectItem>
                <SelectItem value="50">50 筆</SelectItem>
                <SelectItem value="75">75 筆</SelectItem>
                <SelectItem value="100">100 筆</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">上課時間</TableHead>
              <TableHead>教師</TableHead>
              <TableHead>學生</TableHead>
              <TableHead className="w-24">狀態</TableHead>
              <TableHead>課程主題</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRecords.map((record) => (
              <TableRow key={record.id}>
                {/* 上課時間 */}
                <TableCell>
                  {record.classDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDateTime(record.classDate)}
                    </div>
                  )}
                </TableCell>

                {/* 教師 */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">{record.teacherName || '未分配'}</span>
                  </div>
                </TableCell>

                {/* 學生 */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{record.studentName || '未命名'}</span>
                  </div>
                </TableCell>

                {/* 狀態 */}
                <TableCell>
                  {record.status && (
                    <Badge variant={
                      record.status === '已完成' || record.status === '出席' ? 'default' :
                      record.status === '缺席' || record.status === '放鳥' ? 'destructive' :
                      'secondary'
                    }>
                      {record.status}
                    </Badge>
                  )}
                </TableCell>

                {/* 課程主題 */}
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {record.topic || '-'}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* 總記錄數提示 */}
        {classRecords.length > displayCount && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-muted-foreground text-center">
              顯示前 {displayCount} 筆，共 {classRecords.length} 筆記錄
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

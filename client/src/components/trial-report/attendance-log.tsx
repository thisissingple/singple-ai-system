/**
 * 上課打卡記錄組件
 * 設計風格: Apple/Notion 極簡風 - 灰階 + 橘色強調
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar, User, GraduationCap } from 'lucide-react';
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

  if (sortedRecords.length === 0) {
    return (
      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            最近上課記錄
          </CardTitle>
          <CardDescription className="text-sm text-gray-500">
            顯示最近 {maxRecords} 筆上課打卡記錄
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">尚無上課記錄</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 格式化日期顯示
  const formatRelativeDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (isToday(date)) {
        return '今天';
      } else if (isYesterday(date)) {
        return '昨天';
      } else {
        const daysAgo = differenceInDays(new Date(), date);
        if (daysAgo <= 7) {
          return `${daysAgo} 天前`;
        } else {
          return format(date, 'MM/dd', { locale: zhTW });
        }
      }
    } catch {
      return dateString;
    }
  };

  return (
    <Card className="border border-gray-200 shadow-sm bg-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-400" />
          最近上課記錄
        </CardTitle>
        <CardDescription className="text-sm text-gray-500">
          顯示最近 {maxRecords} 筆上課打卡記錄
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {sortedRecords.map((record, index) => (
            <div
              key={record.id}
              className="flex items-center gap-4 py-3 px-2 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              {/* 日期時間 */}
              <div className="flex items-center gap-2 w-24 flex-shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                <span className="text-xs text-gray-500 font-medium">
                  {record.classDate && formatRelativeDate(record.classDate)}
                </span>
              </div>

              {/* 教師 */}
              <div className="flex items-center gap-1.5 w-20 flex-shrink-0">
                <User className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-sm text-gray-700 truncate">
                  {record.teacherName || '未分配'}
                </span>
              </div>

              {/* 學生 */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <GraduationCap className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-900 truncate">
                  {record.studentName || '未命名'}
                </span>
              </div>

              {/* 課程主題（選填） */}
              {record.topic && (
                <span className="text-xs text-gray-500 px-2 py-1 rounded-full bg-gray-100 truncate max-w-[120px]">
                  {record.topic}
                </span>
              )}

              {/* 狀態（選填） */}
              {record.status && (
                <span
                  className={`text-xs px-2 py-1 rounded-full truncate ${
                    record.status === '已完成' || record.status === '出席'
                      ? 'bg-green-50 text-green-700'
                      : record.status === '缺席'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {record.status}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* 顯示總記錄數 */}
        {classRecords.length > maxRecords && (
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              顯示最近 {maxRecords} 筆，共 {classRecords.length} 筆記錄
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

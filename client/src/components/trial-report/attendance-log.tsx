/**
 * 上課打卡記錄組件
 * 設計風格: Notion 風格日期分組卡片
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import { format, parseISO, isToday, isYesterday, differenceInDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import type { TeacherClassRecord } from './teacher-insights';

interface AttendanceLogProps {
  classRecords: TeacherClassRecord[];
  maxRecords?: number;
}

interface GroupedRecords {
  date: string;
  displayDate: string;
  records: TeacherClassRecord[];
}

export function AttendanceLog({ classRecords, maxRecords = 40 }: AttendanceLogProps) {
  const [displayCount, setDisplayCount] = useState<number>(maxRecords);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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

  // 按日期分組
  const groupedRecords = useMemo(() => {
    const sorted = [...classRecords]
      .filter(record => record.classDate)
      .sort((a, b) => {
        const dateA = a.classDate ? new Date(a.classDate) : new Date(0);
        const dateB = b.classDate ? new Date(b.classDate) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

    const groups: GroupedRecords[] = [];
    const dateMap = new Map<string, TeacherClassRecord[]>();

    sorted.forEach(record => {
      if (!record.classDate) return;
      const dateKey = record.classDate.split('T')[0]; // YYYY-MM-DD
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(record);
    });

    dateMap.forEach((records, dateKey) => {
      groups.push({
        date: dateKey,
        displayDate: formatRelativeDate(dateKey),
        records,
      });
    });

    // 限制總記錄數
    let count = 0;
    const limitedGroups: GroupedRecords[] = [];
    for (const group of groups) {
      if (count >= displayCount) break;
      const remaining = displayCount - count;
      limitedGroups.push({
        ...group,
        records: group.records.slice(0, remaining),
      });
      count += group.records.length;
    }

    return limitedGroups;
  }, [classRecords, displayCount]);

  const toggleGroup = (date: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(date)) {
      newCollapsed.delete(date);
    } else {
      newCollapsed.add(date);
    }
    setCollapsedGroups(newCollapsed);
  };

  if (groupedRecords.length === 0) {
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
      <CardContent className="space-y-4">
        {groupedRecords.map((group) => {
          const isCollapsed = collapsedGroups.has(group.date);

          return (
            <div key={group.date} className="space-y-2">
              {/* 日期標題（可折疊） */}
              <button
                onClick={() => toggleGroup(group.date)}
                className="flex items-center gap-2 w-full text-left hover:bg-gray-50 px-2 py-1 rounded transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {group.displayDate}
                </span>
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400">{group.records.length} 筆</span>
              </button>

              {/* 卡片網格 */}
              {!isCollapsed && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                  {group.records.map((record) => {
                    // 格式化完整日期時間
                    const fullDateTime = record.classDate
                      ? format(parseISO(record.classDate), 'yyyy/MM/dd HH:mm', { locale: zhTW })
                      : '';

                    return (
                      <div
                        key={record.id}
                        className="border border-gray-200 rounded-lg p-3 hover:shadow-sm hover:border-gray-300 transition-all bg-white"
                      >
                        {/* 頂部：日期時間 */}
                        {fullDateTime && (
                          <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-gray-100">
                            <span className="text-[10px] text-gray-500 font-mono">
                              📅 {fullDateTime}
                            </span>
                          </div>
                        )}

                        {/* 教師名稱 */}
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                          <span className="text-xs font-medium text-gray-900">
                            {record.teacherName || '未分配'}
                          </span>
                        </div>

                        {/* 學生名稱 */}
                        <div className="flex items-center gap-1.5 mb-3">
                          <span className="text-gray-400">→</span>
                          <span className="text-sm font-medium text-gray-900">
                            {record.studentName || '未命名'}
                          </span>
                        </div>

                        {/* 底部資訊區 */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          {/* 狀態標籤 */}
                          {record.status && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full inline-block font-medium ${
                                record.status === '已完成' || record.status === '出席'
                                  ? 'bg-green-50 text-green-700 border border-green-200'
                                  : record.status === '缺席' || record.status === '放鳥'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : record.status === '未開始'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-gray-100 text-gray-700 border border-gray-200'
                              }`}
                            >
                              {record.status === '已完成' || record.status === '出席' ? '✓' :
                               record.status === '缺席' || record.status === '放鳥' ? '✗' :
                               record.status === '未開始' ? '○' : '•'} {record.status}
                            </span>
                          )}

                          {/* 課程主題（如果有） */}
                          {record.topic && (
                            <span className="text-[10px] text-gray-500 truncate max-w-[100px]" title={record.topic}>
                              {record.topic}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* 總記錄數提示 */}
        {classRecords.length > displayCount && (
          <div className="pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              顯示前 {displayCount} 筆，共 {classRecords.length} 筆記錄
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

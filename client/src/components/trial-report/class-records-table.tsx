/**
 * 體驗課上課記錄表
 * 顯示每次上課的詳細記錄（一堂課一筆）
 */

import { useState, useMemo } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Calendar, User, GraduationCap, Search, X, FileText, Download, AlertCircle } from 'lucide-react';
import { format, parseISO, isToday, isYesterday, differenceInDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';

export interface ClassRecord {
  id: string;
  classDate: string;
  teacherName: string;
  studentName: string;
  studentEmail: string;
  status?: string;
  topic?: string;
  classTranscript?: string;  // 課程文字檔
  noConversionReason?: string;  // 未轉單原因
}

interface ClassRecordsTableProps {
  classRecords: ClassRecord[];
}

export function ClassRecordsTable({ classRecords }: ClassRecordsTableProps) {
  const [displayCount, setDisplayCount] = useState<number>(50);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [teacherFilter, setTeacherFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [transcriptDialog, setTranscriptDialog] = useState<{
    open: boolean;
    content: string;
    studentName: string;
    date: string;
  }>({
    open: false,
    content: '',
    studentName: '',
    date: '',
  });

  // 格式化日期時間
  const formatDateTime = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (isToday(date)) return `今天 ${format(date, 'HH:mm')}`;
      if (isYesterday(date)) return `昨天 ${format(date, 'HH:mm')}`;
      const daysAgo = differenceInDays(new Date(), date);
      if (daysAgo <= 7) return `${daysAgo}天前 ${format(date, 'HH:mm')}`;
      return format(date, 'MM/dd HH:mm', { locale: zhTW });
    } catch {
      return dateString;
    }
  };

  // 獲取所有教師列表
  const teacherList = useMemo(() => {
    const teachers = new Set<string>();
    classRecords.forEach(record => {
      if (record.teacherName && record.teacherName !== '未分配') {
        teachers.add(record.teacherName);
      }
    });
    return Array.from(teachers).sort();
  }, [classRecords]);

  // 獲取所有狀態列表
  const statusList = useMemo(() => {
    const statuses = new Set<string>();
    classRecords.forEach(record => {
      if (record.status) {
        statuses.add(record.status);
      }
    });
    return Array.from(statuses).sort();
  }, [classRecords]);

  // 篩選記錄
  const filteredRecords = useMemo(() => {
    let filtered = classRecords.filter(record => {
      // 搜尋篩選（學生姓名或 Email）
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = record.studentName?.toLowerCase().includes(query);
        const matchEmail = record.studentEmail?.toLowerCase().includes(query);
        if (!matchName && !matchEmail) return false;
      }

      // 教師篩選
      if (teacherFilter !== 'all' && record.teacherName !== teacherFilter) {
        return false;
      }

      // 狀態篩選
      if (statusFilter !== 'all' && record.status !== statusFilter) {
        return false;
      }

      // 日期範圍篩選
      if (startDate || endDate) {
        if (!record.classDate) return false;
        if (startDate && record.classDate < startDate) return false;
        if (endDate && record.classDate > endDate) return false;
      }

      return true;
    });

    // 按日期降序排序（最新的在最上面）
    const sorted = filtered.sort((a, b) => {
      const dateA = a.classDate ? new Date(a.classDate) : new Date(0);
      const dateB = b.classDate ? new Date(b.classDate) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    return sorted.slice(0, displayCount);
  }, [classRecords, searchQuery, teacherFilter, statusFilter, startDate, endDate, displayCount]);

  // 清除篩選
  const clearFilters = () => {
    setSearchQuery('');
    setTeacherFilter('all');
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = searchQuery || teacherFilter !== 'all' || statusFilter !== 'all' || startDate || endDate;

  // 處理文字檔下載
  const handleDownloadTranscript = (content: string, studentName: string, date: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `課程文字檔_${studentName}_${date}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (classRecords.length === 0) {
    return (
      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">
            體驗課上課記錄表
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
    <>
      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-900">
              體驗課上課記錄表
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({filteredRecords.length} / {classRecords.length} 筆)
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">顯示</span>
              <Select
                value={displayCount.toString()}
                onValueChange={(value) => setDisplayCount(Number(value))}
              >
                <SelectTrigger className="h-8 w-24 text-xs border-gray-300">
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
          {/* 篩選器 */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* 搜尋框 */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                type="text"
                placeholder="搜尋學生姓名或 Email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[240px] h-9 text-sm pl-8"
              />
            </div>

            {/* 教師篩選 */}
            <Select value={teacherFilter} onValueChange={setTeacherFilter}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="篩選教師" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部教師</SelectItem>
                {teacherList.map((teacher) => (
                  <SelectItem key={teacher} value={teacher}>
                    {teacher}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 狀態篩選 */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="篩選狀態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部狀態</SelectItem>
                {statusList.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 日期篩選 */}
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[140px] h-9 text-sm"
                placeholder="開始日期"
              />
              <span className="text-xs text-gray-400">至</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[140px] h-9 text-sm"
                placeholder="結束日期"
              />
            </div>

            {/* 清除篩選 */}
            {hasActiveFilters && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearFilters}
                className="h-9 px-3"
                title="清除所有篩選"
              >
                <X className="h-4 w-4 mr-1" />
                <span className="text-xs">清除</span>
              </Button>
            )}
          </div>

          {/* 表格 */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">上課時間</TableHead>
                  <TableHead>教師</TableHead>
                  <TableHead>學生</TableHead>
                  <TableHead className="w-24">狀態</TableHead>
                  <TableHead>課程主題</TableHead>
                  <TableHead className="w-24 text-center">文字檔</TableHead>
                  <TableHead>未轉單原因</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record, index) => (
                  <TableRow key={record.id}>
                    {/* 上課時間 */}
                    <TableCell>
                      {record.classDate ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDateTime(record.classDate)}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
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
                      <div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{record.studentName || '未命名'}</span>
                        </div>
                        <div className="text-xs text-muted-foreground ml-6">
                          {record.studentEmail}
                        </div>
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

                    {/* 文字檔 */}
                    <TableCell className="text-center">
                      {record.classTranscript ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setTranscriptDialog({
                                    open: true,
                                    content: record.classTranscript || '',
                                    studentName: record.studentName,
                                    date: record.classDate,
                                  });
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <FileText className="h-4 w-4 text-green-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">點擊預覽文字檔</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </TableCell>

                    {/* 未轉單原因 */}
                    <TableCell>
                      {record.noConversionReason ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 cursor-help">
                                <AlertCircle className="h-4 w-4 text-orange-500" />
                                <span className="text-sm text-gray-700 truncate max-w-[200px]">
                                  {record.noConversionReason}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md">
                              <p className="text-xs whitespace-pre-wrap">{record.noConversionReason}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredRecords.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              目前沒有符合條件的上課記錄
            </div>
          )}

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

      {/* 文字檔預覽對話框 */}
      <Dialog open={transcriptDialog.open} onOpenChange={(open) => setTranscriptDialog({ ...transcriptDialog, open })}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>課程文字檔</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  handleDownloadTranscript(
                    transcriptDialog.content,
                    transcriptDialog.studentName,
                    transcriptDialog.date
                  );
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                下載
              </Button>
            </DialogTitle>
            <DialogDescription>
              學生：{transcriptDialog.studentName} | 日期：{transcriptDialog.date}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">
              {transcriptDialog.content}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

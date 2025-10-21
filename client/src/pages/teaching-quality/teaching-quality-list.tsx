/**
 * 教學品質追蹤系統 - 主列表頁面
 * 顯示所有學生的教學品質分析記錄，可按老師篩選
 * 自動從 trial_class_attendance.class_transcript 取得逐字稿進行分析
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { sidebarConfig } from '@/config/sidebar-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, TrendingUp, TrendingDown, Target, Eye, RefreshCw, Wand2 } from 'lucide-react';

interface StudentAnalysisRecord {
  id: string | null; // analysis ID (null if not analyzed yet)
  student_name: string;
  teacher_name: string;
  class_date: string;
  overall_score: number | null;

  // Brief summaries for list view
  strengths_summary: string | null;
  weaknesses_summary: string | null;
  suggestions_summary: string | null;

  // Full data
  strengths: Array<{ point: string; evidence: string }>;
  weaknesses: Array<{ point: string; evidence: string }>;
  suggestions: Array<{ suggestion: string; priority: number }>;

  // Purchase info
  package_name: string | null;
  remaining_classes: string | null;
  conversion_status: 'converted' | 'not_converted' | 'pending' | null;

  has_transcript: boolean;
  attendance_id: string;
}

interface Teacher {
  name: string;
  count: number;
}

export default function TeachingQualityList() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [records, setRecords] = useState<StudentAnalysisRecord[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [analyzingIds, setAnalyzingIds] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, [selectedTeacher]);

  const fetchData = async (options: { showLoader?: boolean } = {}) => {
    if (options.showLoader !== false) {
      setIsLoading(true);
    }
    try {
      // Fetch student records with analysis status
      const params = new URLSearchParams();
      if (selectedTeacher !== 'all') {
        params.append('teacher', selectedTeacher);
      }

      const response = await fetch(`/api/teaching-quality/student-records?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch student records');
      }

      const data = await response.json();
      setRecords(data.data.records || []);
      setTeachers(data.data.teachers || []);
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      toast({
        title: '載入失敗',
        description: error.message || '無法載入教學品質記錄',
        variant: 'destructive'
      });
    } finally {
      if (options.showLoader !== false) {
        setIsLoading(false);
      }
    }
  };

  // Removed auto-refresh - users can manually refresh using the button

  const startAnalyzing = (attendanceId: string) => {
    setAnalyzingIds((prev) => (prev.includes(attendanceId) ? prev : [...prev, attendanceId]));
  };

  const finishAnalyzing = (attendanceId: string) => {
    setAnalyzingIds((prev) => prev.filter((id) => id !== attendanceId));
  };

  const handleManualAnalyze = async (record: StudentAnalysisRecord) => {
    if (!record.has_transcript) {
      toast({
        title: '無逐字稿',
        description: '這筆記錄沒有逐字稿，無法進行分析',
        variant: 'destructive'
      });
      return;
    }

    startAnalyzing(record.attendance_id);
    try {
      const response = await fetch(`/api/teaching-quality/analyze-single/${record.attendance_id}`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '分析失敗，請稍後再試');
      }

      toast({
        title: '分析完成',
        description: `${record.student_name} 的課程分析已生成`
      });

      await fetchData({ showLoader: false });
    } catch (error: any) {
      console.error('Manual analysis failed:', error);
      toast({
        title: '分析失敗',
        description: error.message || '發生未知錯誤',
        variant: 'destructive'
      });
    } finally {
      finishAnalyzing(record.attendance_id);
    }
  };

  const getScoreBadgeColor = (score: number | null) => {
    if (!score) return 'bg-gray-500';
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const content = () => (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">教學品質追蹤系統</h1>
          <p className="text-muted-foreground mt-2">
            手動觸發分析每位學生的上課記錄 • 即時追蹤教學品質和改進建議
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          重新整理
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>篩選選項</CardTitle>
          <CardDescription>選擇老師查看其學生記錄 • 需要時點擊「手動分析」生成結果</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇老師" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部老師 ({teachers.reduce((sum, t) => sum + t.count, 0)} 筆)</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.name} value={teacher.name}>
                      {teacher.name} ({teacher.count} 筆)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              共 {records.length} 筆記錄
              {records.filter(r => r.id).length > 0 && (
                <span className="ml-2">
                  • 已分析 {records.filter(r => r.id).length} 筆
                </span>
              )}
              {records.filter(r => !r.id && r.has_transcript).length > 0 && (
                <span className="ml-2 text-orange-600">
                  • 待分析 {records.filter(r => !r.id && r.has_transcript).length} 筆
                </span>
              )}
              {records.filter(r => !r.id && !r.has_transcript).length > 0 && (
                <span className="ml-2 text-gray-400">
                  • 無逐字稿 {records.filter(r => !r.id && !r.has_transcript).length} 筆
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>學員銷售分析記錄</CardTitle>
          <CardDescription>
            {selectedTeacher === 'all'
              ? '顯示所有老師的銷售分析記錄'
              : `顯示 ${selectedTeacher} 的銷售分析記錄`} • 需要時手動啟動 AI 產出痛點、動機與成交策略
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">載入中...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">目前沒有記錄</p>
              <p className="text-sm mt-2">
                系統會自動從 Google Sheets 同步上課記錄
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">學員姓名</TableHead>
                    <TableHead className="whitespace-nowrap">諮詢師/老師</TableHead>
                    <TableHead className="whitespace-nowrap">體驗課日期</TableHead>
                    <TableHead className="text-center whitespace-nowrap">成交機率</TableHead>
                    <TableHead className="whitespace-nowrap">學員狀況</TableHead>
                    <TableHead className="whitespace-nowrap">痛點分析</TableHead>
                    <TableHead className="whitespace-nowrap">成交話術</TableHead>
                    <TableHead className="whitespace-nowrap">方案名稱</TableHead>
                    <TableHead className="whitespace-nowrap">剩餘堂數</TableHead>
                    <TableHead className="whitespace-nowrap">轉單狀態</TableHead>
                    <TableHead className="text-right whitespace-nowrap">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.attendance_id}>
                      <TableCell className="font-medium">{record.student_name}</TableCell>
                      <TableCell>{record.teacher_name}</TableCell>
                      <TableCell>{formatDate(record.class_date)}</TableCell>
                      <TableCell className="text-center">
                        {record.id ? (
                          <Badge className={getScoreBadgeColor(record.overall_score)}>
                            {record.overall_score}/10
                          </Badge>
                        ) : record.has_transcript ? (
                          <Badge
                            variant="outline"
                            className={`border-orange-500 text-orange-600 ${
                              analyzingIds.includes(record.attendance_id) ? 'opacity-80' : ''
                            }`}
                          >
                            {analyzingIds.includes(record.attendance_id) ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                分析中
                              </>
                            ) : (
                              '待分析'
                            )}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-400">
                            無逐字稿
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {record.id && record.strengths_summary ? (
                          <div className="text-xs text-green-700 truncate" title={record.strengths_summary}>
                            {record.strengths_summary}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {record.id && record.weaknesses_summary ? (
                          <div className="text-xs text-orange-700 truncate" title={record.weaknesses_summary}>
                            {record.weaknesses_summary}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {record.id && record.suggestions_summary ? (
                          <div className="text-xs text-blue-700 truncate" title={record.suggestions_summary}>
                            {record.suggestions_summary}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.package_name ? (
                          <span className="text-xs">{record.package_name}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">未購課</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.package_name && record.remaining_classes ? (
                          <Badge variant="outline" className="text-blue-600">
                            {record.remaining_classes}
                          </Badge>
                        ) : record.package_name ? (
                          <Badge variant="default" className="bg-green-600">
                            已轉高
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.id ? (
                          <Badge variant="outline" className="text-purple-600">
                            85%
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {record.id ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/teaching-quality/${record.id}`)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            查看詳情
                          </Button>
                        ) : record.has_transcript ? (
                          <Button
                            size="sm"
                            onClick={() => handleManualAnalyze(record)}
                            disabled={analyzingIds.includes(record.attendance_id)}
                          >
                            {analyzingIds.includes(record.attendance_id) ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                分析中…
                              </>
                            ) : (
                              <>
                                <Wand2 className="h-3 w-3 mr-1" />
                                手動分析
                              </>
                            )}
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">無逐字稿</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <DashboardLayout
      sidebarSections={sidebarConfig}
      title="教學品質追蹤"
    >
      {content()}
    </DashboardLayout>
  );
}

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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, TrendingUp, TrendingDown, Target, Eye, RefreshCw, Wand2, Search } from 'lucide-react';
import { useTeachingQuality } from '@/contexts/teaching-quality-context';

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
  const { lastUpdatedAnalysisId, clearNotification } = useTeachingQuality();

  const [records, setRecords] = useState<StudentAnalysisRecord[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>(''); // 新增：搜尋關鍵字
  const [isLoading, setIsLoading] = useState(true);
  const [analyzingIds, setAnalyzingIds] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, [selectedTeacher, searchQuery]); // 新增：搜尋關鍵字變動時重新 fetch

  // 監聽全域狀態：當有分析更新時，重新載入資料
  useEffect(() => {
    if (lastUpdatedAnalysisId) {
      console.log('📥 List page detected analysis update:', lastUpdatedAnalysisId);
      fetchData({ showLoader: false }); // 靜默重新載入，不顯示 loading
      clearNotification(); // 清除通知
    }
  }, [lastUpdatedAnalysisId]);

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
      // 新增：加入搜尋參數
      if (searchQuery && searchQuery.trim() !== '') {
        params.append('search', searchQuery.trim());
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
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="搜尋學員名稱或 email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
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
                    <TableHead className="text-center whitespace-nowrap">老師表現總評分</TableHead>
                    <TableHead className="whitespace-nowrap">方案名稱</TableHead>
                    <TableHead className="whitespace-nowrap">剩餘堂數</TableHead>
                    <TableHead className="text-center whitespace-nowrap">是否已轉高</TableHead>
                    <TableHead className="text-right whitespace-nowrap">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.attendance_id}>
                      {/* 學員姓名 */}
                      <TableCell className="font-medium">{record.student_name}</TableCell>

                      {/* 諮詢師/老師 */}
                      <TableCell>{record.teacher_name}</TableCell>

                      {/* 體驗課日期 */}
                      <TableCell>{formatDate(record.class_date)}</TableCell>

                      {/* 老師表現總評分 (overall_score /100) */}
                      <TableCell className="text-center">
                        {record.id && record.overall_score !== null ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="text-lg font-bold text-foreground">
                              {record.overall_score}
                              <span className="text-sm text-muted-foreground">/100</span>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                record.overall_score >= 90 ? 'bg-green-50 text-green-700 border-green-300' :
                                record.overall_score >= 80 ? 'bg-blue-50 text-blue-700 border-blue-300' :
                                record.overall_score >= 70 ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
                                record.overall_score >= 60 ? 'bg-orange-50 text-orange-700 border-orange-300' :
                                'bg-red-50 text-red-700 border-red-300'
                              }
                            >
                              {record.overall_score >= 90 ? 'SSS' :
                               record.overall_score >= 80 ? 'A' :
                               record.overall_score >= 70 ? 'B' :
                               record.overall_score >= 60 ? 'C' :
                               record.overall_score >= 50 ? 'D' : 'E'}
                            </Badge>
                          </div>
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

                      {/* 方案名稱 */}
                      <TableCell>
                        {record.package_name ? (
                          <span className="text-sm font-medium">{record.package_name}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">未購課</span>
                        )}
                      </TableCell>

                      {/* 剩餘堂數 */}
                      <TableCell>
                        {record.remaining_classes ? (
                          <Badge variant="outline" className="text-blue-600 border-blue-300">
                            {record.remaining_classes}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      {/* 是否已轉高 */}
                      <TableCell className="text-center">
                        {record.package_name && !record.remaining_classes ? (
                          <Badge className="bg-green-600 hover:bg-green-700">
                            ✓ 已轉高
                          </Badge>
                        ) : record.package_name ? (
                          <Badge variant="outline" className="text-muted-foreground border-gray-300">
                            尚未轉高
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      {/* 操作 */}
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

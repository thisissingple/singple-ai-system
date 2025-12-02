/**
 * 課程進度追蹤頁面
 * 追蹤老師學員的課程完成狀態 (從 Trello 同步)
 */

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { sidebarConfig } from '@/config/sidebar-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  RefreshCw,
  Search,
  CheckCircle2,
  Circle,
  Clock,
  Users,
  BookOpen,
  Target,
  Zap,
  Wind,
  ChevronDown,
  ChevronRight,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CourseProgress {
  id: string;
  teacher_id: string | null;
  student_email: string;
  cards_completed: number;
  total_cards: number;
  track_completed: boolean;
  track_completed_at: string | null;
  pivot_completed: boolean;
  pivot_completed_at: string | null;
  breath_completed: boolean;
  breath_completed_at: string | null;
  status: string;
  last_synced_at: string;
  teacher_nickname: string | null;
  teacher_name: string | null;
}

interface CardCompletion {
  id: string;
  card_number: number;
  card_name: string;
  module_name: string;
  completed_at: string;
  is_paid: boolean;
}

interface SyncStatus {
  lastSyncAt: string | null;
  totalBoards: number;
  totalCardsCompleted: number;
}

interface Teacher {
  id: string;
  display_name: string;
}

interface TeacherSummary {
  teacher_id: string;
  teacher_name: string;
  total_students: number;
  total_cards_completed: number;
  track_completed_count: number;
  pivot_completed_count: number;
  breath_completed_count: number;
  in_progress_count: number;
}

interface WeeklyProgress {
  teacher_id: string;
  teacher_name: string;
  week_start: string;
  cards_completed: number;
  students_active: number;
}

export default function CourseProgressPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('students');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<CourseProgress[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherSummary, setTeacherSummary] = useState<TeacherSummary[]>([]);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress[]>([]);

  // 展開的學員 ID
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  // 學員卡片明細快取
  const [cardDetails, setCardDetails] = useState<Record<string, CardCompletion[]>>({});
  const [loadingCards, setLoadingCards] = useState<Set<string>>(new Set());

  // 篩選
  const [searchText, setSearchText] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // 載入資料
  useEffect(() => {
    loadData();
  }, [selectedTeacher]);

  // 當切換到老師總覽 Tab 時載入資料
  useEffect(() => {
    if (activeTab === 'teachers') {
      loadTeacherData();
    }
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [progressRes, statusRes, teachersRes] = await Promise.all([
        fetch(`/api/trello/progress?limit=200${selectedTeacher !== 'all' ? `&teacherId=${selectedTeacher}` : ''}`),
        fetch('/api/trello/status'),
        fetch('/api/teachers'),
      ]);

      if (progressRes.ok) {
        const data = await progressRes.json();
        setProgress(data.data || []);
      }

      if (statusRes.ok) {
        const data = await statusRes.json();
        setSyncStatus(data.data);
      }

      if (teachersRes.ok) {
        const data = await teachersRes.json();
        setTeachers(data.data || []);
      }
    } catch (error) {
      console.error('載入資料失敗:', error);
      toast({
        title: '載入失敗',
        description: '無法載入課程進度資料',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTeacherData = async () => {
    try {
      const [summaryRes, weeklyRes] = await Promise.all([
        fetch('/api/trello/teacher-summary'),
        fetch('/api/trello/teacher-weekly-progress'),
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setTeacherSummary(data.data || []);
      }

      if (weeklyRes.ok) {
        const data = await weeklyRes.json();
        setWeeklyProgress(data.data || []);
      }
    } catch (error) {
      console.error('載入老師資料失敗:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/trello/sync', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        toast({
          title: '同步成功',
          description: data.message,
        });
        loadData();
        if (activeTab === 'teachers') {
          loadTeacherData();
        }
      } else {
        throw new Error(data.error || '同步失敗');
      }
    } catch (error: any) {
      toast({
        title: '同步失敗',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  // 載入學員的卡片明細
  const loadCardDetails = async (progressId: string) => {
    if (cardDetails[progressId] || loadingCards.has(progressId)) return;

    setLoadingCards(prev => new Set(prev).add(progressId));
    try {
      const res = await fetch(`/api/trello/progress/${progressId}/cards`);
      if (res.ok) {
        const data = await res.json();
        setCardDetails(prev => ({ ...prev, [progressId]: data.data || [] }));
      }
    } catch (error) {
      console.error('載入卡片明細失敗:', error);
    } finally {
      setLoadingCards(prev => {
        const next = new Set(prev);
        next.delete(progressId);
        return next;
      });
    }
  };

  // 切換展開狀態
  const toggleExpand = (progressId: string) => {
    setExpandedStudents(prev => {
      const next = new Set(prev);
      if (next.has(progressId)) {
        next.delete(progressId);
      } else {
        next.add(progressId);
        loadCardDetails(progressId);
      }
      return next;
    });
  };

  // 篩選資料
  const filteredProgress = progress.filter(item => {
    if (searchText) {
      const search = searchText.toLowerCase();
      const studentName = item.student_email.replace('@trello.sync', '').toLowerCase();
      const teacherName = (item.teacher_nickname || item.teacher_name || '').toLowerCase();
      if (!studentName.includes(search) && !teacherName.includes(search)) {
        return false;
      }
    }

    if (statusFilter === 'completed' && !item.breath_completed) return false;
    if (statusFilter === 'in_progress' && (item.breath_completed || item.cards_completed === 0)) return false;
    if (statusFilter === 'not_started' && item.cards_completed > 0) return false;

    return true;
  });

  // 統計
  const stats = {
    total: progress.length,
    completed: progress.filter(p => p.breath_completed).length,
    inProgress: progress.filter(p => p.cards_completed > 0 && !p.breath_completed).length,
    notStarted: progress.filter(p => p.cards_completed === 0).length,
    trackCompleted: progress.filter(p => p.track_completed).length,
    pivotCompleted: progress.filter(p => p.pivot_completed).length,
  };

  const getStudentName = (email: string) => email.replace('@trello.sync', '');
  const getProgressPercent = (completed: number, total: number) => Math.round((completed / total) * 100);

  const getModuleStatus = (completed: boolean) => {
    if (completed) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          完成
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-gray-500">
        <Circle className="w-3 h-3 mr-1" />
        進行中
      </Badge>
    );
  };

  const getModuleBadge = (moduleName: string) => {
    switch (moduleName) {
      case 'track':
        return <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">軌道</Badge>;
      case 'pivot':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">支點</Badge>;
      case 'breath':
        return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">氣息</Badge>;
      default:
        return <Badge variant="outline">{moduleName}</Badge>;
    }
  };

  // 組織週進度資料 by 老師
  const groupedWeeklyProgress = weeklyProgress.reduce((acc, item) => {
    const teacherName = item.teacher_name || '未分配';
    if (!acc[teacherName]) {
      acc[teacherName] = [];
    }
    acc[teacherName].push(item);
    return acc;
  }, {} as Record<string, WeeklyProgress[]>);

  return (
    <DashboardLayout sidebarSections={sidebarConfig} title="課程進度追蹤">
      <div className="space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">課程進度追蹤</h1>
            <p className="text-muted-foreground">
              追蹤老師學員的一對一課程完成狀態（資料來源：Trello）
            </p>
          </div>
          <div className="flex items-center gap-2">
            {syncStatus?.lastSyncAt && (
              <span className="text-sm text-muted-foreground">
                <Clock className="w-4 h-4 inline mr-1" />
                上次同步：{new Date(syncStatus.lastSyncAt).toLocaleString('zh-TW')}
              </span>
            )}
            <Button onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? '同步中...' : '立即同步'}
            </Button>
          </div>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">總學員數</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                  <p className="text-xs text-muted-foreground">已完成課程</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.inProgress}</p>
                  <p className="text-xs text-muted-foreground">進行中</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Circle className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-2xl font-bold">{stats.notStarted}</p>
                  <p className="text-xs text-muted-foreground">尚未開始</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.trackCompleted}</p>
                  <p className="text-xs text-muted-foreground">軌道完成</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.pivotCompleted}</p>
                  <p className="text-xs text-muted-foreground">支點完成</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="students" className="gap-2">
              <Users className="w-4 h-4" />
              學員進度
            </TabsTrigger>
            <TabsTrigger value="teachers" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              老師總覽
            </TabsTrigger>
          </TabsList>

          {/* 學員進度 Tab */}
          <TabsContent value="students" className="space-y-4">
            {/* 篩選 */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="搜尋學員或老師..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="選擇老師" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部老師</SelectItem>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="進度狀態" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部狀態</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                      <SelectItem value="in_progress">進行中</SelectItem>
                      <SelectItem value="not_started">尚未開始</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* 進度表格 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  學員課程進度
                  <Badge variant="secondary">{filteredProgress.length} 筆</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">載入中...</div>
                ) : filteredProgress.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">沒有符合條件的資料</div>
                ) : (
                  <div className="space-y-2">
                    {filteredProgress.map((item) => (
                      <Collapsible
                        key={item.id}
                        open={expandedStudents.has(item.id)}
                        onOpenChange={() => toggleExpand(item.id)}
                      >
                        <div className="border rounded-lg">
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                              <div className="flex items-center gap-4">
                                {expandedStudents.has(item.id) ? (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                )}
                                <div>
                                  <p className="font-medium">{getStudentName(item.student_email)}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {item.teacher_nickname || item.teacher_name || '未分配老師'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2 w-32">
                                  <Progress
                                    value={getProgressPercent(item.cards_completed, item.total_cards)}
                                    className="w-20"
                                  />
                                  <span className="text-sm text-muted-foreground w-10">
                                    {getProgressPercent(item.cards_completed, item.total_cards)}%
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  {getModuleStatus(item.track_completed)}
                                  {getModuleStatus(item.pivot_completed)}
                                  {getModuleStatus(item.breath_completed)}
                                </div>
                                <span className="font-mono text-sm w-16 text-right">
                                  {item.cards_completed} / {item.total_cards}
                                </span>
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="border-t p-4 bg-muted/30">
                              {loadingCards.has(item.id) ? (
                                <div className="text-center py-4 text-muted-foreground">載入卡片明細中...</div>
                              ) : cardDetails[item.id]?.length ? (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium mb-3">已完成卡片：</p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {cardDetails[item.id].map((card) => (
                                      <div
                                        key={card.id}
                                        className="flex items-center justify-between p-2 bg-white rounded border"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono text-sm text-muted-foreground w-6">
                                            #{card.card_number}
                                          </span>
                                          {getModuleBadge(card.module_name)}
                                          <span className="text-sm truncate max-w-[150px]" title={card.card_name}>
                                            {card.card_name}
                                          </span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(card.completed_at).toLocaleDateString('zh-TW')}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-4 text-muted-foreground">尚無完成卡片記錄</div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 老師總覽 Tab */}
          <TabsContent value="teachers" className="space-y-4">
            {/* 老師總覽統計 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  老師進度總覽
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teacherSummary.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">載入中...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>老師</TableHead>
                        <TableHead className="text-center">學員數</TableHead>
                        <TableHead className="text-center">總完成卡片</TableHead>
                        <TableHead className="text-center">軌道完成</TableHead>
                        <TableHead className="text-center">支點完成</TableHead>
                        <TableHead className="text-center">氣息完成</TableHead>
                        <TableHead className="text-center">進行中</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teacherSummary.map((teacher) => (
                        <TableRow key={teacher.teacher_id || 'unassigned'}>
                          <TableCell className="font-medium">{teacher.teacher_name}</TableCell>
                          <TableCell className="text-center">{teacher.total_students}</TableCell>
                          <TableCell className="text-center font-mono">{teacher.total_cards_completed}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-purple-100">
                              {teacher.track_completed_count}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-yellow-100">
                              {teacher.pivot_completed_count}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-green-100">
                              {teacher.breath_completed_count}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{teacher.in_progress_count}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* 每週進度 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  每週進度統計（最近 8 週）
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(groupedWeeklyProgress).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">尚無週進度資料</div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedWeeklyProgress).map(([teacherName, weeks]) => (
                      <div key={teacherName} className="space-y-2">
                        <h4 className="font-medium text-lg">{teacherName}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                          {weeks.slice(0, 8).map((week) => (
                            <div
                              key={`${week.teacher_id}-${week.week_start}`}
                              className="p-3 border rounded-lg text-center"
                            >
                              <p className="text-xs text-muted-foreground">
                                {new Date(week.week_start).toLocaleDateString('zh-TW', {
                                  month: 'numeric',
                                  day: 'numeric',
                                })}
                              </p>
                              <p className="text-xl font-bold text-primary">{week.cards_completed}</p>
                              <p className="text-xs text-muted-foreground">張卡片</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

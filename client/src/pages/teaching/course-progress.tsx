/**
 * 課程進度追蹤頁面
 * 追蹤老師學員的課程完成狀態 (從 Trello 同步)
 */

import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  RefreshCw,
  X,
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
  LayoutGrid,
  ExternalLink,
  AlertCircle,
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
  lastSyncDurationSeconds: number | null;
  totalBoards: number;
  totalCardsCompleted: number;
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    trackCompleted: number;
    pivotCompleted: number;
    breathCompleted: number;
  };
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

interface WeeklyCardDetail {
  id: string;
  card_number: number;
  card_name: string;
  module_name: string;
  completed_at: string;
  is_paid: boolean;
  student_email: string;
  teacher_name: string;
}

interface TeacherStudentProgress {
  id: string;
  student_email: string;
  cards_completed: number;
  total_cards: number;
  notes: string | null;  // 備註
  track_completed: boolean;
  track_completed_at: string | null;
  pivot_completed: boolean;
  pivot_completed_at: string | null;
  breath_completed: boolean;
  breath_completed_at: string | null;
  status: string;
  current_stage: 'completed' | 'breath' | 'pivot' | 'track' | 'not_started';  // 當前階段
  is_new_student: boolean;  // 新學員（兩週內加入）
  last_synced_at: string;
  created_at: string;
  cards_this_week: number;
  cards_last_week: number;
  last_card_completed_at: string | null;
}

interface TrelloBoard {
  id: string;
  name: string;
  url: string;
  teacherName?: string | null;
  studentName?: string | null;
  isMatched?: boolean;
}

interface BoardsStatus {
  syncedBoards: TrelloBoard[];
  unmatchedBoards: TrelloBoard[];
  totalBoards: number;
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
  const [boardsStatus, setBoardsStatus] = useState<BoardsStatus | null>(null);
  const [loadingBoards, setLoadingBoards] = useState(false);
  // 週進度日期範圍控制
  const [weeklyStartDate, setWeeklyStartDate] = useState<string | null>(null); // null = 預設半年
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true); // 是否還有更多歷史可載入
  // 每個老師顯示的週數（預設 6 週）
  const [teacherWeeksVisible, setTeacherWeeksVisible] = useState<Record<string, number>>({});

  // 展開的學員 ID
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  // 學員卡片明細快取
  const [cardDetails, setCardDetails] = useState<Record<string, CardCompletion[]>>({});
  const [loadingCards, setLoadingCards] = useState<Set<string>>(new Set());

  // 展開的老師（學員列表）
  const [expandedTeachers, setExpandedTeachers] = useState<Set<string>>(new Set());
  const [teacherStudents, setTeacherStudents] = useState<Record<string, TeacherStudentProgress[]>>({});
  const [loadingTeacherStudents, setLoadingTeacherStudents] = useState<Set<string>>(new Set());

  // 展開的週進度卡片明細
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [weeklyCardDetails, setWeeklyCardDetails] = useState<Record<string, WeeklyCardDetail[]>>({});
  const [loadingWeeklyCards, setLoadingWeeklyCards] = useState<Set<string>>(new Set());

  // 老師卡片內的 Tab 狀態
  const [teacherCardTabs, setTeacherCardTabs] = useState<Record<string, string>>({});
  // 學員搜尋（按老師）
  const [teacherStudentSearch, setTeacherStudentSearch] = useState<Record<string, string>>({});
  // 學員明細排序（按老師）
  const [teacherStudentSort, setTeacherStudentSort] = useState<Record<string, { field: string; direction: 'asc' | 'desc' }>>({});
  // 異常警示排序（按老師）
  const [teacherAlertSort, setTeacherAlertSort] = useState<Record<string, { field: string; direction: 'asc' | 'desc' }>>({});
  // 週進度卡片明細排序（按 weekKey）
  const [weeklyCardSort, setWeeklyCardSort] = useState<Record<string, { field: string; direction: 'asc' | 'desc' }>>({});
  // 學員卡片歷史彈窗
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<{ teacherId: string; student: TeacherStudentProgress } | null>(null);
  const [studentCardHistory, setStudentCardHistory] = useState<CardCompletion[]>([]);
  const [loadingStudentHistory, setLoadingStudentHistory] = useState(false);

  // 篩選
  const [searchText, setSearchText] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  // 學員篩選（按老師）- 簡化為單一下拉選單
  const [teacherStudentFilter, setTeacherStudentFilter] = useState<Record<string, string>>({});
  // 備註編輯彈窗狀態
  const [editingNotes, setEditingNotes] = useState<{ progressId: string; studentName: string; notes: string } | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);

  // 載入資料
  useEffect(() => {
    loadData();
  }, [selectedTeacher]);

  // 當切換到老師總覽 Tab 時載入資料
  useEffect(() => {
    if (activeTab === 'teachers') {
      loadTeacherData();
    } else if (activeTab === 'boards') {
      loadBoardsData();
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

  const loadTeacherData = async (startDate?: string) => {
    try {
      const weeklyUrl = startDate
        ? `/api/trello/teacher-weekly-progress?startDate=${startDate}`
        : '/api/trello/teacher-weekly-progress';

      const [summaryRes, weeklyRes] = await Promise.all([
        fetch('/api/trello/teacher-summary'),
        fetch(weeklyUrl),
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

  // 載入更多歷史資料（再往前半年）
  const loadMoreHistory = async () => {
    setLoadingMoreHistory(true);
    try {
      // 找到目前資料中最早的日期
      const allWeekStarts = weeklyProgress.map(wp => wp.week_start);
      const earliestDate = allWeekStarts.length > 0
        ? allWeekStarts.reduce((min, d) => d < min ? d : min)
        : new Date().toISOString().split('T')[0];

      // 往前推半年（182天）
      const newStartDate = new Date(earliestDate);
      newStartDate.setDate(newStartDate.getDate() - 182);
      const newStartDateStr = newStartDate.toISOString().split('T')[0];

      // 設定結束日期為目前最早日期的前一天（避免重複）
      const endDate = new Date(earliestDate);
      endDate.setDate(endDate.getDate() - 1);
      const endDateStr = endDate.toISOString().split('T')[0];

      const weeklyUrl = `/api/trello/teacher-weekly-progress?startDate=${newStartDateStr}&endDate=${endDateStr}`;
      const res = await fetch(weeklyUrl);

      if (res.ok) {
        const data = await res.json();
        const newData = data.data || [];

        if (newData.length === 0) {
          setHasMoreHistory(false);
          toast({
            title: '已載入所有歷史',
            description: '沒有更多歷史資料了',
          });
        } else {
          // 合併新舊資料
          setWeeklyProgress(prev => [...prev, ...newData]);
          setWeeklyStartDate(newStartDateStr);
          toast({
            title: '載入成功',
            description: `已載入 ${newData.length} 筆歷史資料`,
          });
        }
      }
    } catch (error) {
      console.error('載入更多歷史失敗:', error);
      toast({
        title: '載入失敗',
        description: '無法載入更多歷史資料',
        variant: 'destructive',
      });
    } finally {
      setLoadingMoreHistory(false);
    }
  };

  const loadBoardsData = async () => {
    if (boardsStatus) return; // 已載入則不重複載入
    setLoadingBoards(true);
    try {
      const res = await fetch('/api/trello/boards/all');
      if (res.ok) {
        const data = await res.json();
        setBoardsStatus(data.data);
      }
    } catch (error) {
      console.error('載入看板資料失敗:', error);
    } finally {
      setLoadingBoards(false);
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

  // 載入週進度卡片明細
  const loadWeeklyCardDetails = async (teacherId: string, weekStart: string) => {
    const key = `${teacherId}-${weekStart}`;
    if (weeklyCardDetails[key] || loadingWeeklyCards.has(key)) return;

    setLoadingWeeklyCards(prev => new Set(prev).add(key));
    try {
      const res = await fetch(`/api/trello/weekly-cards/${teacherId}?weekStart=${weekStart}`);
      if (res.ok) {
        const data = await res.json();
        setWeeklyCardDetails(prev => ({ ...prev, [key]: data.data || [] }));
      }
    } catch (error) {
      console.error('載入週卡片明細失敗:', error);
    } finally {
      setLoadingWeeklyCards(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // 切換週進度展開狀態
  const toggleWeekExpand = (teacherId: string, weekStart: string) => {
    const key = `${teacherId}-${weekStart}`;
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        loadWeeklyCardDetails(teacherId, weekStart);
      }
      return next;
    });
  };

  // 載入老師的學員進度
  const loadTeacherStudents = async (teacherId: string) => {
    if (teacherStudents[teacherId] || loadingTeacherStudents.has(teacherId)) return;

    setLoadingTeacherStudents(prev => new Set(prev).add(teacherId));
    try {
      const res = await fetch(`/api/trello/teacher/${teacherId}/students`);
      if (res.ok) {
        const data = await res.json();
        setTeacherStudents(prev => ({ ...prev, [teacherId]: data.data || [] }));
      }
    } catch (error) {
      console.error('載入老師學員進度失敗:', error);
    } finally {
      setLoadingTeacherStudents(prev => {
        const next = new Set(prev);
        next.delete(teacherId);
        return next;
      });
    }
  };

  // 切換老師展開狀態（顯示學員）
  const toggleTeacherExpand = (teacherId: string) => {
    setExpandedTeachers(prev => {
      const next = new Set(prev);
      if (next.has(teacherId)) {
        next.delete(teacherId);
      } else {
        next.add(teacherId);
        loadTeacherStudents(teacherId);
      }
      return next;
    });
  };

  // 切換老師卡片內的 Tab
  const setTeacherTab = (teacherId: string, tab: string) => {
    setTeacherCardTabs(prev => ({ ...prev, [teacherId]: tab }));
    // 切換到學員明細時載入資料
    if (tab === 'students' && !teacherStudents[teacherId]) {
      loadTeacherStudents(teacherId);
    }
  };

  // 計算學員停滯天數
  const getDaysSinceLastCard = (lastCompletedAt: string | null): number | null => {
    if (!lastCompletedAt) return null;
    const lastDate = new Date(lastCompletedAt);
    const now = new Date();
    return Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  // 取得老師的學員並過濾排序
  const getFilteredTeacherStudents = (teacherId: string) => {
    let students = [...(teacherStudents[teacherId] || [])];
    const search = (teacherStudentSearch[teacherId] || '').toLowerCase();
    const sort = teacherStudentSort[teacherId] || { field: 'cards_completed', direction: 'desc' };
    const filter = teacherStudentFilter[teacherId] || 'all';

    // 過濾 - 搜尋（包含備註）
    if (search) {
      students = students.filter(s =>
        s.student_email.replace('@trello.sync', '').toLowerCase().includes(search) ||
        (s.notes && s.notes.toLowerCase().includes(search))
      );
    }

    // 過濾 - 單一下拉選單篩選
    switch (filter) {
      case 'new':
        students = students.filter(s => s.is_new_student);
        break;
      case 'in_progress':
        students = students.filter(s => s.current_stage !== 'completed' && s.current_stage !== 'not_started');
        break;
      case 'completed':
        students = students.filter(s => s.current_stage === 'completed');
        break;
      case 'stalled':
        students = students.filter(s => {
          const days = getDaysSinceLastCard(s.last_card_completed_at);
          return days !== null && days >= 21; // 3 週沒進度
        });
        break;
      case 'has_notes':
        students = students.filter(s => s.notes && s.notes.trim().length > 0);
        break;
      default:
        // 'all' - 不過濾
        break;
    }

    // 排序
    students.sort((a, b) => {
      // 新學員優先
      if (a.is_new_student !== b.is_new_student) {
        return a.is_new_student ? -1 : 1;
      }

      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sort.field) {
        case 'name':
          aVal = a.student_email.replace('@trello.sync', '');
          bVal = b.student_email.replace('@trello.sync', '');
          break;
        case 'cards_completed':
          aVal = a.cards_completed;
          bVal = b.cards_completed;
          break;
        case 'cards_this_week':
          aVal = Number(a.cards_this_week);
          bVal = Number(b.cards_this_week);
          break;
        case 'last_completed':
          aVal = a.last_card_completed_at ? new Date(a.last_card_completed_at).getTime() : 0;
          bVal = b.last_card_completed_at ? new Date(b.last_card_completed_at).getTime() : 0;
          break;
        default:
          aVal = a.cards_completed;
          bVal = b.cards_completed;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sort.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sort.direction === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return students;
  };

  // 取得篩選後的學員統計
  const getStudentFilterStats = (teacherId: string) => {
    const students = teacherStudents[teacherId] || [];
    const stalledCount = students.filter(s => {
      const days = getDaysSinceLastCard(s.last_card_completed_at);
      return days !== null && days >= 21;
    }).length;
    return {
      total: students.length,
      newStudents: students.filter(s => s.is_new_student).length,
      completed: students.filter(s => s.current_stage === 'completed').length,
      inProgress: students.filter(s => s.current_stage !== 'completed' && s.current_stage !== 'not_started').length,
      notStarted: students.filter(s => s.current_stage === 'not_started').length,
      stalled: stalledCount,
      hasNotes: students.filter(s => s.notes && s.notes.trim().length > 0).length,
    };
  };

  // 儲存備註
  const saveNotes = async () => {
    if (!editingNotes) return;
    setSavingNotes(true);
    try {
      const response = await fetch(`/api/trello/progress/${editingNotes.progressId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: editingNotes.notes }),
      });
      if (!response.ok) throw new Error('儲存失敗');

      // 更新本地狀態
      setTeacherStudents(prev => {
        const updated = { ...prev };
        for (const teacherId in updated) {
          updated[teacherId] = updated[teacherId].map(s =>
            s.id === editingNotes.progressId ? { ...s, notes: editingNotes.notes } : s
          );
        }
        return updated;
      });

      toast({ title: '備註已儲存' });
      setEditingNotes(null);
    } catch (error) {
      toast({ title: '儲存失敗', variant: 'destructive' });
    } finally {
      setSavingNotes(false);
    }
  };

  // 快速標記備註
  const quickNote = (note: string) => {
    if (!editingNotes) return;
    const currentNotes = editingNotes.notes.trim();
    const newNotes = currentNotes ? `${currentNotes}、${note}` : note;
    setEditingNotes({ ...editingNotes, notes: newNotes });
  };

  // 切換學員明細排序
  const toggleStudentSort = (teacherId: string, field: string) => {
    setTeacherStudentSort(prev => {
      const current = prev[teacherId] || { field: 'cards_completed', direction: 'desc' };
      if (current.field === field) {
        return { ...prev, [teacherId]: { field, direction: current.direction === 'asc' ? 'desc' : 'asc' } };
      }
      return { ...prev, [teacherId]: { field, direction: 'desc' } };
    });
  };

  // 取得老師的異常警示學員
  const getTeacherAlerts = (teacherId: string) => {
    const students = teacherStudents[teacherId] || [];
    const declining: (TeacherStudentProgress & { weekDiff: number })[] = [];
    const inactive: (TeacherStudentProgress & { daysSinceLastCard: number })[] = [];

    students.forEach(student => {
      const thisWeek = Number(student.cards_this_week);
      const lastWeek = Number(student.cards_last_week);
      // 本週比上週下降
      if (lastWeek > 0 && thisWeek < lastWeek) {
        declining.push({ ...student, weekDiff: lastWeek - thisWeek });
      }
      // 超過 14 天未完成卡片（排除已完課）
      if (student.last_card_completed_at && student.cards_completed < student.total_cards) {
        const lastDate = new Date(student.last_card_completed_at);
        const daysDiff = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > 14) {
          inactive.push({ ...student, daysSinceLastCard: daysDiff });
        }
      }
    });

    // 排序：按天數排序
    const alertSort = teacherAlertSort[teacherId] || { field: 'days', direction: 'asc' };
    if (alertSort.field === 'days') {
      inactive.sort((a, b) => alertSort.direction === 'asc'
        ? a.daysSinceLastCard - b.daysSinceLastCard
        : b.daysSinceLastCard - a.daysSinceLastCard
      );
    }

    return { declining, inactive };
  };

  // 切換異常警示排序
  const toggleAlertSort = (teacherId: string, field: string) => {
    setTeacherAlertSort(prev => {
      const current = prev[teacherId] || { field: 'days', direction: 'asc' };
      if (current.field === field) {
        return { ...prev, [teacherId]: { field, direction: current.direction === 'asc' ? 'desc' : 'asc' } };
      }
      return { ...prev, [teacherId]: { field, direction: 'asc' } };
    });
  };

  // 切換週進度卡片明細排序
  const toggleWeeklyCardSort = (weekKey: string, field: string) => {
    setWeeklyCardSort(prev => {
      const current = prev[weekKey] || { field: 'completed_at', direction: 'desc' };
      if (current.field === field) {
        return { ...prev, [weekKey]: { field, direction: current.direction === 'asc' ? 'desc' : 'asc' } };
      }
      return { ...prev, [weekKey]: { field, direction: 'desc' } };
    });
  };

  // 取得排序後的週進度卡片明細
  const getSortedWeeklyCards = (weekKey: string) => {
    const cards = [...(weeklyCardDetails[weekKey] || [])];
    const sort = weeklyCardSort[weekKey] || { field: 'completed_at', direction: 'desc' };

    cards.sort((a, b) => {
      let aVal: string | number = 0;
      let bVal: string | number = 0;

      switch (sort.field) {
        case 'student':
          aVal = a.student_email.replace('@trello.sync', '');
          bVal = b.student_email.replace('@trello.sync', '');
          break;
        case 'card_number':
          aVal = a.card_number;
          bVal = b.card_number;
          break;
        case 'completed_at':
          aVal = new Date(a.completed_at).getTime();
          bVal = new Date(b.completed_at).getTime();
          break;
        default:
          aVal = new Date(a.completed_at).getTime();
          bVal = new Date(b.completed_at).getTime();
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sort.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sort.direction === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return cards;
  };

  // 載入學員完成卡片歷史
  const loadStudentCardHistory = async (progressId: string) => {
    setLoadingStudentHistory(true);
    try {
      const res = await fetch(`/api/trello/progress/${progressId}/cards`);
      if (res.ok) {
        const data = await res.json();
        setStudentCardHistory(data.data || []);
      }
    } catch (error) {
      console.error('載入學員卡片歷史失敗:', error);
    } finally {
      setLoadingStudentHistory(false);
    }
  };

  // 打開學員卡片歷史彈窗
  const openStudentHistory = (teacherId: string, student: TeacherStudentProgress) => {
    setSelectedStudentForHistory({ teacherId, student });
    loadStudentCardHistory(student.id);
  };

  // 關閉學員卡片歷史彈窗
  const closeStudentHistory = () => {
    setSelectedStudentForHistory(null);
    setStudentCardHistory([]);
  };

  // 計算週進度趨勢（檢測異常下降）
  const calculateWeeklyTrend = (weeks: WeeklyProgress[]) => {
    if (weeks.length < 2) return null;
    const current = Number(weeks[0].cards_completed);
    const previous = Number(weeks[1].cards_completed);
    if (previous === 0) return null;
    const changePercent = ((current - previous) / previous) * 100;
    return {
      change: current - previous,
      percent: changePercent,
      isWarning: changePercent <= -30, // 下降 30% 以上算異常
      isDanger: changePercent <= -50, // 下降 50% 以上算嚴重
    };
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

  // 統計 - 優先使用後端的完整統計，否則用本地計算（後備方案）
  const stats = syncStatus?.stats || {
    total: progress.length,
    completed: progress.filter(p => p.breath_completed).length,
    inProgress: progress.filter(p => p.cards_completed > 0 && !p.breath_completed).length,
    notStarted: progress.filter(p => p.cards_completed === 0).length,
    trackCompleted: progress.filter(p => p.track_completed).length,
    pivotCompleted: progress.filter(p => p.pivot_completed).length,
    breathCompleted: progress.filter(p => p.breath_completed).length,
  };

  // 格式化同步耗時
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    if (seconds < 60) return `${seconds.toFixed(1)} 秒`;
    const minutes = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(0);
    return `${minutes} 分 ${secs} 秒`;
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
                {syncStatus.lastSyncDurationSeconds && (
                  <span className="ml-2 text-blue-600">
                    （耗時 {formatDuration(syncStatus.lastSyncDurationSeconds)}）
                  </span>
                )}
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
            <TabsTrigger value="boards" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              看板清單
              {boardsStatus && (
                <Badge variant="secondary" className="ml-1">
                  {boardsStatus.syncedBoards.length}/{boardsStatus.totalBoards}
                </Badge>
              )}
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

          {/* 老師總覽 Tab - 階層式卡片設計 */}
          <TabsContent value="teachers" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              點擊老師卡片內的標籤切換不同視圖・週期：週四 ~ 週三
            </p>

            {teacherSummary.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">載入中...</div>
            ) : (
              <div className="space-y-4">
                {teacherSummary.map((teacher) => {
                  const teacherId = teacher.teacher_id || 'unassigned';
                  const teacherWeeks = groupedWeeklyProgress[teacher.teacher_name] || [];
                  const trend = calculateWeeklyTrend(teacherWeeks);
                  const currentTab = teacherCardTabs[teacherId] || 'weekly';
                  const alerts = getTeacherAlerts(teacherId);
                  const alertCount = alerts.declining.length + alerts.inactive.length;

                  return (
                    <Card
                      key={teacherId}
                      className="overflow-hidden"
                    >
                      {/* 卡片標題區 */}
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {/* 狀態燈號 */}
                            <div className={`w-3 h-3 rounded-full ${
                              trend?.percent && trend.percent < 0 ? 'bg-orange-400' : 'bg-green-500'
                            }`} />
                            <CardTitle className="text-xl">{teacher.teacher_name}</CardTitle>
                            {/* 趨勢指標 */}
                            {trend && (
                              <span className={`text-sm flex items-center gap-1 px-2 py-1 rounded ${
                                trend.percent < 0 ? 'bg-orange-100 text-orange-700' :
                                trend.percent > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                <TrendingUp className={`w-4 h-4 ${trend.percent < 0 ? 'rotate-180' : ''}`} />
                                {trend.percent > 0 ? '+' : ''}{trend.percent.toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </div>
                        {/* 統計摘要 */}
                        <div className="flex flex-wrap gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-blue-500" />
                            {teacher.total_students} 學員
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4 text-gray-500" />
                            {teacher.total_cards_completed} 卡片
                          </span>
                          <Badge variant="outline" className="bg-purple-100">軌道 {teacher.track_completed_count}</Badge>
                          <Badge variant="outline" className="bg-yellow-100">支點 {teacher.pivot_completed_count}</Badge>
                          <Badge variant="outline" className="bg-green-100">氣息 {teacher.breath_completed_count}</Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        {/* Tab 切換 */}
                        <Tabs value={currentTab} onValueChange={(tab) => setTeacherTab(teacherId, tab)}>
                          <TabsList className="mb-4">
                            <TabsTrigger value="weekly" className="gap-1">
                              <Calendar className="w-4 h-4" />
                              週進度
                            </TabsTrigger>
                            <TabsTrigger value="students" className="gap-1">
                              <Users className="w-4 h-4" />
                              學員明細
                            </TabsTrigger>
                            <TabsTrigger value="alerts" className="gap-1">
                              <AlertCircle className="w-4 h-4" />
                              異常警示
                              {alertCount > 0 && (
                                <Badge variant="destructive" className="ml-1 text-xs">
                                  {alertCount}
                                </Badge>
                              )}
                            </TabsTrigger>
                          </TabsList>

                          {/* 週進度 Tab */}
                          <TabsContent value="weekly" className="mt-0 space-y-3">
                            {teacherWeeks.length === 0 ? (
                              <div className="text-center py-4 text-muted-foreground">尚無週進度資料</div>
                            ) : (
                              <>
                                {/* 週進度列表 */}
                                <div className="border rounded-lg overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-muted/50">
                                        <TableHead className="w-28">週次</TableHead>
                                        <TableHead className="w-24 text-center">卡片數</TableHead>
                                        <TableHead className="w-20 text-center">變化</TableHead>
                                        <TableHead className="w-24 text-center">學員數</TableHead>
                                        <TableHead>操作</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {teacherWeeks.slice(0, teacherWeeksVisible[teacherId] || 6).map((week, index) => {
                                        const weekDate = new Date(week.week_start).toISOString().split('T')[0];
                                        const weekKey = `${week.teacher_id}-${weekDate}`;
                                        const isExpanded = expandedWeeks.has(weekKey);
                                        const prevWeek = teacherWeeks[index + 1];
                                        const weekChange = prevWeek
                                          ? Number(week.cards_completed) - Number(prevWeek.cards_completed)
                                          : null;
                                        const weekEndDate = new Date(week.week_start);
                                        weekEndDate.setDate(weekEndDate.getDate() + 6);

                                        // 計算週數（從年初第一天開始計算經過幾週）
                                        const getWeekNumber = (date: Date): number => {
                                          const d = new Date(date);
                                          const startOfYear = new Date(d.getFullYear(), 0, 1);
                                          const msPerWeek = 7 * 24 * 60 * 60 * 1000;
                                          return Math.ceil((d.getTime() - startOfYear.getTime() + msPerWeek) / msPerWeek);
                                        };
                                        const weekNumber = getWeekNumber(new Date(week.week_start));

                                        return (
                                          <React.Fragment key={weekKey}>
                                            <TableRow
                                              className={isExpanded ? 'bg-primary/5' : ''}
                                            >
                                              <TableCell className="font-medium">
                                                <span className="text-primary font-bold">第{weekNumber}週</span>
                                                <span className="text-xs text-muted-foreground ml-2">
                                                  ({new Date(week.week_start).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}~{weekEndDate.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })})
                                                </span>
                                              </TableCell>
                                              <TableCell className="text-center">
                                                <span className="text-lg font-bold text-primary">{week.cards_completed}</span>
                                              </TableCell>
                                              <TableCell className="text-center">
                                                {weekChange !== null && weekChange !== 0 ? (
                                                  <span className={`text-sm font-medium ${weekChange > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {weekChange > 0 ? '+' : ''}{weekChange}
                                                  </span>
                                                ) : (
                                                  <span className="text-muted-foreground">-</span>
                                                )}
                                              </TableCell>
                                              <TableCell className="text-center text-muted-foreground">
                                                {week.students_active}
                                              </TableCell>
                                              <TableCell>
                                                <Button
                                                  variant={isExpanded ? 'secondary' : 'ghost'}
                                                  size="sm"
                                                  onClick={() => week.teacher_id && toggleWeekExpand(week.teacher_id, weekDate)}
                                                >
                                                  {isExpanded ? (
                                                    <>
                                                      <ChevronDown className="w-4 h-4 mr-1" />
                                                      收合
                                                    </>
                                                  ) : (
                                                    <>
                                                      <ChevronRight className="w-4 h-4 mr-1" />
                                                      明細
                                                    </>
                                                  )}
                                                </Button>
                                              </TableCell>
                                            </TableRow>
                                            {/* 卡片明細（展開時緊貼在週次下方） */}
                                            {isExpanded && (
                                              <TableRow>
                                                <TableCell colSpan={5} className="p-0 bg-muted/30">
                                                  <div className="p-3">
                                                    {loadingWeeklyCards.has(weekKey) ? (
                                                      <div className="text-center py-2 text-muted-foreground">載入中...</div>
                                                    ) : weeklyCardDetails[weekKey]?.length ? (
                                                      <Table>
                                                        <TableHeader>
                                                          <TableRow>
                                                            <TableHead
                                                              className="w-16 cursor-pointer hover:bg-muted/50"
                                                              onClick={() => toggleWeeklyCardSort(weekKey, 'card_number')}
                                                            >
                                                              # {weeklyCardSort[weekKey]?.field === 'card_number' && (weeklyCardSort[weekKey]?.direction === 'asc' ? '↑' : '↓')}
                                                            </TableHead>
                                                            <TableHead className="w-20">模組</TableHead>
                                                            <TableHead>卡片名稱</TableHead>
                                                            <TableHead
                                                              className="cursor-pointer hover:bg-muted/50"
                                                              onClick={() => toggleWeeklyCardSort(weekKey, 'student')}
                                                            >
                                                              學員 {weeklyCardSort[weekKey]?.field === 'student' && (weeklyCardSort[weekKey]?.direction === 'asc' ? '↑' : '↓')}
                                                            </TableHead>
                                                            <TableHead
                                                              className="w-20 cursor-pointer hover:bg-muted/50"
                                                              onClick={() => toggleWeeklyCardSort(weekKey, 'completed_at')}
                                                            >
                                                              完成日 {(weeklyCardSort[weekKey]?.field === 'completed_at' || !weeklyCardSort[weekKey]) && (weeklyCardSort[weekKey]?.direction === 'asc' ? '↑' : '↓')}
                                                            </TableHead>
                                                          </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                          {getSortedWeeklyCards(weekKey).map((card) => (
                                                            <TableRow key={card.id}>
                                                              <TableCell className="font-mono text-muted-foreground">
                                                                {card.card_number}
                                                              </TableCell>
                                                              <TableCell>{getModuleBadge(card.module_name)}</TableCell>
                                                              <TableCell className="truncate max-w-[150px]" title={card.card_name}>
                                                                {card.card_name || `卡片${card.card_number}`}
                                                              </TableCell>
                                                              <TableCell>{card.student_email.replace('@trello.sync', '')}</TableCell>
                                                              <TableCell className="text-muted-foreground">
                                                                {new Date(card.completed_at).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}
                                                              </TableCell>
                                                            </TableRow>
                                                          ))}
                                                        </TableBody>
                                                      </Table>
                                                    ) : (
                                                      <div className="text-center py-2 text-muted-foreground">無卡片記錄</div>
                                                    )}
                                                  </div>
                                                </TableCell>
                                              </TableRow>
                                            )}
                                          </React.Fragment>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>

                                {/* 顯示更多按鈕 */}
                                {teacherWeeks.length > (teacherWeeksVisible[teacherId] || 6) && (
                                  <div className="text-center">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setTeacherWeeksVisible(prev => ({
                                        ...prev,
                                        [teacherId]: (prev[teacherId] || 6) + 12
                                      }))}
                                    >
                                      <Clock className="w-4 h-4 mr-2" />
                                      顯示更多週次（還有 {teacherWeeks.length - (teacherWeeksVisible[teacherId] || 6)} 週）
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </TabsContent>

                          {/* 學員明細 Tab */}
                          <TabsContent value="students" className="mt-0">
                            {loadingTeacherStudents.has(teacherId) ? (
                              <div className="text-center py-4 text-muted-foreground">載入學員資料中...</div>
                            ) : teacherStudents[teacherId]?.length ? (
                              <div className="space-y-3">
                                {/* 簡化後的篩選列 */}
                                {(() => {
                                  const stats = getStudentFilterStats(teacherId);
                                  const filter = teacherStudentFilter[teacherId] || 'all';
                                  const filteredCount = getFilteredTeacherStudents(teacherId).length;
                                  return (
                                    <div className="flex items-center gap-3 flex-wrap">
                                      {/* 搜尋框 */}
                                      <div className="relative flex-1 min-w-[200px]">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input
                                          placeholder="搜尋學員或備註..."
                                          value={teacherStudentSearch[teacherId] || ''}
                                          onChange={(e) => setTeacherStudentSearch(prev => ({ ...prev, [teacherId]: e.target.value }))}
                                          className="pl-10 h-9"
                                        />
                                      </div>
                                      {/* 篩選下拉選單 */}
                                      <Select
                                        value={filter}
                                        onValueChange={(value) => setTeacherStudentFilter(prev => ({ ...prev, [teacherId]: value }))}
                                      >
                                        <SelectTrigger className="w-[160px] h-9">
                                          <SelectValue placeholder="篩選" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="all">全部 ({stats.total})</SelectItem>
                                          {stats.newStudents > 0 && (
                                            <SelectItem value="new">🆕 新學員 ({stats.newStudents})</SelectItem>
                                          )}
                                          <SelectItem value="in_progress">進行中 ({stats.inProgress})</SelectItem>
                                          <SelectItem value="completed">✓ 已完課 ({stats.completed})</SelectItem>
                                          {stats.stalled > 0 && (
                                            <SelectItem value="stalled">⚠️ 需關注 ({stats.stalled})</SelectItem>
                                          )}
                                          {stats.hasNotes > 0 && (
                                            <SelectItem value="has_notes">有備註 ({stats.hasNotes})</SelectItem>
                                          )}
                                        </SelectContent>
                                      </Select>
                                      {/* 結果數量 */}
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {filteredCount}/{stats.total}
                                      </span>
                                    </div>
                                  );
                                })()}
                                {/* 學員表格 */}
                                <div className="max-h-96 overflow-y-auto border rounded-lg">
                                  <Table>
                                    <TableHeader className="sticky top-0 bg-background">
                                      <TableRow>
                                        <TableHead
                                          className="cursor-pointer hover:bg-muted/50"
                                          onClick={() => toggleStudentSort(teacherId, 'name')}
                                        >
                                          學員 {(teacherStudentSort[teacherId]?.field === 'name') && (teacherStudentSort[teacherId]?.direction === 'asc' ? '↑' : '↓')}
                                        </TableHead>
                                        <TableHead
                                          className="cursor-pointer hover:bg-muted/50 w-24 text-center"
                                          onClick={() => toggleStudentSort(teacherId, 'cards_completed')}
                                        >
                                          進度 {(teacherStudentSort[teacherId]?.field === 'cards_completed' || !teacherStudentSort[teacherId]) && (teacherStudentSort[teacherId]?.direction === 'asc' ? '↑' : '↓')}
                                        </TableHead>
                                        <TableHead
                                          className="cursor-pointer hover:bg-muted/50 w-16 text-center"
                                          onClick={() => toggleStudentSort(teacherId, 'cards_this_week')}
                                        >
                                          本週 {(teacherStudentSort[teacherId]?.field === 'cards_this_week') && (teacherStudentSort[teacherId]?.direction === 'asc' ? '↑' : '↓')}
                                        </TableHead>
                                        <TableHead className="w-20">階段</TableHead>
                                        <TableHead className="min-w-[100px]">備註</TableHead>
                                        <TableHead
                                          className="cursor-pointer hover:bg-muted/50 w-24"
                                          onClick={() => toggleStudentSort(teacherId, 'last_completed')}
                                        >
                                          最後完成 {(teacherStudentSort[teacherId]?.field === 'last_completed') && (teacherStudentSort[teacherId]?.direction === 'asc' ? '↑' : '↓')}
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {getFilteredTeacherStudents(teacherId).map((student) => {
                                        const weekDiff = Number(student.cards_this_week) - Number(student.cards_last_week);
                                        const daysSince = getDaysSinceLastCard(student.last_card_completed_at);
                                        const progressPercent = Math.round((student.cards_completed / student.total_cards) * 100);
                                        return (
                                          <TableRow key={student.id} className={student.is_new_student ? 'bg-pink-50/50' : ''}>
                                            <TableCell className="font-medium">
                                              <div className="flex items-center gap-1">
                                                {student.is_new_student && <span className="text-pink-500" title="新學員（兩週內加入）">🆕</span>}
                                                <button
                                                  onClick={() => openStudentHistory(teacherId, student)}
                                                  className="text-left hover:text-primary hover:underline transition-colors"
                                                >
                                                  {student.student_email.replace('@trello.sync', '')}
                                                </button>
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                              <div className="flex flex-col items-center">
                                                <span className="font-mono text-sm">{student.cards_completed}/{student.total_cards}</span>
                                                <Progress value={progressPercent} className="h-1 w-12 mt-1" />
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                              {Number(student.cards_this_week) > 0 ? (
                                                <span className="flex items-center justify-center gap-1">
                                                  {student.cards_this_week}
                                                  {weekDiff !== 0 && (
                                                    <span className={`text-xs ${weekDiff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                      {weekDiff > 0 ? '↑' : '↓'}{Math.abs(weekDiff)}
                                                    </span>
                                                  )}
                                                </span>
                                              ) : (
                                                <span className="text-muted-foreground">-</span>
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              {student.current_stage === 'completed' ? (
                                                <Badge className="bg-green-500 text-[10px]">完課</Badge>
                                              ) : student.current_stage === 'breath' ? (
                                                <Badge variant="outline" className="bg-cyan-100 text-[10px]">氣息</Badge>
                                              ) : student.current_stage === 'pivot' ? (
                                                <Badge variant="outline" className="bg-yellow-100 text-[10px]">支點</Badge>
                                              ) : student.current_stage === 'track' ? (
                                                <Badge variant="outline" className="bg-purple-100 text-[10px]">軌道</Badge>
                                              ) : (
                                                <Badge variant="outline" className="bg-gray-100 text-[10px]">未開始</Badge>
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              <button
                                                onClick={() => setEditingNotes({
                                                  progressId: student.id,
                                                  studentName: student.student_email.replace('@trello.sync', ''),
                                                  notes: student.notes || ''
                                                })}
                                                className="text-xs text-left hover:bg-muted/50 p-1 rounded w-full max-w-[120px] truncate"
                                                title={student.notes || '點擊編輯備註'}
                                              >
                                                {student.notes ? (
                                                  <span className="text-muted-foreground">{student.notes}</span>
                                                ) : (
                                                  <span className="text-gray-300 italic">+備註</span>
                                                )}
                                              </button>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                              <div className="flex flex-col">
                                                <span>
                                                  {student.last_card_completed_at
                                                    ? new Date(student.last_card_completed_at).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
                                                    : '-'}
                                                </span>
                                                {daysSince !== null && daysSince > 0 && (
                                                  <span className={`text-xs ${daysSince > 21 ? 'text-red-500' : daysSince > 14 ? 'text-orange-500' : 'text-gray-400'}`}>
                                                    ({daysSince}天前)
                                                  </span>
                                                )}
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-4 text-muted-foreground">尚無學員資料</div>
                            )}
                          </TabsContent>

                          {/* 異常警示 Tab */}
                          <TabsContent value="alerts" className="mt-0">
                            {!teacherStudents[teacherId] ? (
                              <div className="text-center py-4 text-muted-foreground">
                                請先點擊「學員明細」載入資料
                              </div>
                            ) : alertCount === 0 ? (
                              <div className="text-center py-4 text-green-600">
                                <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                                目前沒有異常警示
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {/* 本週進度下降 */}
                                {alerts.declining.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2 text-orange-600">
                                      <TrendingUp className="w-4 h-4 rotate-180" />
                                      本週進度下降 ({alerts.declining.length}人)
                                    </h4>
                                    <div className="border rounded-lg overflow-hidden">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="bg-orange-50">
                                            <TableHead>學員</TableHead>
                                            <TableHead className="w-24 text-center">目前進度</TableHead>
                                            <TableHead className="w-20 text-center">本週</TableHead>
                                            <TableHead className="w-20 text-center">上週</TableHead>
                                            <TableHead className="w-16 text-center">差異</TableHead>
                                            <TableHead className="w-20 text-center">停滯</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {alerts.declining.map((student) => {
                                            const daysSince = getDaysSinceLastCard(student.last_card_completed_at);
                                            return (
                                              <TableRow key={student.id} className="bg-orange-50/50">
                                                <TableCell className="font-medium">
                                                  <button
                                                    onClick={() => openStudentHistory(teacherId, student)}
                                                    className="text-left hover:text-primary hover:underline transition-colors"
                                                  >
                                                    {student.student_email.replace('@trello.sync', '')}
                                                  </button>
                                                </TableCell>
                                                <TableCell className="text-center font-mono">
                                                  {student.cards_completed}/{student.total_cards}
                                                </TableCell>
                                                <TableCell className="text-center">{student.cards_this_week}</TableCell>
                                                <TableCell className="text-center">{student.cards_last_week}</TableCell>
                                                <TableCell className="text-center text-red-600 font-medium">
                                                  ↓{student.weekDiff}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                  {daysSince !== null ? (
                                                    <span className={`text-xs ${daysSince > 14 ? 'text-red-500 font-medium' : daysSince > 7 ? 'text-orange-500' : 'text-gray-500'}`}>
                                                      {daysSince}天
                                                    </span>
                                                  ) : '-'}
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                )}

                                {/* 超過 14 天未完成 */}
                                {alerts.inactive.length > 0 && (
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="text-sm font-medium flex items-center gap-2 text-red-600">
                                        <Clock className="w-4 h-4" />
                                        超過 14 天未完成卡片 ({alerts.inactive.length}人)
                                      </h4>
                                      <button
                                        onClick={() => toggleAlertSort(teacherId, 'days')}
                                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                                      >
                                        按天數排序 {teacherAlertSort[teacherId]?.direction === 'desc' ? '↓' : '↑'}
                                      </button>
                                    </div>
                                    <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                                      <Table>
                                        <TableHeader className="sticky top-0 bg-background">
                                          <TableRow className="bg-red-50">
                                            <TableHead>學員</TableHead>
                                            <TableHead className="w-24 text-center">目前進度</TableHead>
                                            <TableHead className="w-28">最後完成</TableHead>
                                            <TableHead
                                              className="w-20 text-center cursor-pointer hover:bg-red-100"
                                              onClick={() => toggleAlertSort(teacherId, 'days')}
                                            >
                                              天數 {teacherAlertSort[teacherId]?.direction === 'desc' ? '↓' : '↑'}
                                            </TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {alerts.inactive.map((student) => (
                                            <TableRow key={student.id} className="bg-red-50/50">
                                              <TableCell className="font-medium">
                                                {student.student_email.replace('@trello.sync', '')}
                                              </TableCell>
                                              <TableCell className="text-center font-mono">
                                                {student.cards_completed}/{student.total_cards}
                                              </TableCell>
                                              <TableCell className="text-muted-foreground">
                                                {new Date(student.last_card_completed_at!).toLocaleDateString('zh-TW')}
                                              </TableCell>
                                              <TableCell className="text-center text-red-600 font-medium">
                                                {student.daysSinceLastCard}天
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* 載入更多歷史按鈕 */}
                {hasMoreHistory && (
                  <div className="text-center pt-4">
                    <Button
                      variant="outline"
                      onClick={loadMoreHistory}
                      disabled={loadingMoreHistory}
                      className="min-w-[200px]"
                    >
                      {loadingMoreHistory ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          載入中...
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 mr-2" />
                          載入更多歷史（再往前半年）
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* 看板清單 Tab */}
          <TabsContent value="boards" className="space-y-4">
            {loadingBoards ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">載入看板資料中...</p>
              </div>
            ) : boardsStatus ? (
              <div className="space-y-6">
                {/* 看板統計 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="text-2xl font-bold">{boardsStatus.totalBoards}</p>
                          <p className="text-xs text-muted-foreground">Trello 總看板數</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="text-2xl font-bold">{boardsStatus.syncedBoards.length}</p>
                          <p className="text-xs text-muted-foreground">已匹配（會同步）</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                        <div>
                          <p className="text-2xl font-bold">{boardsStatus.unmatchedBoards.length}</p>
                          <p className="text-xs text-muted-foreground">未匹配（不會同步）</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 已匹配看板 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      已匹配看板（會同步）
                      <Badge variant="secondary">{boardsStatus.syncedBoards.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>看板名稱</TableHead>
                            <TableHead>老師</TableHead>
                            <TableHead>學員</TableHead>
                            <TableHead className="w-16">連結</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {boardsStatus.syncedBoards.map((board) => (
                            <TableRow key={board.id}>
                              <TableCell className="font-medium">{board.name}</TableCell>
                              <TableCell>
                                {board.teacherName ? (
                                  <Badge variant="outline">{board.teacherName}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>{board.studentName || '-'}</TableCell>
                              <TableCell>
                                <a
                                  href={board.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* 未匹配看板 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                      未匹配看板（不會同步）
                      <Badge variant="secondary">{boardsStatus.unmatchedBoards.length}</Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      這些看板名稱不符合篩選規則，如需同步請調整看板名稱格式
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>看板名稱</TableHead>
                            <TableHead className="w-16">連結</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {boardsStatus.unmatchedBoards.map((board) => (
                            <TableRow key={board.id}>
                              <TableCell className="font-medium text-muted-foreground">
                                {board.name}
                              </TableCell>
                              <TableCell>
                                <a
                                  href={board.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                無法載入看板資料
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 學員卡片歷史彈窗 */}
      <Dialog open={!!selectedStudentForHistory} onOpenChange={() => closeStudentHistory()}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {selectedStudentForHistory?.student.student_email.replace('@trello.sync', '')} 的完成卡片歷史
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {loadingStudentHistory ? (
              <div className="text-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">載入中...</p>
              </div>
            ) : studentCardHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                尚無完成紀錄
              </div>
            ) : (
              <div className="space-y-4">
                {/* 進度摘要 */}
                {selectedStudentForHistory && (
                  <div className="flex flex-wrap gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">進度：</span>
                      <span className="font-mono font-medium">
                        {selectedStudentForHistory.student.cards_completed}/{selectedStudentForHistory.student.total_cards}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {selectedStudentForHistory.student.track_completed && <Badge variant="outline" className="bg-purple-100">軌道</Badge>}
                      {selectedStudentForHistory.student.pivot_completed && <Badge variant="outline" className="bg-yellow-100">支點</Badge>}
                      {selectedStudentForHistory.student.breath_completed && <Badge variant="outline" className="bg-green-100">氣息</Badge>}
                    </div>
                  </div>
                )}
                {/* 卡片列表 */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead className="w-20">模組</TableHead>
                      <TableHead>卡片名稱</TableHead>
                      <TableHead className="w-28">完成日期</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentCardHistory.map((card) => (
                      <TableRow key={card.id}>
                        <TableCell className="font-mono text-muted-foreground">{card.card_number}</TableCell>
                        <TableCell>{getModuleBadge(card.module_name)}</TableCell>
                        <TableCell>{card.card_name || `卡片${card.card_number}`}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(card.completed_at).toLocaleDateString('zh-TW')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 備註編輯彈窗 */}
      <Dialog open={!!editingNotes} onOpenChange={(open) => !open && setEditingNotes(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>編輯學員備註</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              學員：<span className="font-medium text-foreground">{editingNotes?.studentName}</span>
            </div>
            <div>
              <textarea
                className="w-full h-24 p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="輸入備註..."
                value={editingNotes?.notes || ''}
                onChange={(e) => editingNotes && setEditingNotes({ ...editingNotes, notes: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">快速標記：</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => quickNote('只買軌道')}>
                  只買軌道
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => quickNote('只買2/3')}>
                  只買2/3
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => quickNote('暫停中')}>
                  暫停中
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => quickNote('已退費')}>
                  已退費
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => quickNote('VIP')}>
                  VIP
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingNotes(null)} disabled={savingNotes}>
                取消
              </Button>
              <Button onClick={saveNotes} disabled={savingNotes}>
                {savingNotes ? '儲存中...' : '儲存'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

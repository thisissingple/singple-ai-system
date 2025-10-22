/**
 * 電訪人員學生跟進頁面
 * 專為電訪人員優化的學生跟進介面
 *
 * Phase 1: 基礎優化
 * - 顯示「未開始學生」而非「未知教師」
 * - 新增購買日期、電話欄位
 * - 優先級自動排序
 * - 快速篩選功能
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import {
  Phone,
  PhoneCall,
  Calendar,
  User,
  Search,
  Filter,
  AlertCircle,
  UserPlus,
  Clock,
  ShoppingCart,
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { CallDialog } from '@/components/telemarketing/call-dialog';
import { AssignTeacherDialog } from '@/components/telemarketing/assign-teacher-dialog';

interface Student {
  id: string;
  student_name: string;
  student_email: string;
  phone?: string;
  purchase_date: string;
  package_name: string;
  teacher_name?: string;
  current_status: '未開始' | '體驗中' | '已轉高' | '未轉高';
  remaining_classes?: number;
  last_class_date?: string;
  deal_amount?: number;
}

interface StudentStats {
  total_unstarted: number;
  high_priority: number;
  medium_priority: number;
  low_priority: number;
  today_to_contact: number;
  overdue: number;
}

type PriorityLevel = 'high' | 'medium' | 'low';

// 計算優先級
function calculatePriority(student: Student): PriorityLevel {
  const daysSincePurchase = student.purchase_date
    ? differenceInDays(new Date(), parseISO(student.purchase_date))
    : 999;

  if (student.current_status === '未開始') {
    if (daysSincePurchase <= 7) return 'high';      // 🔴 7天內
    if (daysSincePurchase <= 14) return 'medium';   // 🟡 8-14天
    return 'low';                                    // 🟢 15天+
  }

  if (student.current_status === '體驗中') {
    const remaining = student.remaining_classes || 0;
    if (remaining === 1) return 'high';              // 🔴 剩1堂
    if (remaining >= 2 && remaining <= 3) return 'medium'; // 🟡 剩2-3堂
    return 'low';                                    // 🟢 剩4+堂
  }

  if (student.current_status === '未轉高') {
    const daysSinceLastClass = student.last_class_date
      ? differenceInDays(new Date(), parseISO(student.last_class_date))
      : 999;
    if (daysSinceLastClass <= 3) return 'high';      // 🔴 完課1-3天
    if (daysSinceLastClass <= 7) return 'medium';    // 🟡 完課4-7天
    return 'low';                                    // 🟢 完課8+天
  }

  return 'low';
}

// 優先級配置
const PRIORITY_CONFIG = {
  high: {
    label: '高優先',
    icon: '🔴',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
  },
  medium: {
    label: '中優先',
    icon: '🟡',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-700',
  },
  low: {
    label: '低優先',
    icon: '🟢',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700',
  },
};

export default function StudentFollowUp() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // 查詢學生資料（從體驗課報表 API）
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['/api/reports/total-report', 'this_month'],
    queryFn: async () => {
      const response = await fetch('/api/reports/total-report?period=this_month', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('無法載入學生資料');
      return response.json();
    },
  });

  // 從報表資料提取學生列表
  const students = useMemo(() => {
    if (!reportData?.data?.insights?.students) return [];

    return reportData.data.insights.students.map((s: any) => ({
      id: s.studentEmail || s.studentName,
      student_name: s.studentName,
      student_email: s.studentEmail,
      phone: s.phone,  // 從購買記錄取得
      purchase_date: s.purchaseDate,
      package_name: s.packageName,
      teacher_name: s.teacherName === '未知教師' ? undefined : s.teacherName,
      current_status: s.currentStatus,
      remaining_classes: s.remainingTrialClasses,
      last_class_date: s.lastClassDate,
      deal_amount: s.dealAmount,
    }));
  }, [reportData]);

  // 篩選和排序學生
  const filteredStudents = useMemo(() => {
    let filtered = students.filter((student: Student) => {
      // 搜尋過濾
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = student.student_name?.toLowerCase().includes(query);
        const matchEmail = student.student_email?.toLowerCase().includes(query);
        const matchPhone = student.phone?.includes(searchQuery);
        if (!matchName && !matchEmail && !matchPhone) return false;
      }

      // 狀態過濾
      if (statusFilter !== 'all' && student.current_status !== statusFilter) {
        return false;
      }

      // 優先級過濾
      if (priorityFilter !== 'all') {
        const priority = calculatePriority(student);
        if (priority !== priorityFilter) return false;
      }

      return true;
    });

    // 排序：優先級 > 購買日期
    return filtered.sort((a, b) => {
      const aPriority = calculatePriority(a);
      const bPriority = calculatePriority(b);

      const priorityWeight = { high: 1, medium: 2, low: 3 };
      if (priorityWeight[aPriority] !== priorityWeight[bPriority]) {
        return priorityWeight[aPriority] - priorityWeight[bPriority];
      }

      // 同優先級按購買日期排序（舊的在前）
      const aDate = a.purchase_date ? new Date(a.purchase_date).getTime() : 0;
      const bDate = b.purchase_date ? new Date(b.purchase_date).getTime() : 0;
      return aDate - bDate;
    });
  }, [students, searchQuery, statusFilter, priorityFilter]);

  // 統計資料
  const stats: StudentStats = useMemo(() => {
    const unstarted = students.filter((s: Student) => s.current_status === '未開始');

    return {
      total_unstarted: unstarted.length,
      high_priority: unstarted.filter((s: Student) => calculatePriority(s) === 'high').length,
      medium_priority: unstarted.filter((s: Student) => calculatePriority(s) === 'medium').length,
      low_priority: unstarted.filter((s: Student) => calculatePriority(s) === 'low').length,
      today_to_contact: unstarted.filter((s: Student) => calculatePriority(s) === 'high').length,
      overdue: unstarted.filter((s: Student) => {
        const days = s.purchase_date ? differenceInDays(new Date(), parseISO(s.purchase_date)) : 0;
        return days > 7;
      }).length,
    };
  }, [students]);

  // 獲取優先級標籤
  const getPriorityBadge = (priority: PriorityLevel) => {
    const config = PRIORITY_CONFIG[priority];
    return (
      <Badge className={`${config.bgColor} ${config.textColor} ${config.borderColor} border`}>
        {config.icon} {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div>
        <h1 className="text-3xl font-bold mb-2">學生跟進管理</h1>
        <p className="text-muted-foreground">
          電訪人員專用 - 跟進未開始學生、分配教師、記錄聯絡狀態
        </p>
      </div>

      {/* 統計卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              待分配學生
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.total_unstarted}</div>
            <p className="text-xs text-muted-foreground">未開始上課</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">🔴 高優先</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.high_priority}</div>
            <p className="text-xs text-muted-foreground">7天內購買</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">🟡 中優先</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.medium_priority}</div>
            <p className="text-xs text-muted-foreground">8-14天</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">🟢 低優先</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.low_priority}</div>
            <p className="text-xs text-muted-foreground">15天以上</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PhoneCall className="h-4 w-4" />
              今日待撥
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.today_to_contact}</div>
            <p className="text-xs text-muted-foreground">需立即聯繫</p>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              已逾期
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">超過7天未聯繫</p>
          </CardContent>
        </Card>
      </div>

      {/* 篩選器 */}
      <Card>
        <CardHeader>
          <CardTitle>篩選條件</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>快速篩選</Label>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === '未開始' && priorityFilter === 'high' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatusFilter('未開始');
                    setPriorityFilter('high');
                  }}
                >
                  今日待辦
                </Button>
                <Button
                  variant={priorityFilter === 'high' && statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setPriorityFilter('high');
                    setStatusFilter('all');
                  }}
                >
                  高優先
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>搜尋</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="姓名、Email、電話..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>狀態</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部狀態</SelectItem>
                  <SelectItem value="未開始">未開始</SelectItem>
                  <SelectItem value="體驗中">體驗中</SelectItem>
                  <SelectItem value="未轉高">未轉高</SelectItem>
                  <SelectItem value="已轉高">已轉高</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>優先級</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部優先級</SelectItem>
                  <SelectItem value="high">🔴 高優先</SelectItem>
                  <SelectItem value="medium">🟡 中優先</SelectItem>
                  <SelectItem value="low">🟢 低優先</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              顯示 {filteredStudents.length} / {students.length} 位學生
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setPriorityFilter('all');
              }}
            >
              清除篩選
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 學生列表 */}
      <Card>
        <CardHeader>
          <CardTitle>學生列表</CardTitle>
          <CardDescription>
            按優先級和購買日期排序，優先處理高優先學生
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">載入中...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              沒有符合條件的學生
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">優先級</TableHead>
                    <TableHead>學生資訊</TableHead>
                    <TableHead>聯絡電話</TableHead>
                    <TableHead>購買日期</TableHead>
                    <TableHead>方案</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead>教師</TableHead>
                    <TableHead>快速操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student: Student) => {
                    const priority = calculatePriority(student);
                    const daysSincePurchase = student.purchase_date
                      ? differenceInDays(new Date(), parseISO(student.purchase_date))
                      : 0;

                    return (
                      <TableRow key={student.id} className={PRIORITY_CONFIG[priority].bgColor}>
                        <TableCell>
                          {getPriorityBadge(priority)}
                        </TableCell>

                        <TableCell>
                          <div>
                            <div className="font-medium">{student.student_name}</div>
                            <div className="text-sm text-muted-foreground">{student.student_email}</div>
                          </div>
                        </TableCell>

                        <TableCell>
                          {student.phone ? (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{student.phone}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {student.purchase_date ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="text-sm">
                                  {format(parseISO(student.purchase_date), 'MM/dd', { locale: zhTW })}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {daysSincePurchase}天前
                                </div>
                              </div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                            {student.package_name}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant={
                            student.current_status === '已轉高' ? 'default' :
                            student.current_status === '體驗中' ? 'secondary' :
                            student.current_status === '未轉高' ? 'destructive' :
                            'outline'
                          }>
                            {student.current_status}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          {student.teacher_name ? (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {student.teacher_name}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              未分配
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedStudent(student);
                                setCallDialogOpen(true);
                              }}
                            >
                              <PhoneCall className="h-4 w-4 mr-1" />
                              撥打
                            </Button>
                            {!student.teacher_name && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setAssignDialogOpen(true);
                                }}
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                分配教師
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 對話框 */}
      {selectedStudent && (
        <>
          <CallDialog
            isOpen={callDialogOpen}
            onClose={() => {
              setCallDialogOpen(false);
              setSelectedStudent(null);
            }}
            student={selectedStudent}
          />

          <AssignTeacherDialog
            isOpen={assignDialogOpen}
            onClose={() => {
              setAssignDialogOpen(false);
              setSelectedStudent(null);
            }}
            student={selectedStudent}
          />
        </>
      )}
    </div>
  );
}

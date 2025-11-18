/**
 * Student Profile Page
 * 學員完整檔案查詢頁面 - 雙模式（列表/詳細）
 */

import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useFilteredSidebar } from '@/hooks/use-sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, Loader2, Mail, Users, ChevronLeft, ChevronRight, Eye, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useStudentProfile } from '@/hooks/use-student-profile';
import { useStudentsList } from '@/hooks/use-students-list';
import { StudentProfileCard } from '@/components/student-profile/student-profile-card';
import { StudentTimeline } from '@/components/student-profile/student-timeline';
import { StudentInsightsPanel } from '@/components/student-profile/student-insights-panel';
import { AIInsightsPanel } from '@/components/student-profile/ai-insights-panel';
import { KnowledgeBaseHistory } from '@/components/student-profile/knowledge-base-history';
import { CopyableTableCell } from '@/components/ui/copyable-text';

export default function StudentProfilePage() {
  const [, setLocation] = useLocation();
  const [emailInput, setEmailInput] = useState('');
  const [searchEmail, setSearchEmail] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  // Filter states (use 'all' instead of empty string for Radix UI compatibility)
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [consultantFilter, setConsultantFilter] = useState('all');
  const [conversionFilter, setConversionFilter] = useState<'renewed_high' | 'purchased_high' | 'purchased_trial' | 'not_purchased' | 'all'>('all');
  const [consultationFilter, setConsultationFilter] = useState<'consulted' | 'no_show' | 'not_consulted' | 'all'>('all');
  const [lastInteractionFilter, setLastInteractionFilter] = useState<'today' | '3days' | '7days' | '30days' | 'over30days' | 'all'>('all');

  // Sorting state - support multiple sort columns with Shift key
  type SortColumn = 'name' | 'email' | 'phone' | 'total_spent' | 'conversion_status' | 'consultation_status' | 'teacher' | 'consultant' | 'last_interaction';
  type SortDirection = 'asc' | 'desc';
  const [sortColumns, setSortColumns] = useState<Array<{ column: SortColumn; direction: SortDirection }>>([
    { column: 'last_interaction', direction: 'desc' } // Default: sort by last interaction descending
  ]);

  const filteredSidebar = useFilteredSidebar();

  const { data: profileData, isLoading: profileLoading, error: profileError } = useStudentProfile(searchEmail);
  const { data: listData, isLoading: listLoading } = useStudentsList({
    page: currentPage,
    limit: 20,
    search: searchQuery,
    teacher: teacherFilter === 'all' ? '' : teacherFilter,
    consultant: consultantFilter === 'all' ? '' : consultantFilter,
    conversionStatus: conversionFilter === 'all' ? '' : conversionFilter,
    consultationStatus: consultationFilter === 'all' ? '' : consultationFilter,
    lastInteraction: lastInteractionFilter === 'all' ? '' : lastInteractionFilter,
  });

  // Handle column sorting (with Shift for multi-column)
  const handleSort = (column: SortColumn, event: React.MouseEvent) => {
    if (event.shiftKey) {
      // Multi-column sort with Shift key
      setSortColumns(prev => {
        const existing = prev.find(s => s.column === column);
        if (existing) {
          // Toggle direction if exists
          return prev.map(s =>
            s.column === column
              ? { ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' as SortDirection }
              : s
          );
        } else {
          // Add new column
          return [...prev, { column, direction: 'asc' as SortDirection }];
        }
      });
    } else {
      // Single column sort
      setSortColumns(prev => {
        const existing = prev.find(s => s.column === column);
        if (existing && prev.length === 1) {
          // Toggle direction
          return [{ column, direction: existing.direction === 'asc' ? 'desc' : 'asc' as SortDirection }];
        } else {
          // Replace with new column
          return [{ column, direction: 'asc' as SortDirection }];
        }
      });
    }
  };

  // Sort students data
  const sortedStudents = React.useMemo(() => {
    if (!listData?.students) return [];

    const students = [...listData.students];

    return students.sort((a, b) => {
      for (const { column, direction } of sortColumns) {
        let aVal: any;
        let bVal: any;

        switch (column) {
          case 'name':
            aVal = a.student_name || '';
            bVal = b.student_name || '';
            break;
          case 'email':
            aVal = a.student_email || '';
            bVal = b.student_email || '';
            break;
          case 'phone':
            aVal = a.phone || '';
            bVal = b.phone || '';
            break;
          case 'total_spent':
            aVal = parseFloat(a.total_spent) || 0;
            bVal = parseFloat(b.total_spent) || 0;
            break;
          case 'conversion_status':
            const statusOrder = { renewed_high: 4, purchased_high: 3, purchased_trial: 2, not_purchased: 1 };
            aVal = statusOrder[a.conversion_status as keyof typeof statusOrder] || 0;
            bVal = statusOrder[b.conversion_status as keyof typeof statusOrder] || 0;
            break;
          case 'consultation_status':
            const consultationOrder = { consulted: 3, no_show: 2, not_consulted: 1 };
            aVal = consultationOrder[a.consultation_status as keyof typeof consultationOrder] || 0;
            bVal = consultationOrder[b.consultation_status as keyof typeof consultationOrder] || 0;
            break;
          case 'teacher':
            aVal = a.teacher || '';
            bVal = b.teacher || '';
            break;
          case 'consultant':
            aVal = a.consultant || '';
            bVal = b.consultant || '';
            break;
          case 'last_interaction':
            aVal = a.last_interaction?.date ? new Date(a.last_interaction.date).getTime() : 0;
            bVal = b.last_interaction?.date ? new Date(b.last_interaction.date).getTime() : 0;
            break;
        }

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [listData, sortColumns]);

  const handleSearch = () => {
    if (emailInput.trim()) {
      setSearchEmail(emailInput.trim());
      setViewMode('detail');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleViewStudent = (email: string) => {
    setEmailInput(email);
    setSearchEmail(email);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSearchEmail(null);
    setEmailInput('');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('zh-TW');
  };

  const formatCurrency = (amount: number) => {
    return `NT$ ${Math.round(amount).toLocaleString()}`;
  };

  // Get sort icon and priority for a column
  const getSortIcon = (column: SortColumn) => {
    const sortInfo = sortColumns.find(s => s.column === column);
    if (!sortInfo) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    }

    const priority = sortColumns.length > 1 ? sortColumns.indexOf(sortInfo) + 1 : null;
    const Icon = sortInfo.direction === 'asc' ? ArrowUp : ArrowDown;

    return (
      <span className="inline-flex items-center">
        <Icon className="w-3 h-3 ml-1" />
        {priority && <span className="text-[10px] ml-0.5">({priority})</span>}
      </span>
    );
  };

  const getConversionStatusBadge = (status: string | null) => {
    switch (status) {
      case 'renewed_high':
        return <Badge className="bg-purple-100 text-purple-700 border-purple-300">已續課高價</Badge>;
      case 'purchased_high':
        return <Badge className="bg-green-100 text-green-700 border-green-300">已購買高價</Badge>;
      case 'purchased_trial':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300">已購買體驗課</Badge>;
      case 'not_purchased':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-300">未購買</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const getConsultationStatusBadge = (status: string | null) => {
    switch (status) {
      case 'consulted':
        return <Badge className="bg-green-100 text-green-700 border-green-300">已諮詢</Badge>;
      case 'no_show':
        return <Badge className="bg-red-100 text-red-700 border-red-300">放鳥</Badge>;
      case 'not_consulted':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-300">未諮詢</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const getLastInteractionLabel = (interaction: { type: string; date: string } | null) => {
    if (!interaction) return '-';

    const typeLabels = {
      class: '上課',
      consultation: '諮詢',
      purchase: '購買',
    };

    const label = typeLabels[interaction.type as keyof typeof typeLabels] || interaction.type;
    const date = new Date(interaction.date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return `${label} (今天)`;
    if (diffDays === 1) return `${label} (昨天)`;
    if (diffDays < 7) return `${label} (${diffDays} 天前)`;
    if (diffDays < 30) return `${label} (${Math.floor(diffDays / 7)} 週前)`;
    return `${label} (${formatDate(interaction.date)})`;
  };

  const handleClearFilters = () => {
    setTeacherFilter('all');
    setConsultantFilter('all');
    setConversionFilter('all');
    setLastInteractionFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  return (
    <DashboardLayout sidebarSections={filteredSidebar} title="學員完整檔案">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">學員完整檔案</h1>
            <p className="text-muted-foreground mt-1">
              {viewMode === 'list'
                ? '瀏覽所有學員或搜尋特定學員'
                : '查詢學員的所有互動記錄、AI 洞察與完整歷程'
              }
            </p>
          </div>
          <div className="flex gap-2">
            {viewMode === 'detail' && (
              <Button variant="outline" onClick={handleBackToList}>
                <Users className="w-4 h-4 mr-2" />
                返回列表
              </Button>
            )}
            <Button variant="outline" onClick={() => setLocation('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回首頁
            </Button>
          </div>
        </div>

        {/* Search Bar and Filters */}
        {viewMode === 'list' && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Search Input */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="搜尋學員名稱或 Email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Filter className="w-4 h-4" />
                  <span className="font-medium">過濾條件:</span>
                </div>

                {/* Teacher Filter */}
                <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="負責老師" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部老師</SelectItem>
                    {listData?.filterOptions.teachers.map((teacher) => (
                      <SelectItem key={teacher} value={teacher}>
                        {teacher}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Consultant Filter */}
                <Select value={consultantFilter} onValueChange={setConsultantFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="諮詢師" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部諮詢師</SelectItem>
                    {listData?.filterOptions.consultants.map((consultant) => (
                      <SelectItem key={consultant} value={consultant}>
                        {consultant}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Conversion Status Filter */}
                <Select value={conversionFilter} onValueChange={(v) => setConversionFilter(v as any)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="轉換狀態" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部狀態</SelectItem>
                    <SelectItem value="renewed_high">已續課高價</SelectItem>
                    <SelectItem value="purchased_high">已購買高價</SelectItem>
                    <SelectItem value="purchased_trial">已購買體驗課</SelectItem>
                    <SelectItem value="not_purchased">未購買</SelectItem>
                  </SelectContent>
                </Select>

                {/* Consultation Status Filter */}
                <Select value={consultationFilter} onValueChange={(v) => setConsultationFilter(v as any)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="諮詢狀態" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部狀態</SelectItem>
                    <SelectItem value="consulted">已諮詢</SelectItem>
                    <SelectItem value="no_show">放鳥</SelectItem>
                    <SelectItem value="not_consulted">未諮詢</SelectItem>
                  </SelectContent>
                </Select>

                {/* Last Interaction Filter */}
                <Select value={lastInteractionFilter} onValueChange={(v) => setLastInteractionFilter(v as any)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="最近互動" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部時間</SelectItem>
                    <SelectItem value="today">今天</SelectItem>
                    <SelectItem value="3days">3 天內</SelectItem>
                    <SelectItem value="7days">7 天內</SelectItem>
                    <SelectItem value="30days">30 天內</SelectItem>
                    <SelectItem value="over30days">30 天以上</SelectItem>
                  </SelectContent>
                </Select>

                {/* Clear Filters Button */}
                {(teacherFilter !== 'all' || consultantFilter !== 'all' || conversionFilter !== 'all' || lastInteractionFilter !== 'all' || searchQuery) && (
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    清除過濾
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Email Search Bar (Detail Mode) */}
        {viewMode === 'detail' && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="輸入學員 Email 查詢 (例: student@example.com)"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch} disabled={!emailInput.trim() || profileLoading}>
                  {profileLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      查詢中...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      查詢
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* List Mode */}
        {viewMode === 'list' && (
          <>
            {listLoading ? (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-muted-foreground">正在載入學員列表...</p>
                  </div>
                </CardContent>
              </Card>
            ) : listData && listData.students.length > 0 ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>學員列表 ({listData.pagination.total} 位學員)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50 select-none"
                            onClick={(e) => handleSort('name', e)}
                          >
                            <div className="flex items-center">
                              學員姓名
                              {getSortIcon('name')}
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50 select-none"
                            onClick={(e) => handleSort('email', e)}
                          >
                            <div className="flex items-center">
                              Email
                              {getSortIcon('email')}
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50 select-none"
                            onClick={(e) => handleSort('phone', e)}
                          >
                            <div className="flex items-center">
                              電話
                              {getSortIcon('phone')}
                            </div>
                          </TableHead>
                          <TableHead
                            className="text-right cursor-pointer hover:bg-muted/50 select-none"
                            onClick={(e) => handleSort('total_spent', e)}
                          >
                            <div className="flex items-center justify-end">
                              累積花費
                              {getSortIcon('total_spent')}
                            </div>
                          </TableHead>
                          <TableHead
                            className="text-center cursor-pointer hover:bg-muted/50 select-none"
                            onClick={(e) => handleSort('conversion_status', e)}
                          >
                            <div className="flex items-center justify-center">
                              轉換狀態
                              {getSortIcon('conversion_status')}
                            </div>
                          </TableHead>
                          <TableHead
                            className="text-center cursor-pointer hover:bg-muted/50 select-none"
                            onClick={(e) => handleSort('consultation_status', e)}
                          >
                            <div className="flex items-center justify-center">
                              諮詢狀態
                              {getSortIcon('consultation_status')}
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50 select-none"
                            onClick={(e) => handleSort('teacher', e)}
                          >
                            <div className="flex items-center">
                              負責老師
                              {getSortIcon('teacher')}
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50 select-none"
                            onClick={(e) => handleSort('consultant', e)}
                          >
                            <div className="flex items-center">
                              諮詢師
                              {getSortIcon('consultant')}
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer hover:bg-muted/50 select-none"
                            onClick={(e) => handleSort('last_interaction', e)}
                          >
                            <div className="flex items-center">
                              最近互動
                              {getSortIcon('last_interaction')}
                            </div>
                          </TableHead>
                          <TableHead className="text-center">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedStudents.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">
                              {student.student_name}
                              {student.is_deleted && (
                                <Badge variant="secondary" className="ml-2 text-xs">已刪除</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <CopyableTableCell
                                text={student.student_email}
                                type="email"
                              />
                            </TableCell>
                            <TableCell>
                              <CopyableTableCell
                                text={student.phone || ''}
                                type="phone"
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {student.total_spent > 0 ? (
                                <span className="text-green-700">{formatCurrency(student.total_spent)}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {getConversionStatusBadge(student.conversion_status)}
                            </TableCell>
                            <TableCell className="text-center">
                              {getConsultationStatusBadge(student.consultation_status)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {student.teacher || <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell className="text-sm">
                              {student.consultant || <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell className="text-sm">
                              {getLastInteractionLabel(student.last_interaction)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewStudent(student.student_email)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                查看詳情
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Pagination */}
                {listData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      第 {listData.pagination.page} 頁，共 {listData.pagination.totalPages} 頁
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        上一頁
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === listData.pagination.totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                      >
                        下一頁
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-16">
                  <div className="text-center text-muted-foreground space-y-2">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground/50" />
                    <p className="text-lg font-semibold">沒有學員資料</p>
                    <p className="text-sm">目前系統中沒有學員記錄</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Detail Mode */}
        {viewMode === 'detail' && (
          <>
            {profileError && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="text-center text-red-600">
                    <p className="font-semibold">查詢失敗</p>
                    <p className="text-sm mt-1">{(profileError as Error).message}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {profileLoading && (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-muted-foreground">正在載入學員資料...</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {profileData && !profileLoading && (
              <div className="space-y-6">
                {/* Profile Card */}
                <StudentProfileCard kb={profileData.kb} totalAiCost={profileData.totalAiCost} />

                {/* Tabs */}
                <Tabs defaultValue="timeline" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="timeline">互動歷程</TabsTrigger>
                    <TabsTrigger value="insights">學員洞察</TabsTrigger>
                    <TabsTrigger value="ai">AI 對話</TabsTrigger>
                    <TabsTrigger value="kb-history">知識庫歷程</TabsTrigger>
                  </TabsList>

                  {/* Timeline Tab */}
                  <TabsContent value="timeline" className="mt-6">
                    <StudentTimeline
                      trialClasses={profileData.trialClasses}
                      eodsRecords={profileData.eodsRecords}
                      purchases={profileData.purchases}
                      aiAnalyses={profileData.aiAnalyses}
                    />
                  </TabsContent>

                  {/* Insights Tab */}
                  <TabsContent value="insights" className="mt-6">
                    <StudentInsightsPanel profileSummary={profileData.kb.profile_summary} />
                  </TabsContent>

                  {/* AI Analysis Tab */}
                  <TabsContent value="ai" className="mt-6">
                    <AIInsightsPanel
                      kb={profileData.kb}
                      studentEmail={searchEmail || ''}
                      studentName={profileData.kb.student_name}
                    />
                  </TabsContent>

                  {/* Knowledge Base History Tab */}
                  <TabsContent value="kb-history" className="mt-6">
                    <KnowledgeBaseHistory
                      studentEmail={searchEmail || ''}
                      dataSources={profileData.kb.data_sources}
                      trialClasses={profileData.trialClasses}
                      eodsRecords={profileData.eodsRecords}
                      aiAnalyses={profileData.aiAnalyses}
                      consultationAnalyses={profileData.consultationAnalyses || []}
                      aiConversations={profileData.aiConversations || []}
                      purchases={profileData.purchases}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {!searchEmail && !profileLoading && (
              <Card>
                <CardContent className="py-16">
                  <div className="text-center text-muted-foreground space-y-2">
                    <Search className="w-12 h-12 mx-auto text-muted-foreground/50" />
                    <p className="text-lg font-semibold">開始查詢</p>
                    <p className="text-sm">請在上方輸入學員 Email 開始查詢</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

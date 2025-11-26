/**
 * 學員檔案 - 遊戲化版本
 * 整合所有學員數據：基本資料、互動歷史、AI 洞察、上課記錄、諮詢記錄
 */

import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Mail,
  Phone,
  User,
  Calendar,
  DollarSign,
  BookOpen,
  MessageSquare,
  TrendingUp,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Target,
  Award,
} from 'lucide-react';
import { useStudentProfile } from '@/hooks/use-student-profile';
import { format } from 'date-fns';

export default function StudentProfileGamified() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<'timeline' | 'insights'>('timeline');

  // 從 URL 獲取 email
  const searchParams = new URLSearchParams(window.location.search);
  const studentEmail = searchParams.get('email');

  // 使用 Hook 獲取學員資料
  const { data, isLoading, error } = useStudentProfile(studentEmail);

  // 計算統計數據
  const stats = useMemo(() => {
    if (!data) return null;

    const totalSpent = data.purchases.reduce((sum, p) => sum + (p.amount || 0), 0);
    const conversionRate = data.kb.conversion_status?.includes('purchased') ? 100 : 0;

    return {
      firstContact: data.kb.first_contact_date,
      lastInteraction: data.kb.last_interaction_date,
      totalSpent,
      conversionRate,
      totalClasses: data.kb.total_classes,
      totalConsultations: data.kb.total_consultations,
      totalInteractions: data.kb.total_interactions,
    };
  }, [data]);

  // 整合所有互動記錄並排序
  const timelineEvents = useMemo(() => {
    if (!data) return [];

    const events: any[] = [];

    // 加入成交記錄
    data.purchases.forEach((purchase) => {
      events.push({
        id: `purchase-${purchase.id}`,
        type: 'purchase',
        title: '成交正式課程',
        description: purchase.course_type || '購買正式課程',
        amount: purchase.amount,
        date: purchase.purchase_date,
        time: format(new Date(purchase.created_at || purchase.purchase_date), 'HH:mm'),
        icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        sortDate: new Date(purchase.purchase_date),
      });
    });

    // 加入體驗課記錄
    data.trialClasses.forEach((cls) => {
      events.push({
        id: `class-${cls.id}`,
        type: 'class',
        title: '體驗課',
        description: cls.notes || '完成體驗課程',
        date: cls.class_date,
        time: cls.class_time || format(new Date(cls.created_at || cls.class_date), 'HH:mm'),
        teacher: cls.teacher_name,
        icon: <BookOpen className="w-5 h-5 text-blue-600" />,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        sortDate: new Date(cls.class_date),
      });
    });

    // 加入諮詢記錄
    data.eodsRecords.forEach((eod) => {
      events.push({
        id: `eod-${eod.id}`,
        type: 'consultation',
        title: '諮詢通話',
        description: eod.consultation_notes || '與顧問進行課程諮詢',
        date: eod.deal_date,
        time: eod.created_at ? format(new Date(eod.created_at), 'HH:mm') : '',
        consultant: eod.closer_name,
        dealStatus: eod.deal_status,
        probability: eod.conversion_probability,
        icon: <MessageSquare className="w-5 h-5 text-purple-600" />,
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        sortDate: new Date(eod.deal_date || eod.created_at || Date.now()),
      });
    });

    // 依日期排序（最新的在前）
    return events.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
  }, [data]);

  // AI 洞察數據
  const aiInsights = useMemo(() => {
    if (!data || !data.kb.profile_summary) return null;

    const summary = data.kb.profile_summary;
    const pregenerated = data.kb.ai_pregenerated_insights || {};

    return {
      painPoints: summary.painPoints?.map(p => p.point) || [],
      goals: summary.goals?.desiredOutcome || '',
      motivation: summary.goals?.motivation || '',
      barriers: summary.conversionBarriers || [],
      conversionProbability: pregenerated.conversionProbability || 0,
      conversionStrategy: pregenerated.conversionStrategy || '',
      nextSteps: pregenerated.nextSteps || '',
    };
  }, [data]);

  // Loading 狀態
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">載入學員資料中...</p>
        </div>
      </div>
    );
  }

  // 錯誤狀態
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">載入失敗</h3>
              <p className="text-gray-600 mb-4">{error?.message || '查無此學員資料'}</p>
              <Button onClick={() => navigate('/reports/trial-overview-gamified')}>
                返回列表
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const kb = data.kb;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/reports/trial-overview-gamified')}
            className="hover:bg-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回列表
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">學員檔案</h1>
            <p className="text-gray-600 mt-1">完整的學員資料與互動歷史</p>
          </div>
        </div>

        {/* Student Profile Card */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 shadow-xl rounded-2xl">
          <CardContent className="pt-8 pb-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                {/* Avatar */}
                <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-4xl font-bold border-4 border-white/40">
                  {kb.student_name?.charAt(0) || '?'}
                </div>

                {/* Basic Info */}
                <div className="space-y-3">
                  <div>
                    <h2 className="text-3xl font-bold">{kb.student_name}</h2>
                    <div className="flex items-center gap-4 mt-2 text-blue-100">
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {kb.student_email}
                      </div>
                      {data.purchases[0]?.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {data.purchases[0].phone}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {data.trialClasses[0]?.teacher_name && (
                      <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                        <User className="w-3 h-3 mr-1" />
                        {data.trialClasses[0].teacher_name}
                      </Badge>
                    )}
                    {data.eodsRecords[0]?.closer_name && (
                      <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                        <MessageSquare className="w-3 h-3 mr-1" />
                        {data.eodsRecords[0].closer_name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <Badge className={`text-lg px-4 py-2 border-0 ${
                kb.conversion_status?.includes('purchased')
                  ? 'bg-green-500 text-white'
                  : 'bg-yellow-500 text-white'
              }`}>
                {kb.conversion_status?.includes('purchased') ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    已成交
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5 mr-2" />
                    進行中
                  </>
                )}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white border-0 shadow-md rounded-xl">
            <CardContent className="pt-6">
              <Calendar className="w-5 h-5 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">首次接觸</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {stats?.firstContact ? format(new Date(stats.firstContact), 'yyyy-MM-dd') : '-'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-md rounded-xl">
            <CardContent className="pt-6">
              <Clock className="w-5 h-5 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">最後互動</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {stats?.lastInteraction ? format(new Date(stats.lastInteraction), 'yyyy-MM-dd') : '-'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-md rounded-xl">
            <CardContent className="pt-6">
              <DollarSign className="w-5 h-5 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">總消費</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                ${stats?.totalSpent.toLocaleString() || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-md rounded-xl">
            <CardContent className="pt-6">
              <Award className="w-5 h-5 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">互動次數</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {stats?.totalInteractions || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="bg-white/80 backdrop-blur-sm p-1 rounded-xl shadow-md border border-gray-200">
            <TabsTrigger
              value="timeline"
              className="rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white px-6"
            >
              <Clock className="w-4 h-4 mr-2" />
              互動時間軸 ({timelineEvents.length})
            </TabsTrigger>
            <TabsTrigger
              value="insights"
              className="rounded-lg data-[state=active]:bg-purple-500 data-[state=active]:text-white px-6"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI 洞察
            </TabsTrigger>
          </TabsList>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="mt-6">
            <Card className="bg-white border-0 shadow-md rounded-xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center justify-between">
                  <span>互動歷史</span>
                  <Badge className="bg-blue-100 text-blue-700 border-0">
                    {stats?.totalClasses || 0} 堂課 · {stats?.totalConsultations || 0} 次諮詢
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timelineEvents.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>尚無互動記錄</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {timelineEvents.map((event, index) => (
                      <div
                        key={event.id}
                        className={`relative p-4 rounded-xl border-2 ${event.bgColor} ${event.borderColor} transition-all hover:shadow-md`}
                      >
                        {/* Connector Line */}
                        {index < timelineEvents.length - 1 && (
                          <div className="absolute left-[30px] top-[60px] w-0.5 h-8 bg-gray-200" />
                        )}

                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                              {event.icon}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-bold text-gray-900">{event.title}</h3>
                                <p className="text-sm text-gray-600 mt-1">{event.description}</p>

                                {event.amount && (
                                  <Badge className="bg-green-100 text-green-700 border-0 mt-2">
                                    金額: ${event.amount.toLocaleString()}
                                  </Badge>
                                )}
                                {event.probability && (
                                  <Badge className="bg-purple-100 text-purple-700 border-0 mt-2">
                                    轉高概率: {event.probability}%
                                  </Badge>
                                )}
                              </div>
                              <div className="text-right text-sm text-gray-500">
                                <p>{event.date}</p>
                                <p>{event.time}</p>
                              </div>
                            </div>

                            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                              {event.teacher && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {event.teacher}
                                </span>
                              )}
                              {event.consultant && (
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" />
                                  {event.consultant}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="insights" className="mt-6">
            {aiInsights ? (
              <div className="grid grid-cols-1 gap-6">
                {/* 轉高概率 */}
                {aiInsights.conversionProbability > 0 && (
                  <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Target className="w-6 h-6 text-purple-600" />
                          <span className="text-lg font-bold text-gray-900">轉高概率預測</span>
                        </div>
                        <span className="text-3xl font-bold text-purple-600">
                          {aiInsights.conversionProbability}%
                        </span>
                      </div>
                      <Progress value={aiInsights.conversionProbability} className="h-3" />
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 痛點分析 */}
                  {aiInsights.painPoints.length > 0 && (
                    <Card className="bg-white border-0 shadow-md rounded-xl">
                      <CardHeader className="border-b border-gray-100">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <AlertCircle className="w-5 h-5 text-red-500" />
                          痛點分析
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <ul className="space-y-3">
                          {aiInsights.painPoints.map((point, index) => (
                            <li key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                              <span className="text-red-500 font-bold">•</span>
                              <span className="text-sm text-gray-700">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* 目標與動機 */}
                  {(aiInsights.goals || aiInsights.motivation) && (
                    <Card className="bg-white border-0 shadow-md rounded-xl">
                      <CardHeader className="border-b border-gray-100">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Target className="w-5 h-5 text-blue-500" />
                          目標與動機
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-3">
                        {aiInsights.goals && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-xs font-medium text-gray-500 mb-1">期望結果</p>
                            <p className="text-sm text-gray-700">{aiInsights.goals}</p>
                          </div>
                        )}
                        {aiInsights.motivation && (
                          <div className="p-3 bg-green-50 rounded-lg">
                            <p className="text-xs font-medium text-gray-500 mb-1">學習動機</p>
                            <p className="text-sm text-gray-700">{aiInsights.motivation}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* AI 策略建議 */}
                {(aiInsights.conversionStrategy || aiInsights.nextSteps) && (
                  <Card className="bg-white border-0 shadow-md rounded-xl">
                    <CardHeader className="border-b border-gray-100">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        AI 策略建議
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      {aiInsights.conversionStrategy && (
                        <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                          <p className="text-xs font-medium text-gray-500 mb-2">轉高策略</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {aiInsights.conversionStrategy}
                          </p>
                        </div>
                      )}
                      {aiInsights.nextSteps && (
                        <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                          <p className="text-xs font-medium text-gray-500 mb-2">下一步行動</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {aiInsights.nextSteps}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="bg-white border-0 shadow-md rounded-xl">
                <CardContent className="pt-12 pb-12 text-center text-gray-500">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>尚無 AI 洞察資料</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

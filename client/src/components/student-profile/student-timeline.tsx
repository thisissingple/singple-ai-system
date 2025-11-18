/**
 * Student Timeline
 * 學員互動時間軸
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, GraduationCap, MessageSquare, ShoppingCart } from 'lucide-react';
import type {
  TrialClassRecord,
  EodsRecord,
  PurchaseRecord,
  AIAnalysisRecord,
} from '@/hooks/use-student-profile';

interface TimelineEvent {
  id: string;
  type: 'class' | 'consultation' | 'purchase' | 'analysis';
  date: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

interface StudentTimelineProps {
  trialClasses: TrialClassRecord[];
  eodsRecords: EodsRecord[];
  purchases: PurchaseRecord[];
  aiAnalyses: AIAnalysisRecord[];
}

export function StudentTimeline({
  trialClasses,
  eodsRecords,
  purchases,
  aiAnalyses,
}: StudentTimelineProps) {
  // 合併所有事件並排序
  const events: TimelineEvent[] = [
    ...trialClasses.map((c) => ({
      id: c.id,
      type: 'class' as const,
      date: c.class_date,
      title: `上課記錄 - ${c.teacher_name || '教師未知'}`,
      description: c.notes || undefined,
      metadata: {
        courseType: c.course_type,
        attendanceStatus: c.attendance_status,
      },
    })),
    ...eodsRecords.map((e) => ({
      id: e.id,
      type: 'consultation' as const,
      date: e.deal_date || e.created_at || '',
      title: `諮詢記錄 - ${e.closer_name || '諮詢顧問'}`,
      description: e.consultation_notes || undefined,
      metadata: {
        planName: e.plan_name,
        dealAmount: e.deal_amount,
        dealStatus: e.deal_status,
      },
    })),
    ...purchases.map((p) => ({
      id: p.id,
      type: 'purchase' as const,
      date: p.purchase_date,
      title: `購買記錄 - ${p.course_type || '課程'}`,
      description: undefined,
      metadata: {
        amount: p.amount,
        status: p.status,
        paymentMethod: p.payment_method,
      },
    })),
    ...aiAnalyses.map((a) => ({
      id: a.id,
      type: 'analysis' as const,
      date: a.analyzed_at,
      title: 'AI 品質分析',
      description: a.ai_suggestions || undefined,
      metadata: {
        overallScore: a.overall_score,
        teachingScore: a.teaching_score,
      },
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'class':
        return <GraduationCap className="w-5 h-5 text-blue-600" />;
      case 'consultation':
        return <MessageSquare className="w-5 h-5 text-purple-600" />;
      case 'purchase':
        return <ShoppingCart className="w-5 h-5 text-green-600" />;
      case 'analysis':
        return <Calendar className="w-5 h-5 text-orange-600" />;
    }
  };

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'class':
        return 'bg-blue-100 border-blue-300';
      case 'consultation':
        return 'bg-purple-100 border-purple-300';
      case 'purchase':
        return 'bg-green-100 border-green-300';
      case 'analysis':
        return 'bg-orange-100 border-orange-300';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>互動歷程時間軸</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">尚無互動記錄</div>
        ) : (
          <div className="relative pl-8">
            {/* 時間軸線 */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

            {/* 事件列表 */}
            <div className="space-y-6">
              {events.map((event, index) => (
                <div key={event.id} className="relative">
                  {/* 時間軸圓點 */}
                  <div
                    className={`absolute -left-[1.875rem] top-1 w-8 h-8 rounded-full border-2 flex items-center justify-center ${getEventColor(
                      event.type
                    )}`}
                  >
                    {getEventIcon(event.type)}
                  </div>

                  {/* 事件內容 */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{event.title}</h4>
                      <span className="text-xs text-muted-foreground">{formatDate(event.date)}</span>
                    </div>

                    {event.description && (
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    )}

                    {/* Metadata */}
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {event.type === 'purchase' && event.metadata.amount && (
                          <Badge variant="outline" className="text-xs">
                            <DollarSign className="w-3 h-3 mr-1" />
                            NT$ {event.metadata.amount.toLocaleString()}
                          </Badge>
                        )}
                        {event.type === 'consultation' && event.metadata.dealAmount && (
                          <Badge variant="outline" className="text-xs">
                            <DollarSign className="w-3 h-3 mr-1" />
                            NT$ {event.metadata.dealAmount.toLocaleString()}
                          </Badge>
                        )}
                        {event.type === 'analysis' && event.metadata.overallScore && (
                          <Badge variant="outline" className="text-xs">
                            評分: {event.metadata.overallScore}
                          </Badge>
                        )}
                        {event.metadata.courseType && (
                          <Badge variant="secondary" className="text-xs">
                            {event.metadata.courseType}
                          </Badge>
                        )}
                        {event.metadata.planName && (
                          <Badge variant="secondary" className="text-xs">
                            {event.metadata.planName}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

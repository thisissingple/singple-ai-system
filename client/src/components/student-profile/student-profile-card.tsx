/**
 * Student Profile Card
 * 學員檔案總覽卡片
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Calendar, TrendingUp, CheckCircle2, Clock, DollarSign } from 'lucide-react';
import type { StudentKnowledgeBase } from '@/hooks/use-student-profile';

interface StudentProfileCardProps {
  kb: StudentKnowledgeBase;
  totalAiCost?: number;
}

export function StudentProfileCard({ kb, totalAiCost = 0 }: StudentProfileCardProps) {
  const getConversionStatusText = () => {
    switch (kb.conversion_status) {
      case 'renewed_high':
        return '已續課高價';
      case 'purchased_high':
        return '已購買高價';
      case 'purchased_trial':
        return '已購買體驗課';
      case 'not_purchased':
        return '未購買';
      default:
        return '-';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-TW');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">{kb.student_name}</CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Mail className="w-4 h-4" />
                {kb.student_email}
              </div>
            </div>
          </div>
          <div className="text-sm font-medium text-gray-700">
            {getConversionStatusText()}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* 總上課次數 */}
          <div className="flex flex-col gap-1">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              上課次數
            </div>
            <div className="text-2xl font-bold">{kb.total_classes}</div>
          </div>

          {/* 總諮詢次數 */}
          <div className="flex flex-col gap-1">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              諮詢次數
            </div>
            <div className="text-2xl font-bold">{kb.total_consultations}</div>
          </div>

          {/* 總互動次數 */}
          <div className="flex flex-col gap-1">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              總互動
            </div>
            <div className="text-2xl font-bold">{kb.total_interactions}</div>
          </div>

          {/* AI 花費 */}
          <div className="flex flex-col gap-1">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              AI 成本
            </div>
            <div className="text-lg font-bold text-orange-600">
              ${totalAiCost.toFixed(4)}
            </div>
          </div>

          {/* 首次接觸 */}
          <div className="flex flex-col gap-1">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="w-4 h-4" />
              首次接觸
            </div>
            <div className="text-sm font-medium">{formatDate(kb.first_contact_date)}</div>
          </div>
        </div>

        {/* 基本資訊 */}
        {kb.profile_summary?.basicInfo && Object.keys(kb.profile_summary.basicInfo).length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-semibold mb-2">基本資訊</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {kb.profile_summary.basicInfo.age && (
                <div>
                  <span className="text-muted-foreground">年齡:</span>{' '}
                  <span className="font-medium">{kb.profile_summary.basicInfo.age}</span>
                </div>
              )}
              {kb.profile_summary.basicInfo.occupation && (
                <div>
                  <span className="text-muted-foreground">職業:</span>{' '}
                  <span className="font-medium">{kb.profile_summary.basicInfo.occupation}</span>
                </div>
              )}
              {kb.profile_summary.basicInfo.decisionMaker !== undefined && (
                <div>
                  <span className="text-muted-foreground">決策者:</span>{' '}
                  <span className="font-medium">
                    {kb.profile_summary.basicInfo.decisionMaker ? '是' : '否'}
                  </span>
                </div>
              )}
              {kb.profile_summary.basicInfo.priceSensitivity && (
                <div>
                  <span className="text-muted-foreground">價格敏感度:</span>{' '}
                  <span className="font-medium">{kb.profile_summary.basicInfo.priceSensitivity}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

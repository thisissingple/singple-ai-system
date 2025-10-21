/**
 * AI Suggestions Component
 * Displays AI-generated suggestions for daily/weekly/monthly periods
 * Future: Will integrate with audio transcript analysis
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Bot, Lightbulb, TrendingUp, Target, Mic } from 'lucide-react';
import type { AISuggestions, PeriodType } from '@/types/trial-report';

interface AISuggestionsProps {
  suggestions: AISuggestions;
  period: PeriodType;
}

export function AISuggestions({ suggestions, period }: AISuggestionsProps) {
  const getSuggestionsByPeriod = (): string[] => {
    switch (period) {
      case 'daily':
        return suggestions.daily;
      case 'weekly':
        return suggestions.weekly;
      case 'monthly':
        return suggestions.monthly;
      default:
        return suggestions.daily;
    }
  };

  const periodLabels = {
    daily: '今日',
    weekly: '本週',
    monthly: '本月',
  };

  const currentSuggestions = getSuggestionsByPeriod();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Current Period Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI 智能建議
          </CardTitle>
          <CardDescription>
            基於{periodLabels[period]}數據分析，提供以下行動建議
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentSuggestions.map((suggestion, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="mt-0.5">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">{index + 1}</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm leading-relaxed">{suggestion}</p>
              </div>
            </div>
          ))}

          {currentSuggestions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>暫無 AI 建議</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strategic Insights & Future Features */}
      <div className="space-y-6">
        {/* High-level Strategy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              高階策略方向
            </CardTitle>
            <CardDescription>長期發展建議</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm">
                持續優化體驗課品質，目標將轉換率提升至 60% 以上
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm">
                建議開發線上課程系統，擴大服務範圍與規模化營運
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Target className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm">加強教師培訓，分享優秀教師的成功經驗</p>
            </div>
          </CardContent>
        </Card>

        {/* Audio Analysis Placeholder */}
        <Card className="border-dashed border-2 border-muted">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-orange-600" />
              音檔智能分析
              <Badge variant="outline" className="ml-auto">
                開發中
              </Badge>
            </CardTitle>
            <CardDescription>
              未來功能：整合上課錄音 AI 分析，提供更精準的建議
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Mic className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <div className="space-y-2">
                  <p className="font-semibold">預計功能：</p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                    <li>自動分析上課錄音，識別學生興趣點與疑慮</li>
                    <li>評估教師授課品質與互動效果</li>
                    <li>提取關鍵對話片段，輔助銷售跟進</li>
                    <li>生成個性化的學生追蹤建議</li>
                  </ul>
                  {suggestions.audioInsights && suggestions.audioInsights.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="font-semibold mb-2 text-foreground">範例分析：</p>
                      {suggestions.audioInsights.map((insight, idx) => (
                        <p key={idx} className="text-xs text-muted-foreground italic mb-1">
                          {insight}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

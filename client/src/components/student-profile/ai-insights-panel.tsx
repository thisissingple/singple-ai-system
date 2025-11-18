/**
 * AI Insights Panel
 * AI 預生成洞察面板
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import type { StudentKnowledgeBase } from '@/hooks/use-student-profile';
import ReactMarkdown from 'react-markdown';

interface AIInsightsPanelProps {
  kb: StudentKnowledgeBase;
}

export function AIInsightsPanel({ kb }: AIInsightsPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    painPointAnalysis: false,
    conversionStrategy: false,
    executionEvaluation: false,
    nextSteps: false,
  });

  const insights = kb.ai_pregenerated_insights;

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const hasAnyInsights =
    insights?.painPointAnalysis ||
    insights?.conversionStrategy ||
    insights?.executionEvaluation ||
    insights?.nextSteps;

  if (!hasAnyInsights) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <CardTitle>AI 智能洞察</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            尚無 AI 預生成的洞察分析
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('zh-TW');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <CardTitle>AI 智能洞察</CardTitle>
          </div>
          {insights?.generatedAt && (
            <span className="text-xs text-muted-foreground">
              更新於: {formatDate(insights.generatedAt)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 轉換機率 */}
        {insights?.conversionProbability !== undefined && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border rounded-lg p-4">
            <div className="text-sm font-semibold text-muted-foreground mb-2">轉換機率預測</div>
            <div className="flex items-center gap-3">
              <div className="text-4xl font-bold text-blue-600">
                {(insights.conversionProbability * 100).toFixed(0)}%
              </div>
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all"
                    style={{ width: `${insights.conversionProbability * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 痛點分析 */}
        {insights?.painPointAnalysis && (
          <div className="border rounded-lg">
            <Button
              variant="ghost"
              className="w-full justify-between p-4 h-auto"
              onClick={() => toggleSection('painPointAnalysis')}
            >
              <span className="font-semibold">痛點深度分析</span>
              {expandedSections.painPointAnalysis ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            {expandedSections.painPointAnalysis && (
              <div className="p-4 pt-0 prose prose-sm max-w-none">
                <ReactMarkdown>{insights.painPointAnalysis}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* 轉換策略 */}
        {insights?.conversionStrategy && (
          <div className="border rounded-lg">
            <Button
              variant="ghost"
              className="w-full justify-between p-4 h-auto"
              onClick={() => toggleSection('conversionStrategy')}
            >
              <span className="font-semibold">轉換策略建議</span>
              {expandedSections.conversionStrategy ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            {expandedSections.conversionStrategy && (
              <div className="p-4 pt-0 prose prose-sm max-w-none">
                <ReactMarkdown>{insights.conversionStrategy}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* 執行評估 */}
        {insights?.executionEvaluation && (
          <div className="border rounded-lg">
            <Button
              variant="ghost"
              className="w-full justify-between p-4 h-auto"
              onClick={() => toggleSection('executionEvaluation')}
            >
              <span className="font-semibold">執行評估</span>
              {expandedSections.executionEvaluation ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            {expandedSections.executionEvaluation && (
              <div className="p-4 pt-0 prose prose-sm max-w-none">
                <ReactMarkdown>{insights.executionEvaluation}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* 下一步行動 */}
        {insights?.nextSteps && (
          <div className="border rounded-lg">
            <Button
              variant="ghost"
              className="w-full justify-between p-4 h-auto"
              onClick={() => toggleSection('nextSteps')}
            >
              <span className="font-semibold">下一步行動建議</span>
              {expandedSections.nextSteps ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            {expandedSections.nextSteps && (
              <div className="p-4 pt-0 prose prose-sm max-w-none">
                <ReactMarkdown>{insights.nextSteps}</ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Consultation Quality Detail Page
 * Displays AI analysis results for a consultation
 */

import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useFilteredSidebar } from '@/hooks/use-sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Trash2,
} from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

function ConsultationQualityDetailContent() {
  const { eodId } = useParams<{ eodId: string }>();
  const [, navigate] = useLocation();
  const [deleting, setDeleting] = useState(false);

  // Fetch consultation data
  const { data, isLoading, error } = useQuery<{ success: boolean; data: any }>({
    queryKey: ['consultation-quality-detail', eodId],
    queryFn: async () => {
      const response = await fetch(`/api/consultation-quality/${eodId}`);
      if (!response.ok) throw new Error('Failed to fetch consultation detail');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const record = data?.data;

  // Handle delete analysis
  const handleDelete = async () => {
    if (!confirm('確定要刪除此 AI 分析嗎？刪除後可重新分析。')) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/consultation-quality/${eodId}/analysis`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '刪除失敗');
      }

      alert('AI 分析已刪除');
      navigate('/reports/consultants');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">載入中...</div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">載入資料時發生錯誤</div>
      </div>
    );
  }

  // Parse JSON fields
  const strengths = record.strengths ? (typeof record.strengths === 'string' ? JSON.parse(record.strengths) : record.strengths) : [];
  const improvements = record.improvements ? (typeof record.improvements === 'string' ? JSON.parse(record.improvements) : record.improvements) : [];
  const recommendations = record.recommendations ? (typeof record.recommendations === 'string' ? JSON.parse(record.recommendations) : record.recommendations) : [];

  // Prepare radar chart data
  const radarData = [
    { dimension: '建立關係', score: record.rapport_building_score || 0 },
    { dimension: '需求分析', score: record.needs_analysis_score || 0 },
    { dimension: '異議處理', score: record.objection_handling_score || 0 },
    { dimension: '成交技巧', score: record.closing_technique_score || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/reports/consultants')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回列表
          </Button>
          <div>
            <h1 className="text-3xl font-bold">諮詢品質 AI 分析</h1>
            <p className="text-muted-foreground mt-1">
              學員：{record.student_name} | 諮詢師：{record.closer_name}
            </p>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {deleting ? '刪除中...' : '刪除分析'}
        </Button>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>總體評價</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-6xl font-bold text-blue-600">{record.overall_rating || 'N/A'}</div>
              <div className="text-sm text-muted-foreground mt-2">總體評分（滿分 10 分）</div>
            </div>
            <div className="flex-1">
              <p className="text-lg">{record.overall_comment || '無總體評語'}</p>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>諮詢日期：{record.consultation_date ? new Date(record.consultation_date).toLocaleDateString('zh-TW') : '-'}</p>
                <p>分析時間：{record.analyzed_at ? new Date(record.analyzed_at).toLocaleString('zh-TW') : '-'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transcript */}
      {record.consultation_transcript && (
        <Card>
          <CardHeader>
            <CardTitle>諮詢轉錄文字</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-mono text-sm">{record.consultation_transcript}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>評分維度雷達圖</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="dimension" />
              <PolarRadiusAxis domain={[0, 10]} />
              <Radar name="評分" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <h4 className="font-semibold mb-2">建立關係（Rapport Building）</h4>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold text-blue-600">{record.rapport_building_score || 'N/A'} / 10</span>
              </div>
              <p className="text-sm text-muted-foreground">{record.rapport_building_comment || '無評語'}</p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">需求分析（Needs Analysis）</h4>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold text-blue-600">{record.needs_analysis_score || 'N/A'} / 10</span>
              </div>
              <p className="text-sm text-muted-foreground">{record.needs_analysis_comment || '無評語'}</p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">異議處理（Objection Handling）</h4>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold text-blue-600">{record.objection_handling_score || 'N/A'} / 10</span>
              </div>
              <p className="text-sm text-muted-foreground">{record.objection_handling_comment || '無評語'}</p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">成交技巧（Closing Technique）</h4>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold text-blue-600">{record.closing_technique_score || 'N/A'} / 10</span>
              </div>
              <p className="text-sm text-muted-foreground">{record.closing_technique_comment || '無評語'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strengths */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ThumbsUp className="h-5 w-5 text-green-600" />
            <CardTitle>亮點分析</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {strengths.length === 0 ? (
            <p className="text-muted-foreground">無亮點資料</p>
          ) : (
            <div className="space-y-4">
              {strengths.map((item: any, index: number) => (
                <div key={index} className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold">{item.point}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{item.evidence}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weaknesses/Improvements */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <CardTitle>待改進之處</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {improvements.length === 0 ? (
            <p className="text-muted-foreground">無待改進資料</p>
          ) : (
            <div className="space-y-4">
              {improvements.map((item: any, index: number) => (
                <div key={index} className="border-l-4 border-yellow-500 pl-4">
                  <h4 className="font-semibold">{item.point}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{item.evidence}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-blue-600" />
            <CardTitle>行動建議</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <p className="text-muted-foreground">無行動建議資料</p>
          ) : (
            <div className="space-y-6">
              {recommendations.map((item: any, index: number) => (
                <div key={index} className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                      優先級 {item.priority || 'N/A'}
                    </span>
                    <h4 className="font-semibold">{item.suggestion}</h4>
                  </div>
                  <div className="text-sm space-y-2">
                    <p><span className="font-medium">具體做法：</span>{item.method}</p>
                    <p><span className="font-medium">預期效果：</span>{item.expectedEffect}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConsultationQualityDetailPage() {
  const filteredSidebar = useFilteredSidebar();

  return (
    <DashboardLayout sidebarSections={filteredSidebar} title="諮詢品質分析">
      <ConsultationQualityDetailContent />
    </DashboardLayout>
  );
}

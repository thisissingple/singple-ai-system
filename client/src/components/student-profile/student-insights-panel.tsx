/**
 * Student Insights Panel
 * 學員洞察面板 (痛點、目標、心理狀態、轉換障礙)
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Target, Brain, XCircle, TrendingUp } from 'lucide-react';
import type { StudentProfileSummary } from '@/hooks/use-student-profile';

interface StudentInsightsPanelProps {
  profileSummary: StudentProfileSummary;
}

export function StudentInsightsPanel({ profileSummary }: StudentInsightsPanelProps) {
  const hasPainPoints = profileSummary.painPoints && profileSummary.painPoints.length > 0;
  const hasGoals = profileSummary.goals && Object.keys(profileSummary.goals).length > 0;
  const hasPsychology =
    profileSummary.psychologicalState && Object.keys(profileSummary.psychologicalState).length > 0;
  const hasBarriers =
    profileSummary.conversionBarriers && profileSummary.conversionBarriers.length > 0;

  if (!hasPainPoints && !hasGoals && !hasPsychology && !hasBarriers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>學員洞察</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            尚無 AI 累積的學員洞察資料
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 痛點分析 */}
      {hasPainPoints && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <CardTitle>痛點分析</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profileSummary.painPoints.map((pain, index) => (
                <div key={index} className="border-l-4 border-red-500 pl-3 py-2">
                  <div className="font-medium">{pain.point}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    提及次數: {pain.occurrences} 次
                  </div>
                  <div className="text-xs text-muted-foreground">
                    首次提及: {new Date(pain.firstMentioned).toLocaleDateString('zh-TW')}
                    {pain.lastMentioned !== pain.firstMentioned && (
                      <> • 最近: {new Date(pain.lastMentioned).toLocaleDateString('zh-TW')}</>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 學習目標 */}
      {hasGoals && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              <CardTitle>學習目標</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profileSummary.goals.desiredOutcome && (
                <div>
                  <div className="text-sm font-semibold text-muted-foreground">期望成果</div>
                  <div className="mt-1">{profileSummary.goals.desiredOutcome}</div>
                </div>
              )}
              {profileSummary.goals.intendedUsage && (
                <div>
                  <div className="text-sm font-semibold text-muted-foreground">預期用途</div>
                  <div className="mt-1">{profileSummary.goals.intendedUsage}</div>
                </div>
              )}
              {profileSummary.goals.motivation && (
                <div>
                  <div className="text-sm font-semibold text-muted-foreground">學習動機</div>
                  <div className="mt-1">{profileSummary.goals.motivation}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 心理狀態 */}
      {hasPsychology && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              <CardTitle>心理狀態</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profileSummary.psychologicalState.confidence && (
                <div>
                  <div className="text-sm font-semibold text-muted-foreground">自信程度</div>
                  <Badge variant="outline" className="mt-1">
                    {profileSummary.psychologicalState.confidence}
                  </Badge>
                </div>
              )}
              {profileSummary.psychologicalState.emotionalState && (
                <div>
                  <div className="text-sm font-semibold text-muted-foreground">情緒狀態</div>
                  <Badge variant="outline" className="mt-1">
                    {profileSummary.psychologicalState.emotionalState}
                  </Badge>
                </div>
              )}
              {profileSummary.psychologicalState.barriers &&
                profileSummary.psychologicalState.barriers.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-muted-foreground mb-2">
                      心理障礙
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profileSummary.psychologicalState.barriers.map((barrier, index) => (
                        <Badge key={index} variant="secondary">
                          {barrier}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 轉換障礙 */}
      {hasBarriers && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-orange-500" />
              <CardTitle>轉換障礙</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profileSummary.conversionBarriers.map((barrier, index) => (
                <Badge key={index} variant="destructive" className="text-sm">
                  {barrier}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 購買歷史 */}
      {profileSummary.purchaseHistory && profileSummary.purchaseHistory.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <CardTitle>購買歷史</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {profileSummary.purchaseHistory.map((purchase, index) => (
                <div key={index} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <div className="font-medium">{purchase.packageName}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(purchase.purchaseDate).toLocaleDateString('zh-TW')}
                    </div>
                  </div>
                  <div className="text-lg font-bold">NT$ {purchase.amount.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

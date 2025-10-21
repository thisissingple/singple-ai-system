/**
 * Raw Data MVP - 直接查詢原始資料
 * 跳過 ETL，使用 AI + raw_data 進行跨表查詢
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Users, DollarSign, Sparkles, AlertCircle, Brain } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SmartAIChat } from '@/components/smart-ai-chat';

export default function DashboardRawDataMVP() {
  const { toast } = useToast();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Database className="h-8 w-8 text-purple-600" />
        <div>
          <h1 className="text-3xl font-bold">Raw Data MVP</h1>
          <p className="text-muted-foreground">AI 智能學習查詢系統 - 越用越聰明</p>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <strong>AI 智能學習：</strong> 第一次問問題時，AI 會分析並請你確認理解是否正確。
              確認後，AI 會記住這個問題模式。下次遇到類似問題就會直接回答，不用再確認！
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different AI modes */}
      <Tabs defaultValue="smart" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="smart" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            智能學習模式
          </TabsTrigger>
          <TabsTrigger value="info" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            使用說明
          </TabsTrigger>
        </TabsList>

        <TabsContent value="smart" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="h-[600px]">
                <SmartAIChat />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 如何使用 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  如何使用
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium">1️⃣ 第一次問問題</p>
                  <p className="text-sm text-muted-foreground">
                    輸入自然語言問題，例如「Vicky 老師本月升高階的學生有哪些？」
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">2️⃣ 確認 AI 的理解</p>
                  <p className="text-sm text-muted-foreground">
                    AI 會顯示它的理解，如果正確就點擊「正確，記住」
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">3️⃣ AI 記住了！</p>
                  <p className="text-sm text-muted-foreground">
                    下次問類似問題，AI 會直接回答，不用再確認
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">4️⃣ 越用越聰明</p>
                  <p className="text-sm text-muted-foreground">
                    AI 會記錄每個問題的使用次數，常用的問題回答更快
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 支援的查詢 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  支援的查詢類型
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span><strong>上課記錄：</strong>查詢學生上課情況、教師授課統計</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span><strong>購買記錄：</strong>查詢購課學生、轉換率分析</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span><strong>成交記錄：</strong>查詢成交金額、業績統計</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span><strong>跨表查詢：</strong>自動關聯多張表，計算複雜指標</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span><strong>時間篩選：</strong>支援本週、本月、上週、上月等</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span><strong>教師篩選：</strong>按教師名稱篩選資料</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* 範例問題 */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-600" />
                  範例問題
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">📊 上課統計</p>
                    <ul className="space-y-1 text-sm">
                      <li>• 這週有幾位學生上課？</li>
                      <li>• Vicky 老師本月上了多少堂課？</li>
                      <li>• 本週上課的學生名單</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">💰 業績查詢</p>
                    <ul className="space-y-1 text-sm">
                      <li>• 哪些學生有買課？</li>
                      <li>• 本月成交金額是多少？</li>
                      <li>• Vicky 老師本月升高階的學生</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">🎯 轉換分析</p>
                    <ul className="space-y-1 text-sm">
                      <li>• 上過課但還沒買課的學生</li>
                      <li>• 已購課的學生數量</li>
                      <li>• 已成交學生的方案分布</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">📅 時間分析</p>
                    <ul className="space-y-1 text-sm">
                      <li>• 上週的成交學生</li>
                      <li>• 本月新增的購課記錄</li>
                      <li>• 上個月的業績總額</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 技術說明 */}
            <Card className="md:col-span-2 border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-purple-900 dark:text-purple-100 space-y-2">
                    <p><strong>AI 學習原理：</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>使用 OpenAI GPT-3.5 分析自然語言問題</li>
                      <li>將確認過的問題模式儲存到資料庫</li>
                      <li>下次遇到類似問題，直接從記憶庫查詢（免費且快速）</li>
                      <li>隨著使用次數增加，80% 的查詢將不再需要 AI 分析</li>
                      <li>第一個月成本約 $5 USD，之後降至 &lt; $1 USD</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

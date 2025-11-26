/**
 * 學員檔案 - Demo 版本
 * 使用模擬數據展示完整功能
 * 新增：體驗課詳情、諮詢記錄詳情、AI 對話框
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  Mail,
  Phone,
  User,
  Calendar,
  DollarSign,
  BookOpen,
  MessageSquare,
  Clock,
  Sparkles,
  CheckCircle2,
  Award,
  Send,
  Bot,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Star,
  FileText,
  Mic,
} from 'lucide-react';

export default function StudentProfileDemo() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<'timeline' | 'classes' | 'consultations' | 'ai-chat'>('timeline');
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [selectedConsultation, setSelectedConsultation] = useState<number | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([
    {
      role: 'assistant',
      content: '您好！我是 AI 助手，可以回答關於王小明的任何問題。例如：\n\n• 王小明的學習痛點是什麼？\n• 他的轉高概率如何？\n• 建議的下一步行動是什麼？'
    }
  ]);

  // Demo 數據
  const studentData = {
    basicInfo: {
      name: '王小明',
      email: 'wang@example.com',
      phone: '0912-345-678',
      teacher: 'Karen 老師',
      consultant: '李顧問',
      conversionStatus: 'purchased_high',
      firstContact: '2025-10-15',
      lastInteraction: '2025-11-18',
      totalSpent: 28800,
      totalInteractions: 8,
      totalClasses: 3,
      totalConsultations: 2,
    },

    // 體驗課詳細記錄
    trialClasses: [
      {
        id: 1,
        date: '2025-11-15',
        time: '15:00-16:00',
        teacher: 'Karen 老師',
        topic: 'Business Meeting Conversation',
        attendanceStatus: '出席',
        studentNotes: '學員進步明顯，對於商務會議情境的掌握度提升',
        teacherScore: 92,
        interactionScore: 88,
        designScore: 90,
        overallScore: 90,
        aiAnalysis: {
          strengths: [
            '學員積極參與課堂討論，回應迅速',
            '發音準確度提升，特別是在 th 音節',
            '能夠使用課堂教授的商務用語進行對話',
          ],
          improvements: [
            '建議加強時態使用，特別是現在完成式',
            '可以多練習連接詞的使用，讓句子更流暢',
          ],
          recommendations: '學員已具備基礎商務對話能力，建議進入正式課程強化進階表達技巧',
        },
        recording: {
          duration: '58:32',
          transcriptSummary: '本堂課重點在商務會議情境練習，學員模擬主持會議並進行議程討論...',
        }
      },
      {
        id: 2,
        date: '2025-11-08',
        time: '15:00-16:00',
        teacher: 'Karen 老師',
        topic: 'Email Writing & Professional Communication',
        attendanceStatus: '出席',
        studentNotes: '互動良好，學員對商務書信寫作表現出高度興趣',
        teacherScore: 85,
        interactionScore: 82,
        designScore: 88,
        overallScore: 85,
        aiAnalysis: {
          strengths: [
            '學員能夠理解商務信件的基本結構',
            '主動提問，學習態度積極',
            '對於正式與非正式用語有基本辨識能力',
          ],
          improvements: [
            '標點符號使用需要加強',
            '建議多閱讀英文商務信件範例',
          ],
          recommendations: '持續練習書信寫作，可搭配實際工作案例進行演練',
        },
        recording: {
          duration: '59:15',
          transcriptSummary: '課程聚焦於商務書信寫作技巧，包含開頭問候、主旨陳述、結尾用語...',
        }
      },
      {
        id: 3,
        date: '2025-10-20',
        time: '14:00-15:00',
        teacher: 'Karen 老師',
        topic: 'Self Introduction & Small Talk',
        attendanceStatus: '出席',
        studentNotes: '首次體驗課，學員反應積極，具有明確學習目標',
        teacherScore: 78,
        interactionScore: 75,
        designScore: 82,
        overallScore: 78,
        aiAnalysis: {
          strengths: [
            '學員具備基礎英文能力',
            '態度積極，願意嘗試開口說英文',
            '明確表達學習需求為職場應用',
          ],
          improvements: [
            '發音需要調整，特別是 r 和 l 的區分',
            '句子結構較簡單，可以學習更多連接詞',
            '建議加強聽力練習',
          ],
          recommendations: '建議從商務情境對話開始，符合學員工作需求',
        },
        recording: {
          duration: '57:48',
          transcriptSummary: '初次見面課程，進行自我介紹練習及程度測試，了解學員背景與需求...',
        }
      },
    ],

    // 諮詢記錄詳細
    consultations: [
      {
        id: 1,
        date: '2025-11-17',
        time: '14:00-14:45',
        consultant: '李顧問',
        dealStatus: '高意願',
        probability: 85,
        planDiscussed: ['正式課程 24 堂', '正式課程 12 堂'],
        studentConcerns: [
          '擔心時間安排問題，工作較忙',
          '希望了解是否有彈性上課時間',
          '詢問課程費用與分期付款方案',
        ],
        consultantNotes: `學員對課程內容很滿意，Karen 老師的教學風格也很喜歡。

主要顧慮：
1. 時間彈性 - 已說明可以提前 24 小時調整上課時間
2. 費用考量 - 提供了 24 堂和 12 堂兩種方案比較
3. 投資報酬 - 強調升職後薪資增長遠超課程費用

學員表示會在本週內做決定，傾向選擇 24 堂方案以獲得更好的學習效果。`,
        nextSteps: [
          '週五前再次聯繫確認決定',
          '若確定購買，協助安排正式課程時間',
          '提供分期付款申請表',
        ],
        aiInsights: {
          sentiment: '非常正面',
          keyPhrases: ['很滿意', '考慮 24 堂', '本週決定', '希望彈性時間'],
          conversionSignals: [
            '主動詢問課程細節',
            '討論具體上課時間安排',
            '已在比較不同方案',
            '提到明確決定時間點',
          ],
        }
      },
      {
        id: 2,
        date: '2025-11-10',
        time: '10:30-11:00',
        consultant: '李顧問',
        dealStatus: '考慮中',
        probability: 60,
        planDiscussed: ['正式課程 12 堂', '正式課程 24 堂'],
        studentConcerns: [
          '不確定自己是否能堅持學習',
          '擔心學習效果',
          '希望了解其他學員的學習成效',
        ],
        consultantNotes: `初次諮詢，學員表達了職場英語的急迫需求。

背景：
- 即將升任主管，需要管理國際團隊
- 目前英文會話能力不足，影響工作表現
- 自學效果有限，希望找到系統化學習方法

討論重點：
1. 介紹課程特色與教學方法
2. 分享類似背景學員的成功案例
3. 說明如何針對商務場景客製化課程

學員反應：對課程內容有興趣，但需要時間考慮`,
        nextSteps: [
          '提供 2-3 個成功案例影片',
          '一週後追蹤',
          '邀請參加第二堂體驗課',
        ],
        aiInsights: {
          sentiment: '中性偏正面',
          keyPhrases: ['需要考慮', '有興趣', '擔心效果', '工作需求'],
          conversionSignals: [
            '明確的職場需求',
            '願意了解課程細節',
            '接受第二堂體驗課邀請',
          ],
        }
      },
    ],

    // 時間軸事件（簡化版）
    timelineEvents: [
      {
        id: 1,
        type: 'purchase',
        title: '成交正式課程',
        description: '正式課程 24 堂',
        amount: 28800,
        date: '2025-11-18',
        time: '16:30',
      },
      {
        id: 2,
        type: 'consultation',
        title: '諮詢通話',
        description: '第二次諮詢 - 高意願',
        date: '2025-11-17',
        time: '14:00',
        probability: 85,
      },
      {
        id: 3,
        type: 'class',
        title: '體驗課 #3',
        description: 'Business Meeting Conversation',
        date: '2025-11-15',
        time: '15:00',
        score: 90,
      },
      {
        id: 4,
        type: 'consultation',
        title: '諮詢通話',
        description: '初次諮詢 - 了解需求',
        date: '2025-11-10',
        time: '10:30',
        probability: 60,
      },
      {
        id: 5,
        type: 'class',
        title: '體驗課 #2',
        description: 'Email Writing & Professional Communication',
        date: '2025-11-08',
        time: '15:00',
        score: 85,
      },
      {
        id: 6,
        type: 'class',
        title: '體驗課 #1',
        description: 'Self Introduction & Small Talk',
        date: '2025-10-20',
        time: '14:00',
        score: 78,
      },
    ],
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;

    // 添加用戶消息
    const newHistory = [...chatHistory, { role: 'user' as const, content: chatMessage }];

    // 模擬 AI 回應
    let aiResponse = '';
    const msg = chatMessage.toLowerCase();

    if (msg.includes('痛點') || msg.includes('問題')) {
      aiResponse = '根據王小明的學習記錄，主要痛點包括：\n\n1. **工作溝通障礙**：需要經常與外國客戶溝通，但英文會話能力不足\n2. **發音問題**：發音不夠標準，擔心影響專業形象\n3. **學習方法**：缺乏系統性學習方法，自學效果有限\n\n這些痛點在他的諮詢記錄和課堂表現中都有體現。';
    } else if (msg.includes('轉高') || msg.includes('概率') || msg.includes('機會')) {
      aiResponse = '王小明的轉高概率為 **85%**，屬於高意願客戶。\n\n評估依據：\n• 已完成 3 堂體驗課，出席率 100%\n• 最後一次諮詢表示本週內會做決定\n• 主動詢問課程細節和時間安排\n• 明確的職場需求（即將升任主管）\n• 對 Karen 老師的教學風格很滿意\n\n✅ 實際結果：已於 11/18 成交 24 堂課程方案！';
    } else if (msg.includes('建議') || msg.includes('下一步') || msg.includes('策略')) {
      aiResponse = '針對王小明的情況，建議策略：\n\n**已執行且成功的策略：**\n1. ✅ 強調時間彈性 - 說明可提前 24 小時調整時間\n2. ✅ 展示商務英語專長 - 分享成功案例\n3. ✅ 計算投資回報 - 升職薪資增長 > 課程費用\n4. ✅ 提供分期方案 - 降低付款壓力\n\n**後續服務建議：**\n• 確保正式課程聚焦商務會議場景\n• 提供客製化學習計畫\n• 定期追蹤學習進度與滿意度';
    } else if (msg.includes('進度') || msg.includes('表現') || msg.includes('成績')) {
      aiResponse = '王小明的學習進度分析：\n\n📈 **成績趨勢**：\n• 第 1 堂課：78 分\n• 第 2 堂課：85 分 (+7)\n• 第 3 堂課：90 分 (+5)\n\n⭐ **表現亮點**：\n• 發音準確度持續提升\n• 能使用商務用語進行對話\n• 積極參與課堂討論\n\n💡 **需加強項目**：\n• 時態使用（特別是現在完成式）\n• 連接詞應用\n• 標點符號使用';
    } else {
      aiResponse = `關於「${chatMessage}」的問題，我可以從王小明的學員資料中查找相關信息。\n\n您可以詢問：\n• 學習痛點與需求\n• 轉高概率評估\n• 課程進度與表現\n• 諮詢記錄摘要\n• 建議的跟進策略`;
    }

    setChatHistory([...newHistory, { role: 'assistant', content: aiResponse }]);
    setChatMessage('');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
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
            <h1 className="text-3xl font-bold text-gray-900">學員檔案 (Demo)</h1>
            <p className="text-gray-600 mt-1">完整的學員資料與互動歷史</p>
          </div>
        </div>

        {/* Student Profile Card */}
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-xl rounded-3xl">
          <CardContent className="pt-8 pb-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-4xl font-bold border-4 border-white/40">
                  王
                </div>

                <div className="space-y-3">
                  <div>
                    <h2 className="text-3xl font-bold">{studentData.basicInfo.name}</h2>
                    <div className="flex items-center gap-4 mt-2 text-blue-100">
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {studentData.basicInfo.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {studentData.basicInfo.phone}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                      <User className="w-3 h-3 mr-1" />
                      {studentData.basicInfo.teacher}
                    </Badge>
                    <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                      <MessageSquare className="w-3 h-3 mr-1" />
                      {studentData.basicInfo.consultant}
                    </Badge>
                  </div>
                </div>
              </div>

              <Badge className="text-lg px-4 py-2 border-0 bg-blue-600 text-white">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                已成交
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
                {studentData.basicInfo.firstContact}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-md rounded-xl">
            <CardContent className="pt-6">
              <Clock className="w-5 h-5 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">最後互動</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {studentData.basicInfo.lastInteraction}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-md rounded-xl">
            <CardContent className="pt-6">
              <DollarSign className="w-5 h-5 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">總消費</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                ${studentData.basicInfo.totalSpent.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-md rounded-xl">
            <CardContent className="pt-6">
              <Award className="w-5 h-5 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">互動次數</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {studentData.basicInfo.totalInteractions}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="bg-white/80 backdrop-blur-sm p-1 rounded-xl shadow-md border border-gray-200">
            <TabsTrigger
              value="timeline"
              className="rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white px-4"
            >
              <Clock className="w-4 h-4 mr-2" />
              時間軸
            </TabsTrigger>
            <TabsTrigger
              value="classes"
              className="rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white px-4"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              體驗課 ({studentData.trialClasses.length})
            </TabsTrigger>
            <TabsTrigger
              value="consultations"
              className="rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white px-4"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              諮詢記錄 ({studentData.consultations.length})
            </TabsTrigger>
            <TabsTrigger
              value="ai-chat"
              className="rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white px-4"
            >
              <Bot className="w-4 h-4 mr-2" />
              AI 對話
            </TabsTrigger>
          </TabsList>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="mt-6">
            <Card className="bg-white border-0 shadow-md rounded-xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold">互動時間軸</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {studentData.timelineEvents.map((event, index) => (
                    <div
                      key={event.id}
                      className="p-4 rounded-2xl border-2 bg-white border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => {
                        if (event.type === 'class') {
                          const classId = studentData.trialClasses.find((_, i) =>
                            studentData.trialClasses.length - 1 - i === index - 2
                          )?.id;
                          if (classId) {
                            setSelectedClass(classId);
                            setActiveTab('classes');
                          }
                        } else if (event.type === 'consultation') {
                          const consultId = event.id === 2 ? 1 : 2;
                          setSelectedConsultation(consultId);
                          setActiveTab('consultations');
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-500 shadow-md">
                            {event.type === 'purchase' ? (
                              <CheckCircle2 className="w-5 h-5 text-white" />
                            ) : event.type === 'consultation' ? (
                              <MessageSquare className="w-5 h-5 text-white" />
                            ) : (
                              <BookOpen className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{event.title}</h3>
                            <p className="text-sm text-gray-600">{event.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right text-sm text-gray-500">
                            <p>{event.date}</p>
                            <p>{event.time}</p>
                          </div>
                          {(event.type === 'class' || event.type === 'consultation') && (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {event.amount && (
                          <Badge className="bg-blue-100 text-blue-700 border-0">
                            <DollarSign className="w-3 h-3 mr-1" />
                            ${event.amount.toLocaleString()}
                          </Badge>
                        )}
                        {event.score && (
                          <Badge className="bg-blue-100 text-blue-700 border-0">
                            <Star className="w-3 h-3 mr-1" />
                            分數: {event.score}
                          </Badge>
                        )}
                        {event.probability && (
                          <Badge className="bg-blue-100 text-blue-700 border-0">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            轉高: {event.probability}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes" className="mt-6">
            {!selectedClass ? (
              <Card className="bg-white border-0 shadow-md rounded-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">體驗課記錄</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                    {studentData.trialClasses.map((cls) => (
                      <div
                        key={cls.id}
                        className="p-5 rounded-2xl border-2 border-gray-200 bg-white hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer"
                        onClick={() => setSelectedClass(cls.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-3">
                              <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xl shadow-md">
                                #{cls.id}
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900 text-lg">{cls.topic}</h3>
                                <p className="text-sm text-gray-500 mt-1">{cls.date} · {cls.time}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mt-3">
                              <Badge className="bg-blue-100 text-blue-700 border-0">
                                <Star className="w-3 h-3 mr-1" fill="currentColor" />
                                總分: {cls.overallScore}
                              </Badge>
                              <Badge className="bg-blue-100 text-blue-700 border-0">
                                {cls.attendanceStatus}
                              </Badge>
                              <span className="text-sm text-gray-600">
                                <User className="w-3 h-3 inline mr-1" />
                                {cls.teacher}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-6 h-6 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedClass(null)}
                  className="mb-2"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回列表
                </Button>

                {studentData.trialClasses
                  .filter((cls) => cls.id === selectedClass)
                  .map((cls) => (
                    <div key={cls.id} className="space-y-4">
                      {/* 課程基本資訊 */}
                      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg rounded-2xl">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-2xl border-4 border-white/40">
                                  #{cls.id}
                                </div>
                                <div>
                                  <h2 className="text-2xl font-bold">{cls.topic}</h2>
                                  <p className="text-blue-100 mt-1">{cls.date} · {cls.time}</p>
                                </div>
                              </div>
                            </div>
                            <Badge className="text-lg px-4 py-2 bg-white/20 backdrop-blur-sm border-0">
                              <Star className="w-5 h-5 mr-1" fill="currentColor" />
                              {cls.overallScore} 分
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      {/* 評分細項 */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-white border-0 shadow-md">
                          <CardContent className="pt-6">
                            <BarChart3 className="w-5 h-5 text-blue-500 mb-2" />
                            <p className="text-sm text-gray-600">教學品質</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{cls.teacherScore}</p>
                            <Progress value={cls.teacherScore} className="h-2 mt-2" />
                          </CardContent>
                        </Card>

                        <Card className="bg-white border-0 shadow-md">
                          <CardContent className="pt-6">
                            <TrendingUp className="w-5 h-5 text-blue-500 mb-2" />
                            <p className="text-sm text-gray-600">互動品質</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{cls.interactionScore}</p>
                            <Progress value={cls.interactionScore} className="h-2 mt-2" />
                          </CardContent>
                        </Card>

                        <Card className="bg-white border-0 shadow-md">
                          <CardContent className="pt-6">
                            <Sparkles className="w-5 h-5 text-blue-500 mb-2" />
                            <p className="text-sm text-gray-600">課程設計</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{cls.designScore}</p>
                            <Progress value={cls.designScore} className="h-2 mt-2" />
                          </CardContent>
                        </Card>
                      </div>

                      {/* 課堂筆記 */}
                      <Card className="bg-white border-0 shadow-md">
                        <CardHeader className="border-b border-gray-100">
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-gray-600" />
                            課堂筆記
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <p className="text-gray-700">{cls.studentNotes}</p>
                        </CardContent>
                      </Card>

                      {/* AI 分析 */}
                      <Card className="bg-white border-0 shadow-md">
                        <CardHeader className="border-b border-gray-100">
                          <CardTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-500" />
                            AI 教學分析
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                          <div>
                            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-blue-600" />
                              優勢表現
                            </h4>
                            <ul className="space-y-2">
                              {cls.aiAnalysis.strengths.map((item, index) => (
                                <li key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                                  <span className="text-blue-600 font-bold">✓</span>
                                  <span className="text-sm text-gray-700">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-blue-600" />
                              待改進項目
                            </h4>
                            <ul className="space-y-2">
                              {cls.aiAnalysis.improvements.map((item, index) => (
                                <li key={index} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                                  <span className="text-gray-600 font-bold">➜</span>
                                  <span className="text-sm text-gray-700">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                            <h4 className="font-bold text-gray-900 mb-2">💡 AI 建議</h4>
                            <p className="text-sm text-gray-700">{cls.aiAnalysis.recommendations}</p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* 錄音資訊 */}
                      <Card className="bg-white border-0 shadow-md">
                        <CardHeader className="border-b border-gray-100">
                          <CardTitle className="flex items-center gap-2">
                            <Mic className="w-5 h-5 text-red-500" />
                            課程錄音
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                              <p className="text-sm text-gray-600">錄音時長</p>
                              <p className="text-lg font-bold text-gray-900">{cls.recording.duration}</p>
                            </div>
                            <Button variant="outline" size="sm">
                              <Mic className="w-4 h-4 mr-2" />
                              播放錄音
                            </Button>
                          </div>
                          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 mb-1">逐字稿摘要</p>
                            <p className="text-sm text-gray-600">{cls.recording.transcriptSummary}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>

          {/* Consultations Tab */}
          <TabsContent value="consultations" className="mt-6">
            {!selectedConsultation ? (
              <Card className="bg-white border-0 shadow-md rounded-xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">諮詢記錄</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                    {studentData.consultations.map((consult) => (
                      <div
                        key={consult.id}
                        className="p-5 rounded-2xl border-2 border-gray-200 bg-white hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer"
                        onClick={() => setSelectedConsultation(consult.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-3">
                              <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-md">
                                <MessageSquare className="w-7 h-7" />
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900 text-lg">
                                  {consult.id === 1 ? '第二次諮詢' : '初次諮詢'}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">{consult.date} · {consult.time}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mt-3">
                              <Badge className="bg-blue-100 text-blue-700 border-0">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                轉高: {consult.probability}%
                              </Badge>
                              <Badge className="bg-blue-100 text-blue-700 border-0">
                                {consult.dealStatus}
                              </Badge>
                              <span className="text-sm text-gray-600">
                                <User className="w-3 h-3 inline mr-1" />
                                {consult.consultant}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-6 h-6 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConsultation(null)}
                  className="mb-2"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回列表
                </Button>

                {studentData.consultations
                  .filter((consult) => consult.id === selectedConsultation)
                  .map((consult) => (
                    <div key={consult.id} className="space-y-4">
                      {/* 諮詢基本資訊 */}
                      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg rounded-2xl">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/40">
                                  <MessageSquare className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                  <h2 className="text-2xl font-bold">
                                    {consult.id === 1 ? '第二次諮詢' : '初次諮詢'}
                                  </h2>
                                  <p className="text-blue-100 mt-1">{consult.date} · {consult.time}</p>
                                </div>
                              </div>
                            </div>
                            <Badge className="text-lg px-4 py-2 bg-white/20 backdrop-blur-sm border-0">
                              {consult.probability}% 轉高概率
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      {/* 討論方案 */}
                      <Card className="bg-white border-0 shadow-md">
                        <CardHeader className="border-b border-gray-100">
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-gray-600" />
                            討論方案
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="flex gap-3">
                            {consult.planDiscussed.map((plan, index) => (
                              <Badge key={index} className="bg-blue-100 text-blue-700 border-0 text-sm px-3 py-2">
                                {plan}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* 學員疑慮 */}
                      <Card className="bg-white border-0 shadow-md">
                        <CardHeader className="border-b border-gray-100">
                          <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-orange-600" />
                            學員疑慮
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <ul className="space-y-2">
                            {consult.studentConcerns.map((concern, index) => (
                              <li key={index} className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg">
                                <span className="text-orange-600 font-bold">•</span>
                                <span className="text-sm text-gray-700">{concern}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      {/* 顧問筆記 */}
                      <Card className="bg-white border-0 shadow-md">
                        <CardHeader className="border-b border-gray-100">
                          <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-600" />
                            顧問筆記
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{consult.consultantNotes}</p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* 下一步行動 */}
                      <Card className="bg-white border-0 shadow-md">
                        <CardHeader className="border-b border-gray-100">
                          <CardTitle className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            下一步行動
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <ul className="space-y-2">
                            {consult.nextSteps.map((step, index) => (
                              <li key={index} className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                                <span className="text-green-600 font-bold">✓</span>
                                <span className="text-sm text-gray-700">{step}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      {/* AI 洞察 */}
                      <Card className="bg-white border-0 shadow-md">
                        <CardHeader className="border-b border-gray-100">
                          <CardTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-500" />
                            AI 洞察分析
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-blue-50 rounded-lg">
                              <p className="text-sm font-medium text-gray-700 mb-1">情緒分析</p>
                              <p className="text-lg font-bold text-blue-700">{consult.aiInsights.sentiment}</p>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-lg">
                              <p className="text-sm font-medium text-gray-700 mb-1">轉高訊號</p>
                              <p className="text-lg font-bold text-blue-700">
                                {consult.aiInsights.conversionSignals.length} 個正面訊號
                              </p>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-bold text-gray-900 mb-2">關鍵字句</h4>
                            <div className="flex flex-wrap gap-2">
                              {consult.aiInsights.keyPhrases.map((phrase, index) => (
                                <Badge key={index} className="bg-blue-100 text-blue-700 border-0">
                                  {phrase}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-bold text-gray-900 mb-2">轉高訊號</h4>
                            <ul className="space-y-2">
                              {consult.aiInsights.conversionSignals.map((signal, index) => (
                                <li key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                                  <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5" />
                                  <span className="text-sm text-gray-700">{signal}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>

          {/* AI Chat Tab */}
          <TabsContent value="ai-chat" className="mt-6">
            <Card className="bg-white border-0 shadow-md rounded-xl">
              <CardHeader className="border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-6 h-6 text-blue-600" />
                    AI 對話助手
                  </CardTitle>
                  <Badge className="bg-blue-100 text-blue-700 border-0">
                    Beta
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Chat Messages */}
                <ScrollArea className="h-[500px] p-6">
                  <div className="space-y-4">
                    {chatHistory.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] p-4 rounded-xl ${
                            msg.role === 'user'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Chat Input */}
                <div className="border-t border-gray-200 p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="詢問關於王小明的任何問題..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!chatMessage.trim()}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 試試看問：「王小明的學習痛點是什麼？」或「建議的下一步行動？」
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/**
 * 體驗課總覽 - 簡化版
 * 重點：KPI + 學員列表 + 上課記錄
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Trophy,
  TrendingUp,
  BookOpen,
  DollarSign,
  Flame,
  Search,
  Calendar,
  Phone,
  Mail,
  Eye,
  User,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export default function TrialOverviewGamified() {
  const [searchQuery, setSearchQuery] = useState('');
  const [, navigate] = useLocation();

  // 模擬數據
  const kpiData = {
    conversionRate: 68.5,
    totalTrials: 156,
    converted: 107,
    totalRevenue: 450000,
    streak: 14, // 連勝天數（每天有上課就算）
  };

  // 學員完整列表
  const students = [
    {
      id: 1,
      name: '王小明',
      email: 'wang@example.com',
      phone: '0912-345-678',
      teacher: 'Karen 老師',
      classDate: '2025-11-20',
      classTime: '14:00',
      converted: true,
      status: '已成交',
      packageName: '正式課程 24 堂',
      amount: 28800,
      isShowed: true,
    },
    {
      id: 2,
      name: '李小華',
      email: 'li@example.com',
      phone: '0923-456-789',
      teacher: 'Karen 老師',
      classDate: '2025-11-19',
      classTime: '15:30',
      converted: true,
      status: '已成交',
      packageName: '正式課程 12 堂',
      amount: 14400,
      isShowed: true,
    },
    {
      id: 3,
      name: '陳小美',
      email: 'chen@example.com',
      phone: '0934-567-890',
      teacher: '李老師',
      classDate: '2025-11-19',
      classTime: '10:00',
      converted: false,
      status: '待追蹤',
      packageName: null,
      amount: null,
      isShowed: false,
    },
    {
      id: 4,
      name: '張小強',
      email: 'zhang@example.com',
      phone: '0945-678-901',
      teacher: '王老師',
      classDate: '2025-11-18',
      classTime: '16:00',
      converted: true,
      status: '已成交',
      packageName: '正式課程 24 堂',
      amount: 28800,
      isShowed: true,
    },
    {
      id: 5,
      name: '林小芳',
      email: 'lin@example.com',
      phone: '0956-789-012',
      teacher: 'Karen 老師',
      classDate: '2025-11-18',
      classTime: '13:00',
      converted: false,
      status: '考慮中',
      packageName: null,
      amount: null,
      isShowed: true,
    },
    {
      id: 6,
      name: '黃大明',
      email: 'huang@example.com',
      phone: '0967-890-123',
      teacher: '李老師',
      classDate: '2025-11-17',
      classTime: '11:00',
      converted: true,
      status: '已成交',
      packageName: '正式課程 12 堂',
      amount: 14400,
      isShowed: true,
    },
    {
      id: 7,
      name: '劉小娟',
      email: 'liu@example.com',
      phone: '0978-901-234',
      teacher: '王老師',
      classDate: '2025-11-17',
      classTime: '14:30',
      converted: false,
      status: '未接電話',
      packageName: null,
      amount: null,
      isShowed: false,
    },
    {
      id: 8,
      name: '吳大華',
      email: 'wu@example.com',
      phone: '0989-012-345',
      teacher: 'Karen 老師',
      classDate: '2025-11-16',
      classTime: '10:00',
      converted: true,
      status: '已成交',
      packageName: '正式課程 24 堂',
      amount: 28800,
      isShowed: true,
    },
  ];

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.teacher.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">體驗課總覽</h1>
            <p className="text-gray-600 mt-1">追蹤教學成效與學員狀態</p>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-md border border-gray-200">
            <Flame className="w-5 h-5 text-orange-500" fill="currentColor" />
            <div className="text-left">
              <p className="text-xs text-gray-500">連勝</p>
              <p className="text-lg font-bold text-orange-600">{kpiData.streak} 天</p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 轉高率 */}
          <Card className="bg-white border-0 shadow-md rounded-xl hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-green-600" />
                </div>
                <Badge className="bg-green-100 text-green-700 border-0">+5.2%</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-1">轉高率</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">{kpiData.conversionRate}%</p>
              <Progress value={kpiData.conversionRate} className="h-2" />
            </CardContent>
          </Card>

          {/* 體驗課數 */}
          <Card className="bg-white border-0 shadow-md rounded-xl hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <Badge className="bg-blue-100 text-blue-700 border-0">本月</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-1">體驗課數</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">{kpiData.totalTrials}</p>
              <p className="text-xs text-gray-500">{kpiData.converted} 位已成交</p>
            </CardContent>
          </Card>

          {/* 總收益 */}
          <Card className="bg-white border-0 shadow-md rounded-xl hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-yellow-600" />
                </div>
                <Badge className="bg-yellow-100 text-yellow-700 border-0">+12.5%</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-1">總收益</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                ${(kpiData.totalRevenue / 1000).toFixed(0)}K
              </p>
              <p className="text-xs text-gray-500">平均 ${(kpiData.totalRevenue / kpiData.totalTrials).toFixed(0)} / 人</p>
            </CardContent>
          </Card>

          {/* 成交數 */}
          <Card className="bg-white border-0 shadow-md rounded-xl hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <Badge className="bg-purple-100 text-purple-700 border-0">本月</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-1">成交數</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">{kpiData.converted}</p>
              <p className="text-xs text-gray-500">{((kpiData.converted / kpiData.totalTrials) * 100).toFixed(1)}% 成交率</p>
            </CardContent>
          </Card>
        </div>

        {/* 學員列表 */}
        <Card className="bg-white border-0 shadow-md rounded-xl">
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold">最近上課學員</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="搜尋學員、Email、教師..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-lg border-gray-200"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      學員
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      聯絡方式
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      教師
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      上課時間
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      是否上線
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      狀態
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      方案
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                            student.converted ? 'bg-green-500' : 'bg-gray-400'
                          }`}>
                            {student.name.charAt(0)}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{student.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {student.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {student.phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{student.teacher}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <div>
                            <p>{student.classDate}</p>
                            <p className="text-xs text-gray-500">{student.classTime}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex justify-center">
                          {student.isShowed ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="w-5 h-5" />
                              <span className="text-sm font-medium">已上線</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-red-600">
                              <XCircle className="w-5 h-5" />
                              <span className="text-sm font-medium">未上線</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={`${
                          student.converted
                            ? 'bg-green-100 text-green-700'
                            : student.status === '考慮中'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        } border-0`}>
                          {student.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {student.packageName ? (
                          <div className="text-sm">
                            <p className="text-gray-900 font-medium">{student.packageName}</p>
                            <p className="text-gray-500">${student.amount?.toLocaleString()}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => navigate(`/students/profile-gamified?email=${encodeURIComponent(student.email)}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          查看
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredStudents.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">沒有找到符合的學員</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

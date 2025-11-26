import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Star,
  Trophy,
  Zap,
  Target,
  BookOpen,
  Users,
  MessageSquare,
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  Flame,
  Home,
  BarChart3,
  Settings,
  Gift,
  DollarSign,
  Calendar,
  Phone,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface TeacherStats {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  totalClasses: number;
  monthlyClasses: number;
  weeklyClasses: number;
  totalConsultations: number;
  monthlyConsultations: number;
  conversionRate: number;
  averageRating: number;
  streak: number;
  monthlyRevenue: number;
  totalRevenue: number;
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  progress?: number;
  total?: number;
}

interface RecentStudent {
  id: string;
  name: string;
  email: string;
  type: 'class' | 'consultation';
  date: string;
  status: string;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  onClick?: () => void;
}

const NavItem = ({ icon, label, active, badge, onClick }: NavItemProps) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
          : 'text-gray-700 hover:bg-blue-50'
      }`}
    >
      <div className={active ? 'text-white' : 'text-blue-600'}>{icon}</div>
      <span className="font-medium text-sm">{label}</span>
      {badge && (
        <Badge className="ml-auto bg-green-500 text-white text-xs px-2">
          {badge}
        </Badge>
      )}
    </button>
  );
};

export default function TeacherWorkspace() {
  const [teacherStats, setTeacherStats] = useState<TeacherStats | null>(null);
  const [recentStudents, setRecentStudents] = useState<RecentStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const dragDistance = e.clientX - dragStartX;

    // 向左拖曳超過 50px 就收合，向右拖曳超過 50px 就展開
    if (dragDistance < -50 && !sidebarCollapsed) {
      setSidebarCollapsed(true);
      setIsDragging(false);
    } else if (dragDistance > 50 && sidebarCollapsed) {
      setSidebarCollapsed(false);
      setIsDragging(false);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStartX, sidebarCollapsed]);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      // TODO: 實際 API 呼叫獲取教師數據
      // const response = await fetch('/api/teacher/workspace-stats');
      // const data = await response.json();

      // 模擬數據
      setTeacherStats({
        level: 12,
        currentXP: 3450,
        nextLevelXP: 5000,
        totalClasses: 487,
        monthlyClasses: 42,
        weeklyClasses: 9,
        totalConsultations: 156,
        monthlyConsultations: 18,
        conversionRate: 68.5,
        averageRating: 4.8,
        streak: 14,
        monthlyRevenue: 125000,
        totalRevenue: 1450000,
        achievements: [
          {
            id: '1',
            title: '百戰精英',
            description: '完成 100 堂體驗課',
            icon: '🎯',
            earned: true,
          },
          {
            id: '2',
            title: '轉高大師',
            description: '轉高率達到 70%',
            icon: '💎',
            earned: true,
          },
          {
            id: '3',
            title: '學員之友',
            description: '獲得 50 個五星評價',
            icon: '⭐',
            earned: true,
          },
          {
            id: '4',
            title: '連勝戰將',
            description: '連續 30 天完成每日任務',
            icon: '🔥',
            earned: false,
            progress: 14,
            total: 30,
          },
        ],
      });

      setRecentStudents([
        { id: '1', name: '王小明', email: 'wang@example.com', type: 'class', date: '2025-11-20', status: '已完成' },
        { id: '2', name: '李小華', email: 'li@example.com', type: 'consultation', date: '2025-11-19', status: '已成交' },
        { id: '3', name: '陳小美', email: 'chen@example.com', type: 'class', date: '2025-11-19', status: '已完成' },
        { id: '4', name: '張小強', email: 'zhang@example.com', type: 'consultation', date: '2025-11-18', status: '待追蹤' },
        { id: '5', name: '林小芳', email: 'lin@example.com', type: 'class', date: '2025-11-18', status: '已完成' },
      ]);
    } catch (error) {
      console.error('Error fetching teacher data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !teacherStats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const xpPercentage = (teacherStats.currentXP / teacherStats.nextLevelXP) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex">
      {/* Duolingo-style Sidebar */}
      <div
        className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-200 flex flex-col p-4 space-y-2 shadow-lg relative transition-all duration-300`}
      >
        {/* Drag Handle - 右側邊緣可拖曳區域 */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-2 bg-transparent hover:bg-blue-300 cursor-col-resize group ${
            isDragging ? 'bg-blue-400' : ''
          }`}
          onMouseDown={handleMouseDown}
        >
          {/* Drag Indicator Button */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-6 h-12 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center
                       hover:scale-110 hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 hover:border-blue-400
                       transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Logo */}
        {!sidebarCollapsed && (
          <div className="mb-6 pb-5 px-2 border-b border-gray-200">
            <img src="/logo.png" alt="SingPle Logo" className="w-full h-auto" />
          </div>
        )}

        {sidebarCollapsed && (
          <div className="mb-6 pb-5 flex justify-center border-b border-gray-200">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-green-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              S
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="space-y-1">
          <NavItem icon={<Home className="w-5 h-5" />} label={sidebarCollapsed ? "" : "主頁"} active />
          <NavItem icon={<BookOpen className="w-5 h-5" />} label={sidebarCollapsed ? "" : "上課區"} />
          <NavItem icon={<TrendingUp className="w-5 h-5" />} label={sidebarCollapsed ? "" : "成交區"} />
          <NavItem icon={<MessageSquare className="w-5 h-5" />} label={sidebarCollapsed ? "" : "唱診區"} />
          <NavItem icon={<Users className="w-5 h-5" />} label={sidebarCollapsed ? "" : "學員管理"} />
        </div>

        <div className="pt-4 border-t border-gray-200 space-y-1">
          <NavItem icon={<Trophy className="w-5 h-5" />} label={sidebarCollapsed ? "" : "排行榜"} />
          <NavItem icon={<Gift className="w-5 h-5" />} label={sidebarCollapsed ? "" : "任務"} />
          <NavItem icon={<BarChart3 className="w-5 h-5" />} label={sidebarCollapsed ? "" : "統計"} />
          <NavItem icon={<Settings className="w-5 h-5" />} label={sidebarCollapsed ? "" : "設定"} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* Top Stats Bar */}
          <div className="flex items-center justify-end gap-4 mb-4">
            <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-md border-2 border-orange-200">
              <Flame className="w-5 h-5 text-orange-500" fill="currentColor" />
              <span className="font-bold text-orange-600">{teacherStats.streak}</span>
            </div>
            <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-md border-2 border-blue-200">
              <Zap className="w-5 h-5 text-blue-500" fill="currentColor" />
              <span className="font-bold text-blue-600">{teacherStats.currentXP}</span>
            </div>
            <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-md border-2 border-green-200">
              <Trophy className="w-5 h-5 text-green-600" />
              <span className="font-bold text-green-700">Lv.{teacherStats.level}</span>
            </div>
          </div>

          {/* Header - Character Card */}
          <Card className="bg-gradient-to-r from-blue-600 to-green-500 text-white border-0 shadow-2xl rounded-3xl overflow-hidden">
            <CardContent className="pt-8 pb-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-6">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-5xl border-4 border-white/40 shadow-lg">
                      👨‍🏫
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-blue-400 to-green-400 text-white rounded-full px-3 py-1.5 text-sm font-bold flex items-center gap-1 shadow-lg border-2 border-white">
                      <Star className="w-4 h-4" fill="currentColor" />
                      Lv.{teacherStats.level}
                    </div>
                  </div>

                  {/* Teacher Info */}
                  <div className="space-y-4">
                    <div>
                      <h1 className="text-4xl font-extrabold mb-1">Karen 老師</h1>
                      <p className="text-blue-100 text-lg font-medium">🎤 歌唱教學專家 · 轉高大師</p>
                    </div>

                    {/* XP Bar */}
                    <div className="w-96">
                      <div className="flex items-center justify-between text-sm mb-2 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Zap className="w-4 h-4" fill="currentColor" />
                          經驗值
                        </span>
                        <span className="font-mono font-bold">
                          {teacherStats.currentXP.toLocaleString()} / {teacherStats.nextLevelXP.toLocaleString()} XP
                        </span>
                      </div>
                      <div className="h-4 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-400 to-green-400 rounded-full transition-all duration-500"
                          style={{ width: `${xpPercentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-blue-100 mt-2">
                        🎯 還需 {(teacherStats.nextLevelXP - teacherStats.currentXP).toLocaleString()} XP 升級！
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Action Icons */}
                <div className="flex items-center justify-end gap-3">
                  <button className="flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all hover:scale-105">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span className="text-xs text-white font-medium">打卡</span>
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all hover:scale-105">
                    <MessageSquare className="w-4 h-4 text-white" />
                    <span className="text-xs text-white font-medium">唱診</span>
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all hover:scale-105">
                    <BookOpen className="w-4 h-4 text-white" />
                    <span className="text-xs text-white font-medium">體驗課</span>
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all hover:scale-105">
                    <Users className="w-4 h-4 text-white" />
                    <span className="text-xs text-white font-medium">學員</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white border-0 shadow-lg rounded-2xl hover:shadow-xl transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-1">本月收入</p>
                    <p className="text-3xl font-extrabold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                      ${(teacherStats.monthlyRevenue / 1000).toFixed(0)}K
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <DollarSign className="w-7 h-7 text-white" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3 font-medium">💰 累計 ${(teacherStats.totalRevenue / 1000).toFixed(0)}K</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-lg rounded-2xl hover:shadow-xl transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-1">本月體驗課</p>
                    <p className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                      {teacherStats.monthlyClasses}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <BookOpen className="w-7 h-7 text-white" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3 font-medium">📅 累計 {teacherStats.totalClasses} 堂</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-lg rounded-2xl hover:shadow-xl transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-1">本月諮詢</p>
                    <p className="text-3xl font-extrabold bg-gradient-to-r from-teal-600 to-teal-700 bg-clip-text text-transparent">
                      {teacherStats.monthlyConsultations}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Phone className="w-7 h-7 text-white" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3 font-medium">📞 累計 {teacherStats.totalConsultations} 次</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-lg rounded-2xl hover:shadow-xl transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-1">轉高率</p>
                    <p className="text-3xl font-extrabold bg-gradient-to-r from-cyan-600 to-cyan-700 bg-clip-text text-transparent">
                      {teacherStats.conversionRate}%
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <TrendingUp className="w-7 h-7 text-white" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3 font-medium">🚀 超越平均 12%</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Students */}
            <div className="lg:col-span-2">
              <Card className="bg-white border-0 shadow-lg rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xl">
                      <Calendar className="w-6 h-6 text-blue-600" />
                      <span className="font-bold">最近學員</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                      查看全部 →
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-md transition-all bg-white"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${
                            student.type === 'class' ? 'bg-blue-500' : 'bg-teal-500'
                          }`}
                        >
                          {student.type === 'class' ? (
                            <BookOpen className="w-6 h-6 text-white" />
                          ) : (
                            <Phone className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-base text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-500">
                            {student.type === 'class' ? '體驗課' : '諮詢'} · {student.date}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={`${
                          student.status === '已完成' || student.status === '已成交'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        } border-0`}
                      >
                        {student.status}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Achievements */}
            <div>
              <Card className="bg-white border-0 shadow-lg rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Award className="w-6 h-6 text-blue-600" />
                    <span className="font-bold">成就收藏</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {teacherStats.achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        achievement.earned
                          ? 'bg-gradient-to-br from-blue-50 to-green-50 border-blue-300 shadow-md'
                          : 'bg-gray-50 border-gray-200 opacity-70'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`text-4xl ${achievement.earned ? 'animate-bounce' : 'grayscale'}`}>
                          {achievement.icon}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">{achievement.title}</p>
                          <p className="text-xs text-gray-600 mt-1">{achievement.description}</p>
                          {!achievement.earned && achievement.progress !== undefined && (
                            <div className="mt-3">
                              <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-400 to-green-400 rounded-full transition-all"
                                  style={{ width: `${(achievement.progress / (achievement.total || 1)) * 100}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-1.5 font-medium">
                                {achievement.progress} / {achievement.total}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

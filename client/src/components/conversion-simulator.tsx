import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Sparkles,
  Plus,
  Trash2,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';
import {
  type MockStudent,
  type ScenarioType,
  generateMockStudent,
  generateMockBatch,
  generateScenario
} from '@/lib/mock-conversion-data';
import { format } from 'date-fns';

interface ConversionSimulatorProps {
  mockMode: boolean;
  mockStudents: MockStudent[];
  onMockModeChange: (enabled: boolean) => void;
  onMockStudentsChange: (students: MockStudent[]) => void;
}

export function ConversionSimulator({
  mockMode,
  mockStudents,
  onMockModeChange,
  onMockStudentsChange
}: ConversionSimulatorProps) {

  // 生成單筆學生
  const handleGenerateSingle = () => {
    const newStudent = generateMockStudent();
    onMockStudentsChange([...mockStudents, newStudent]);
  };

  // 批量生成
  const handleGenerateBatch = (count: number) => {
    const newStudents = generateMockBatch(count);
    onMockStudentsChange([...mockStudents, ...newStudents]);
  };

  // 生成場景
  const handleGenerateScenario = (type: ScenarioType) => {
    const scenarioStudents = generateScenario(type);
    onMockStudentsChange(scenarioStudents);
  };

  // 刪除單筆
  const handleRemoveStudent = (id: string) => {
    onMockStudentsChange(mockStudents.filter(s => s.id !== id));
  };

  // 清空全部
  const handleClearAll = () => {
    onMockStudentsChange([]);
  };

  // 重置為真實資料
  const handleReset = () => {
    onMockModeChange(false);
    onMockStudentsChange([]);
  };

  // 計算統計數據
  const stats = {
    total: mockStudents.length,
    converted: mockStudents.filter(s => s.status === 'converted').length,
    pending: mockStudents.filter(s => s.status === 'pending').length,
    lost: mockStudents.filter(s => s.status === 'lost').length,
    totalAmount: mockStudents
      .filter(s => s.status === 'converted')
      .reduce((sum, s) => sum + (s.dealAmount || 0), 0)
  };

  const conversionRate = stats.total > 0
    ? ((stats.converted / stats.total) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      {/* Mock 模式控制區 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Mock 模式控制
          </CardTitle>
          <CardDescription>
            啟用 Mock 模式後，所有資料將使用模擬數據，不會影響真實資料庫
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center space-x-3">
              <Switch
                id="mock-mode"
                checked={mockMode}
                onCheckedChange={onMockModeChange}
                data-testid="mock-mode-toggle"
              />
              <Label htmlFor="mock-mode" className="cursor-pointer">
                {mockMode ? 'Mock 模式已啟用' : '使用真實資料'}
              </Label>
            </div>
            <Badge
              variant={mockMode ? 'default' : 'secondary'}
              className={mockMode ? 'bg-purple-600' : ''}
              data-testid="mock-status-badge"
            >
              {mockMode ? '🎯 Mock 模式' : '📊 真實資料'}
            </Badge>
          </div>

          {mockMode && mockStudents.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-purple-800">
                目前使用 {stats.total} 筆 Mock 資料，轉換率 {conversionRate}%
              </span>
            </div>
          )}

          {mockMode && (
            <Button
              onClick={handleReset}
              variant="outline"
              className="w-full"
            >
              重置為真實資料
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 學生資料生成器 */}
      {mockMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              學生資料生成器
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 單筆生成 */}
            <div>
              <Label className="text-sm font-medium mb-2 block">單筆生成</Label>
              <Button
                onClick={handleGenerateSingle}
                variant="outline"
                className="w-full"
                data-testid="mock-generate-single"
              >
                <Plus className="h-4 w-4 mr-2" />
                新增一位學生
              </Button>
            </div>

            {/* 批量生成 */}
            <div>
              <Label className="text-sm font-medium mb-2 block">批量生成</Label>
              <div className="grid grid-cols-5 gap-2">
                {[5, 10, 20, 50, 100].map(count => (
                  <Button
                    key={count}
                    onClick={() => handleGenerateBatch(count)}
                    variant="outline"
                    size="sm"
                    data-testid={`mock-generate-batch-${count}`}
                  >
                    {count} 筆
                  </Button>
                ))}
              </div>
            </div>

            {/* 場景預設 */}
            <div>
              <Label className="text-sm font-medium mb-2 block">場景預設</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleGenerateScenario('high')}
                  variant="outline"
                  className="justify-start"
                  data-testid="mock-scenario-high"
                >
                  <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                  高轉換 (80%)
                </Button>
                <Button
                  onClick={() => handleGenerateScenario('normal')}
                  variant="outline"
                  className="justify-start"
                  data-testid="mock-scenario-normal"
                >
                  <Minus className="h-4 w-4 mr-2 text-blue-600" />
                  一般 (40%)
                </Button>
                <Button
                  onClick={() => handleGenerateScenario('low')}
                  variant="outline"
                  className="justify-start"
                  data-testid="mock-scenario-low"
                >
                  <TrendingDown className="h-4 w-4 mr-2 text-red-600" />
                  低轉換 (15%)
                </Button>
                <Button
                  onClick={() => handleGenerateScenario('mixed')}
                  variant="outline"
                  className="justify-start"
                  data-testid="mock-scenario-mixed"
                >
                  <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
                  混合場景
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mock 資料統計 */}
      {mockMode && mockStudents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Mock 資料統計
              </span>
              <Button
                onClick={handleClearAll}
                variant="destructive"
                size="sm"
                data-testid="mock-clear"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                清空全部
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                <div className="text-xs text-muted-foreground">總學生數</div>
              </div>
              <div className="text-center p-3 border rounded-lg bg-green-50">
                <div className="text-2xl font-bold text-green-600">{stats.converted}</div>
                <div className="text-xs text-muted-foreground">已轉換</div>
              </div>
              <div className="text-center p-3 border rounded-lg bg-blue-50">
                <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
                <div className="text-xs text-muted-foreground">進行中</div>
              </div>
              <div className="text-center p-3 border rounded-lg bg-red-50">
                <div className="text-2xl font-bold text-red-600">{stats.lost}</div>
                <div className="text-xs text-muted-foreground">已流失</div>
              </div>
              <div className="text-center p-3 border rounded-lg bg-purple-50">
                <div className="text-2xl font-bold text-purple-600">{conversionRate}%</div>
                <div className="text-xs text-muted-foreground">轉換率</div>
              </div>
            </div>

            <div className="text-right mb-2">
              <span className="text-sm text-muted-foreground">
                總成交金額: <span className="font-bold text-foreground">¥{stats.totalAmount.toLocaleString()}</span>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mock 資料列表 */}
      {mockMode && mockStudents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mock 資料列表</CardTitle>
            <CardDescription>
              顯示前 20 筆 Mock 學生資料
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>學生</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>教師</TableHead>
                    <TableHead>體驗日期</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead>金額</TableHead>
                    <TableHead className="w-[80px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockStudents.slice(0, 20).map((student) => (
                    <TableRow key={student.id} data-testid="mock-list-item">
                      <TableCell className="font-medium">{student.studentName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{student.email}</TableCell>
                      <TableCell>{student.teacher}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(student.classDate), 'yyyy-MM-dd')}
                      </TableCell>
                      <TableCell>
                        {student.status === 'converted' && (
                          <Badge className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            已轉換
                          </Badge>
                        )}
                        {student.status === 'pending' && (
                          <Badge variant="outline" className="border-blue-400 text-blue-600">
                            <Clock className="h-3 w-3 mr-1" />
                            進行中
                          </Badge>
                        )}
                        {student.status === 'lost' && (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            已流失
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {student.dealAmount ? `¥${student.dealAmount.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => handleRemoveStudent(student.id)}
                          variant="ghost"
                          size="sm"
                          data-testid={`mock-remove-${student.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {mockStudents.length > 20 && (
                <div className="text-center py-2 text-sm text-muted-foreground">
                  顯示 20 / {mockStudents.length} 筆資料
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
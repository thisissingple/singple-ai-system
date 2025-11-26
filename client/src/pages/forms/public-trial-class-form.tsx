/**
 * Public Trial Class Form (No Login Required)
 * 公開的體驗課打卡表單（不需登入）
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, AlertCircle, Send } from 'lucide-react';

const FORM_ID = '7721acc7-5e6a-4ded-b70f-3db4aff0f840';

export default function PublicTrialClassForm() {
  const [formData, setFormData] = useState({
    studentName: '',
    studentEmail: '',
    classDate: '',
    teacherName: '',
    isShowed: '',
    notes: '',
    noConversionReason: '',
  });

  const [teachers, setTeachers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // 載入老師列表
  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const response = await fetch('/api/teachers/public');
      if (response.ok) {
        const data = await response.json();
        setTeachers(data.teachers || []);
      } else {
        // Fallback to hardcoded list if API fails
        setTeachers(['Karen', 'Vicky', 'Orange', 'Elena']);
      }
    } catch (err) {
      // Fallback to hardcoded list
      setTeachers(['Karen', 'Vicky', 'Orange', 'Elena']);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`/api/forms/public/${FORM_ID}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: formData }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || '提交失敗，請稍後再試');
        setLoading(false);
        return;
      }

      setSubmitted(true);
      setFormData({
        studentName: '',
        studentEmail: '',
        classDate: '',
        teacherName: '',
        isShowed: '',
        notes: '',
        noConversionReason: '',
      });
    } catch (err) {
      setError('網路錯誤，請檢查連線後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setError('');
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-green-700">提交成功！</CardTitle>
            <CardDescription className="text-base">
              體驗課打卡記錄已儲存
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              感謝您填寫體驗課打卡表單，資料已成功記錄至系統。
            </p>
            <Button onClick={handleReset} className="w-full">
              填寫另一筆記錄
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">體驗課打卡記錄</CardTitle>
          <CardDescription>
            請填寫學員的體驗課出席資訊，資料將即時同步至系統
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 學員姓名 */}
            <div className="space-y-2">
              <Label htmlFor="studentName">
                學員姓名 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="studentName"
                type="text"
                placeholder="請輸入學員姓名"
                value={formData.studentName}
                onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            {/* 學員 Email */}
            <div className="space-y-2">
              <Label htmlFor="studentEmail">
                學員 Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="studentEmail"
                type="email"
                placeholder="student@example.com"
                value={formData.studentEmail}
                onChange={(e) => setFormData({ ...formData, studentEmail: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            {/* 上課日期 */}
            <div className="space-y-2">
              <Label htmlFor="classDate">
                上課日期 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="classDate"
                type="date"
                value={formData.classDate}
                onChange={(e) => setFormData({ ...formData, classDate: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            {/* 授課老師 */}
            <div className="space-y-2">
              <Label htmlFor="teacherName">
                授課老師 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.teacherName}
                onValueChange={(value) => setFormData({ ...formData, teacherName: value })}
                disabled={loading}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="請選擇授課老師" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher} value={teacher}>
                      {teacher}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 學員是否上線 */}
            <div className="space-y-2">
              <Label htmlFor="isShowed">
                學員是否上線 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.isShowed}
                onValueChange={(value) => setFormData({ ...formData, isShowed: value })}
                disabled={loading}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="請選擇學員出席狀態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">有上線</SelectItem>
                  <SelectItem value="false">未上線</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 課程文字檔 */}
            <div className="space-y-2">
              <Label htmlFor="notes">課程文字檔</Label>
              <Textarea
                id="notes"
                placeholder="請輸入課程記錄或備註..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                disabled={loading}
              />
            </div>

            {/* 未轉單原因 */}
            <div className="space-y-2">
              <Label htmlFor="noConversionReason">未轉單原因</Label>
              <Textarea
                id="noConversionReason"
                placeholder="如果學員未轉單，請說明原因..."
                value={formData.noConversionReason}
                onChange={(e) => setFormData({ ...formData, noConversionReason: e.target.value })}
                rows={3}
                disabled={loading}
              />
            </div>

            {/* 提交按鈕 */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  提交中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  提交記錄
                </>
              )}
            </Button>
          </form>

          {/* 版本資訊 */}
          <div className="mt-6 pt-4 border-t text-center text-xs text-muted-foreground">
            <p>教育機構管理系統 - 體驗課打卡表單</p>
            <p className="mt-1">© {new Date().getFullYear()} All rights reserved</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

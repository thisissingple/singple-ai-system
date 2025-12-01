/**
 * 薪資計算器頁面
 * 核心功能：選擇員工後自動計算並帶入抽成
 */

import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { sidebarConfig } from '@/config/sidebar-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calculator, Save, RefreshCw, Download, FileSpreadsheet, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

interface EmployeeSetting {
  employee_name: string;
  nickname?: string;  // 暱稱（下拉選單顯示用）
  role_type: string;
  base_salary: number;
  commission_rate: number;
  point_commission_rate: number;
  labor_insurance: number;
  health_insurance: number;
  retirement_fund: number;
  service_fee: number;
  has_performance_bonus?: boolean;  // 是否有績效獎金資格
}

interface SalaryResult {
  employee_name: string;
  period_start: string;
  period_end: string;
  role_type: 'teacher' | 'closer' | 'setter';
  employment_type: 'full_time' | 'part_time';
  base_salary: number;
  original_bonus: number;
  hourly_rate?: number;
  monthly_hours?: number;
  hourly_wage_subtotal?: number;
  total_revenue: number;
  commission_amount: number;
  point_contribution: number;
  online_course_revenue: number;
  other_income: number;
  performance_percentage?: number;
  total_commission_adjusted?: number;
  phone_performance_bonus?: number;
  performance_bonus?: number;
  leave_deduction?: number;
  // 績效獎金系統（新）
  has_performance_bonus?: boolean;
  performance_score?: number;
  base_performance_bonus?: number;
  consecutive_full_score_count?: number;
  consecutive_bonus?: number;
  total_performance_bonus?: number;
  commission_deduction_rate?: number;
  requires_interview?: boolean;
  subtotal_before_deductions: number;
  labor_insurance: number;
  health_insurance: number;
  retirement_fund: number;
  service_fee: number;
  total_salary: number;
  details: {
    revenueByCategory: { [key: string]: number };
    recordCount: number;
    records?: Array<{
      date: string;
      item: string;
      amount: number;
      student_name?: string;
      payment_method?: string;
      teacher_name?: string;
      closer?: string;
      setter?: string;
      is_self_closed?: boolean;
      commission_amount?: number;
    }>;
    // 老師業績分類
    self_closed_revenue?: number;
    self_closed_commission?: number;
    other_closed_revenue?: number;
    other_closed_commission?: number;
    commission_rate_used?: number;
  };
  // 老師專用
  trial_class_fee?: number;           // 體驗課鐘點費
  teacher_commission?: number;        // 老師業績抽成（自己成交 + 別人成交）
  // 體驗課明細
  trial_class_details?: {
    records: Array<{
      class_date: string;
      student_name: string;
      student_email?: string;
      course_type?: string;
      hourly_rate?: number;
    }>;
    total_classes: number;
    trial_class_fee: number;
    by_course_type?: {
      [courseType: string]: {
        count: number;
        rate: number;
        subtotal: number;
      };
    };
  };
}

// localStorage key for salary calculator state
const SALARY_STORAGE_KEY = 'salary_calculator_state';

// 從 localStorage 讀取儲存的狀態
const getSavedState = () => {
  try {
    const saved = localStorage.getItem(SALARY_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load saved state:', e);
  }
  return null;
};

export default function SalaryCalculator() {
  const { toast } = useToast();
  const revenueDetailsRef = useRef<HTMLDivElement>(null);
  const salaryTableRef = useRef<HTMLDivElement>(null);
  const [employees, setEmployees] = useState<EmployeeSetting[]>([]);

  // 從 localStorage 讀取初始狀態
  const savedState = getSavedState();

  const [selectedEmployee, setSelectedEmployee] = useState<string>(savedState?.selectedEmployee || '');

  // 預設日期：上月26號到本月25號
  const getDefaultDates = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 0-11 -> 1-12

    // 上個月26號
    let startMonth = currentMonth - 1;
    let startYear = currentYear;
    if (startMonth === 0) {
      startMonth = 12;
      startYear = currentYear - 1;
    }
    const start = `${startYear}-${String(startMonth).padStart(2, '0')}-26`;

    // 本月25號
    const end = `${currentYear}-${String(currentMonth).padStart(2, '0')}-25`;

    return { start, end };
  };

  const defaultDates = getDefaultDates();
  const [periodStart, setPeriodStart] = useState<string>(savedState?.periodStart || defaultDates.start);
  const [periodEnd, setPeriodEnd] = useState<string>(savedState?.periodEnd || defaultDates.end);
  const [result, setResult] = useState<SalaryResult | null>(savedState?.result || null);
  const [loading, setLoading] = useState(false);

  // 手動調整欄位
  const [performancePercentage, setPerformancePercentage] = useState<number>(savedState?.performancePercentage ?? 100);
  const [phoneBonus, setPhoneBonus] = useState<number>(savedState?.phoneBonus ?? 0);
  const [performanceBonus, setPerformanceBonus] = useState<number>(savedState?.performanceBonus ?? 0);
  const [leaveDeduction, setLeaveDeduction] = useState<number>(savedState?.leaveDeduction ?? 0);
  const [monthlyHours, setMonthlyHours] = useState<number>(savedState?.monthlyHours ?? 0);
  const [hourlyRate, setHourlyRate] = useState<number>(savedState?.hourlyRate ?? 190);

  // 績效獎金系統
  const [performanceScore, setPerformanceScore] = useState<number>(savedState?.performanceScore ?? 10);

  // 業績獎金明細相關欄位
  const [teacherCommissionRate, setTeacherCommissionRate] = useState<number>(savedState?.teacherCommissionRate ?? 0);
  const [phoneCommissionRate, setPhoneCommissionRate] = useState<number>(savedState?.phoneCommissionRate ?? 1);
  const [hourlyWorkHours, setHourlyWorkHours] = useState<number>(savedState?.hourlyWorkHours ?? 0);
  const [hourlyWorkRate, setHourlyWorkRate] = useState<number>(savedState?.hourlyWorkRate ?? 500);
  const [otherBonus, setOtherBonus] = useState<number>(savedState?.otherBonus ?? 0);

  // 儲存狀態到 localStorage
  useEffect(() => {
    const stateToSave = {
      selectedEmployee,
      periodStart,
      periodEnd,
      result,
      performancePercentage,
      phoneBonus,
      performanceBonus,
      leaveDeduction,
      monthlyHours,
      hourlyRate,
      performanceScore,
      teacherCommissionRate,
      phoneCommissionRate,
      hourlyWorkHours,
      hourlyWorkRate,
      otherBonus,
    };
    try {
      localStorage.setItem(SALARY_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }, [
    selectedEmployee,
    periodStart,
    periodEnd,
    result,
    performancePercentage,
    phoneBonus,
    performanceBonus,
    leaveDeduction,
    monthlyHours,
    hourlyRate,
    performanceScore,
    teacherCommissionRate,
    phoneCommissionRate,
    hourlyWorkHours,
    hourlyWorkRate,
    otherBonus,
  ]);

  // 載入員工列表
  useEffect(() => {
    fetchEmployees();
  }, []);

  // 用於追蹤是否是初次渲染（避免 useEffect 在初始化時觸發）
  const isFirstRender = useRef(true);
  const prevPerformanceScore = useRef(performanceScore);

  // 績效分數變更時自動重新計算
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // 只有當有結果且分數真的改變了才重新計算
    if (result && prevPerformanceScore.current !== performanceScore) {
      prevPerformanceScore.current = performanceScore;
      handleCalculateWithScore(performanceScore);
    }
  }, [performanceScore]);

  // 使用指定分數計算薪資（用於績效分數即時響應）
  const handleCalculateWithScore = async (score: number) => {
    if (!selectedEmployee || !periodStart || !periodEnd) return;

    setLoading(true);
    try {
      const response = await fetch('/api/salary/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_name: selectedEmployee,
          period_start: periodStart,
          period_end: periodEnd,
          performance_score: score,
          manual_adjustments: {
            performance_percentage: performancePercentage,
            phone_performance_bonus: phoneBonus,
            performance_bonus: performanceBonus,
            leave_deduction: leaveDeduction,
            monthly_hours: monthlyHours,
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.data);
      }
    } catch (error) {
      console.error('Failed to recalculate salary:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/salary/employees');
      const data = await response.json();
      if (data.success) {
        setEmployees(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      toast({
        title: '錯誤',
        description: '無法載入員工列表',
        variant: 'destructive',
      });
    }
  };

  // 計算薪資
  const handleCalculate = async () => {
    if (!selectedEmployee || !periodStart || !periodEnd) {
      toast({
        title: '提示',
        description: '請選擇員工和計算期間',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/salary/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_name: selectedEmployee,
          period_start: periodStart,
          period_end: periodEnd,
          performance_score: performanceScore,
          manual_adjustments: {
            performance_percentage: performancePercentage,
            phone_performance_bonus: phoneBonus,
            performance_bonus: performanceBonus,
            leave_deduction: leaveDeduction,
            monthly_hours: monthlyHours,
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.data);
        // 初始化兼職相關欄位（保持時薪預設值 190，不從資料庫覆寫）
        if (data.data.employment_type === 'part_time') {
          if (data.data.monthly_hours) setMonthlyHours(data.data.monthly_hours);
        }
        toast({
          title: '計算完成',
          description: '薪資已自動計算完成',
        });
      }
    } catch (error) {
      console.error('Failed to calculate salary:', error);
      toast({
        title: '錯誤',
        description: '計算失敗，請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 儲存計算結果
  const handleSave = async () => {
    if (!result) return;

    try {
      const response = await fetch('/api/salary/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: '儲存成功',
          description: '薪資計算結果已儲存',
        });
      }
    } catch (error) {
      console.error('Failed to save:', error);
      toast({
        title: '錯誤',
        description: '儲存失敗',
        variant: 'destructive',
      });
    }
  };

  // 計算實時薪資 (當使用者修改欄位時)
  const calculateRealTimeSalary = () => {
    if (!result) return result;

    const isPartTime = result.employment_type === 'part_time';

    // 輔助函數：安全轉換為數字
    const toNumber = (value: any): number => {
      if (typeof value === 'string') return parseFloat(value) || 0;
      return value || 0;
    };

    // 基本金額
    let baseAmount = 0;
    if (isPartTime) {
      baseAmount = (hourlyRate || toNumber(result.hourly_rate)) * monthlyHours;
    } else {
      baseAmount = toNumber(result.base_salary);
    }

    // 業績獎金計算（老師使用後端計算的 teacher_commission + trial_class_fee）
    let performanceAmount = 0;
    if (result.role_type === 'teacher') {
      // 使用後端計算的業績抽成和體驗課鐘點費
      performanceAmount = toNumber(result.teacher_commission) + toNumber(result.trial_class_fee);
    } else if (result.role_type === 'setter') {
      performanceAmount = toNumber(result.total_revenue) * (phoneCommissionRate / 100);
    } else if (result.role_type === 'closer') {
      performanceAmount = hourlyWorkHours * hourlyWorkRate;
    }

    // 績效獎金系統獎金
    const performanceBonusAmount = toNumber(result.total_performance_bonus);

    // 小計（未加保薪資）
    const subtotal =
      baseAmount +
      performanceAmount +
      otherBonus +
      performanceBonusAmount -
      leaveDeduction;

    // 最終薪資
    const totalDeductions =
      toNumber(result.labor_insurance) +
      toNumber(result.health_insurance) +
      toNumber(result.retirement_fund) +
      toNumber(result.service_fee);

    const totalSalary = subtotal - totalDeductions;

    return {
      ...result,
      subtotal_before_deductions: subtotal,
      total_salary: totalSalary,
    };
  };

  // 實時計算薪資（不更新 state，只用於顯示）
  const displayResult = result ? calculateRealTimeSalary() : null;

  // 截圖業績明細
  const captureRevenueDetails = async () => {
    if (!revenueDetailsRef.current) {
      toast({
        title: '無法截圖',
        description: '找不到業績明細區塊',
        variant: 'destructive',
      });
      return;
    }

    try {
      const canvas = await html2canvas(revenueDetailsRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const item = new ClipboardItem({ 'image/png': blob });
          navigator.clipboard.write([item]).then(() => {
            toast({
              title: '截圖成功',
              description: '業績明細已複製到剪貼簿，可直接貼上',
            });
          });
        }
      });
    } catch (error) {
      console.error('Screenshot failed:', error);
      toast({
        title: '截圖失敗',
        description: '請稍後再試',
        variant: 'destructive',
      });
    }
  };

  // 匯出業績明細為 Excel
  const exportRevenueDetails = () => {
    if (!result || !displayResult?.details?.records || displayResult.details.records.length === 0) {
      toast({
        title: '無法匯出',
        description: '沒有業績明細可以匯出',
        variant: 'destructive',
      });
      return;
    }

    const ws_data = [
      ['日期', '項目', '學員名稱', '付款方式', '教練名稱', '諮詢師', '電訪人員', '實收金額'],
      ...displayResult.details.records.map(record => [
        record.date,
        record.item,
        record.student_name || '-',
        record.payment_method || '-',
        record.teacher_name || '-',
        record.closer || '-',
        record.setter || '-',
        record.amount,
      ]),
      [],
      ['總計', '', '', '', '', '', '', result.total_revenue],
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '業績明細');

    const filename = `業績明細_${result.employee_name}_${periodStart}_${periodEnd}.xlsx`;
    XLSX.writeFile(wb, filename);

    toast({
      title: '匯出成功',
      description: `已匯出 ${displayResult.details.recordCount || 0} 筆業績記錄`,
    });
  };

  // 截圖薪資表並複製到剪貼簿
  const captureSalaryTable = async () => {
    if (!salaryTableRef.current) {
      toast({
        title: '無法截圖',
        description: '找不到薪資表區塊',
        variant: 'destructive',
      });
      return;
    }

    try {
      // 在截圖前，將所有 input 的值設置為 value 屬性，這樣 html2canvas 才能正確捕捉
      const inputs = salaryTableRef.current.querySelectorAll('input');
      const originalValues: { input: HTMLInputElement; originalValue: string }[] = [];

      inputs.forEach((input) => {
        originalValues.push({ input, originalValue: input.getAttribute('value') || '' });
        input.setAttribute('value', input.value);
      });

      const canvas = await html2canvas(salaryTableRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        onclone: (clonedDoc) => {
          // 在克隆的文檔中，確保 input 顯示正確的值
          const clonedInputs = clonedDoc.querySelectorAll('input');
          clonedInputs.forEach((input) => {
            // 將 input 替換為顯示值的 span
            const span = clonedDoc.createElement('span');
            span.textContent = input.value;
            span.style.cssText = window.getComputedStyle(input).cssText;
            span.style.display = 'inline-block';
            span.style.border = 'none';
            span.style.background = 'transparent';
            input.parentNode?.replaceChild(span, input);
          });
        },
      });

      // 恢復原始值
      originalValues.forEach(({ input, originalValue }) => {
        input.setAttribute('value', originalValue);
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const item = new ClipboardItem({ 'image/png': blob });
          navigator.clipboard.write([item]).then(() => {
            toast({
              title: '截圖成功',
              description: '薪資表已複製到剪貼簿，可直接貼上',
            });
          });
        }
      });
    } catch (error) {
      console.error('Screenshot failed:', error);
      toast({
        title: '截圖失敗',
        description: '請稍後再試',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '$0';
    return `$${numValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <DashboardLayout sidebarSections={sidebarConfig} title="薪資計算器">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">💰 薪資計算器</h1>
        </div>

      {/* 篩選條件卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>計算條件</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>選擇員工</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="請選擇員工" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.employee_name} value={emp.employee_name}>
                      {emp.nickname || emp.employee_name} ({emp.role_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>開始日期</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>結束日期</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCalculate} disabled={loading}>
              <Calculator className="mr-2 h-4 w-4" />
              {loading ? '計算中...' : result ? '重新計算' : '開始計算'}
            </Button>
            <Button variant="outline" onClick={() => setResult(null)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 薪資計算結果 - 永遠顯示 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {displayResult ? `${displayResult.employee_name} 的薪資試算結果` : '薪資試算表'}
            </CardTitle>
            {displayResult && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={captureSalaryTable}>
                  <Camera className="mr-2 h-4 w-4" />
                  複製薪資表截圖
                </Button>
                <Button variant="outline" size="sm" onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  儲存到系統
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
            {/* 表格式薪資明細 (類似截圖) */}
            <div ref={salaryTableRef} className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <tbody>
                  {/* 基本資訊 */}
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                    <td className="p-4 font-semibold text-slate-700 w-1/4">姓名</td>
                    <td className="p-4 text-right font-bold text-lg text-slate-900" colSpan={3}>
                      {displayResult?.employee_name || selectedEmployee || '請選擇員工'}
                    </td>
                  </tr>
                  <tr className="border-t hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-medium text-slate-700">計算期間</td>
                    <td className="p-3 text-right text-slate-600" colSpan={3}>
                      {periodStart} 至 {periodEnd}
                    </td>
                  </tr>
                  <tr className="border-t hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-medium text-slate-700">職務</td>
                    <td className="p-3 text-right font-semibold text-slate-900" colSpan={3}>
                      {displayResult ? (displayResult.role_type === 'teacher' ? '教練' : displayResult.role_type === 'closer' ? '諮詢師' : '電訪人員') : '-'}
                    </td>
                  </tr>
                  <tr className="border-t hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-medium text-slate-700">員工類型</td>
                    <td className="p-3 text-right font-semibold text-slate-900" colSpan={3}>
                      {displayResult ? (displayResult.employment_type === 'part_time' ? '兼職' : '正職') : '-'}
                    </td>
                  </tr>

                  {/* 正職顯示底薪 */}
                  {(!displayResult || displayResult.employment_type === 'full_time') && (
                    <>
                      <tr className="border-t">
                        <td className="p-3 font-medium bg-muted/30">底薪</td>
                        <td className="p-3 text-right font-bold text-green-600" colSpan={3}>
                          {displayResult ? formatCurrency(displayResult.base_salary) : '$0'}
                        </td>
                      </tr>
                    </>
                  )}

                  {/* 兼職顯示時薪、時數、小計 */}
                  {displayResult?.employment_type === 'part_time' && (
                    <>
                      <tr className="border-t">
                        <td className="p-3 font-medium bg-muted/30">時薪</td>
                        <td className="p-3 text-right" colSpan={3}>
                          <div className="flex justify-end items-center gap-2">
                            <Input
                              type="number"
                              value={hourlyRate || displayResult.hourly_rate || 0}
                              onChange={(e) => setHourlyRate(Number(e.target.value))}
                              className="h-8 w-32 text-right"
                              placeholder="190"
                            />
                            <span>元</span>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3 font-medium bg-muted/30">當月時數</td>
                        <td className="p-3 text-right" colSpan={3}>
                          <div className="flex justify-end items-center gap-2">
                            <Input
                              type="number"
                              value={monthlyHours}
                              onChange={(e) => setMonthlyHours(Number(e.target.value))}
                              className="h-8 w-32 text-right"
                              placeholder="0"
                            />
                            <span>小時</span>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-t bg-green-50">
                        <td className="p-3 font-medium bg-muted/30">時薪小計</td>
                        <td className="p-3 text-right font-bold text-green-600" colSpan={3}>
                          {formatCurrency((hourlyRate || displayResult.hourly_rate || 0) * monthlyHours)}
                        </td>
                      </tr>
                    </>
                  )}

                  {/* 業績獎金明細區塊 */}
                  <tr className="border-t-4 border-amber-500 bg-gradient-to-r from-amber-50 to-orange-50">
                    <td className="p-4 font-bold text-center text-amber-900" colSpan={4}>
                      業績獎金明細
                    </td>
                  </tr>

                  {/* 1️⃣ 老師業績抽成 - 只有教練才顯示 */}
                  {(!result || result.role_type === 'teacher') && (
                    <>
                      <tr className="border-t bg-blue-50/70">
                        <td className="p-3 font-semibold text-blue-900" colSpan={4}>
                          <span className="inline-flex items-center gap-2">
                            <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                            老師業績抽成
                          </span>
                        </td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3 pl-8 font-medium bg-muted/30">業績總額</td>
                        <td className="p-3 text-right font-bold text-blue-600" colSpan={3}>
                          {formatCurrency(displayResult?.total_revenue || 0)}
                        </td>
                      </tr>
                      {/* 自己成交 */}
                      <tr className="border-t bg-emerald-50/50">
                        <td className="p-3 pl-8 font-medium text-emerald-700">自己成交業績</td>
                        <td className="p-3 text-right text-emerald-600" colSpan={3}>
                          {formatCurrency(displayResult?.details?.self_closed_revenue || 0)}
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({((displayResult?.details?.commission_rate_used || 0.22) * 100).toFixed(1)}%)
                          </span>
                        </td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3 pl-8 font-medium bg-muted/30">→ 自己成交抽成</td>
                        <td className="p-3 text-right font-semibold text-emerald-600" colSpan={3}>
                          {formatCurrency(displayResult?.details?.self_closed_commission || 0)}
                        </td>
                      </tr>
                      {/* 別人成交 */}
                      <tr className="border-t bg-amber-50/50">
                        <td className="p-3 pl-8 font-medium text-amber-700">別人成交業績</td>
                        <td className="p-3 text-right text-amber-600" colSpan={3}>
                          {formatCurrency(displayResult?.details?.other_closed_revenue || 0)}
                          <span className="ml-2 text-xs text-muted-foreground">(16.13%)</span>
                        </td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3 pl-8 font-medium bg-muted/30">→ 別人成交抽成</td>
                        <td className="p-3 text-right font-semibold text-amber-600" colSpan={3}>
                          {formatCurrency(displayResult?.details?.other_closed_commission || 0)}
                        </td>
                      </tr>
                      {/* 業績抽成小計 */}
                      <tr className="border-t hover:bg-blue-50 transition-colors">
                        <td className="p-3 pl-8 font-bold text-slate-700">業績抽成小計</td>
                        <td className="p-3 text-right font-bold text-blue-600" colSpan={3}>
                          {formatCurrency(displayResult?.teacher_commission || 0)}
                        </td>
                      </tr>
                    </>
                  )}

                  {/* 1.5️⃣ 體驗課鐘點費 - 只有教練才顯示 */}
                  {result?.role_type === 'teacher' && (
                    <>
                      <tr className="border-t bg-purple-50/70">
                        <td className="p-3 font-semibold text-purple-900" colSpan={4}>
                          <span className="inline-flex items-center gap-2">
                            <span className="bg-purple-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                            體驗課鐘點費
                          </span>
                        </td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3 pl-8 font-medium bg-muted/30">體驗課堂數</td>
                        <td className="p-3 text-right" colSpan={3}>
                          {displayResult?.trial_class_details?.total_classes || 0} 堂
                        </td>
                      </tr>
                      {/* 按課程類型顯示 */}
                      {displayResult?.trial_class_details?.by_course_type && Object.entries(displayResult.trial_class_details.by_course_type).map(([courseType, data]) => (
                        <tr key={courseType} className="border-t">
                          <td className="p-3 pl-8 font-medium text-slate-600 text-sm">
                            {courseType}
                          </td>
                          <td className="p-3 text-right text-slate-600 text-sm" colSpan={3}>
                            {data.count} 堂 × ${data.rate} = {formatCurrency(data.subtotal)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t hover:bg-purple-50 transition-colors">
                        <td className="p-3 pl-8 font-bold text-slate-700">體驗課鐘點費小計</td>
                        <td className="p-3 text-right font-bold text-purple-600" colSpan={3}>
                          {formatCurrency(displayResult?.trial_class_fee || 0)}
                        </td>
                      </tr>
                    </>
                  )}

                  {/* 電話人員業績獎金 - 只有電訪人員才顯示 */}
                  {result?.role_type === 'setter' && (
                    <>
                      <tr className="border-t bg-green-50/70">
                        <td className="p-3 font-semibold text-green-900" colSpan={4}>
                          <span className="inline-flex items-center gap-2">
                            <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                            電話人員業績獎金
                          </span>
                        </td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3 pl-8 font-medium bg-muted/30">業績總額</td>
                        <td className="p-3 text-right font-bold text-blue-600" colSpan={3}>
                          {formatCurrency(displayResult?.total_revenue || 0)}
                        </td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3 pl-8 font-medium bg-muted/30">抽成比例</td>
                        <td className="p-3 text-right" colSpan={3}>
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              type="number"
                              step="0.1"
                              value={phoneCommissionRate}
                              onChange={(e) => setPhoneCommissionRate(Number(e.target.value))}
                              className="h-8 w-24 text-right"
                              placeholder="3"
                            />
                            <span>%</span>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-t hover:bg-green-50 transition-colors">
                        <td className="p-3 pl-8 font-medium text-slate-700">電話業績獎金</td>
                        <td className="p-3 text-right font-bold text-emerald-600" colSpan={3}>
                          {formatCurrency((displayResult?.total_revenue || 0) * (phoneCommissionRate / 100))}
                        </td>
                      </tr>
                    </>
                  )}

                  {/* 鐘點費 - 只有諮詢師才顯示 */}
                  {result?.role_type === 'closer' && (
                    <>
                      <tr className="border-t bg-purple-50/70">
                        <td className="p-3 font-semibold text-purple-900" colSpan={4}>
                          <span className="inline-flex items-center gap-2">
                            <span className="bg-purple-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                            鐘點費
                          </span>
                        </td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3 pl-8 font-medium bg-muted/30">授課時數</td>
                        <td className="p-3 text-right" colSpan={3}>
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              type="number"
                              value={hourlyWorkHours}
                              onChange={(e) => setHourlyWorkHours(Number(e.target.value))}
                              className="h-8 w-24 text-right"
                              placeholder="0"
                            />
                            <span>小時</span>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3 pl-8 font-medium bg-muted/30">鐘點單價</td>
                        <td className="p-3 text-right" colSpan={3}>
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              type="number"
                              value={hourlyWorkRate}
                              onChange={(e) => setHourlyWorkRate(Number(e.target.value))}
                              className="h-8 w-24 text-right"
                              placeholder="500"
                            />
                            <span>元</span>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-t hover:bg-purple-50 transition-colors">
                        <td className="p-3 pl-8 font-medium text-slate-700">鐘點費小計</td>
                        <td className="p-3 text-right font-bold text-emerald-600" colSpan={3}>
                          {formatCurrency(hourlyWorkHours * hourlyWorkRate)}
                        </td>
                      </tr>
                    </>
                  )}

                  {/* 4️⃣ 其他業務獎金 - 所有人都顯示 */}
                  <tr className="border-t bg-amber-50/70">
                    <td className="p-3 font-semibold text-amber-900" colSpan={4}>
                      <span className="inline-flex items-center gap-2">
                        <span className="bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
                        其他業務獎金
                      </span>
                    </td>
                  </tr>
                  <tr className="border-t hover:bg-amber-50 transition-colors">
                    <td className="p-3 pl-8 font-medium text-slate-700">其他獎金</td>
                    <td className="p-3 text-right" colSpan={3}>
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          type="number"
                          value={otherBonus}
                          onChange={(e) => setOtherBonus(Number(e.target.value))}
                          className="h-8 w-32 text-right"
                          placeholder="0"
                        />
                        <span>元</span>
                      </div>
                    </td>
                  </tr>

                  {/* 績效獎金系統區塊 - 只有有資格的員工才顯示 */}
                  {displayResult?.has_performance_bonus && (
                    <>
                      <tr className="border-t-4 border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50">
                        <td className="p-4 font-bold text-center text-indigo-900" colSpan={4}>
                          🏆 績效獎金系統
                        </td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3 font-medium bg-muted/30">當月績效分數</td>
                        <td className="p-3 text-right" colSpan={3}>
                          <div className="flex items-center justify-end gap-2">
                            <Select
                              value={performanceScore.toString()}
                              onValueChange={(v) => setPerformanceScore(Number(v))}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((score) => (
                                  <SelectItem key={score} value={score.toString()}>
                                    {score} 分
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-sm text-muted-foreground">
                              {performanceScore >= 8 ? '😊' : performanceScore >= 6 ? '😐' : '😰'}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {displayResult?.performance_score !== undefined && (
                        <>
                          <tr className="border-t">
                            <td className="p-3 font-medium bg-muted/30">基本績效獎金</td>
                            <td className="p-3 text-right font-semibold text-green-600" colSpan={3}>
                              {formatCurrency(displayResult?.base_performance_bonus || 0)}
                              <span className="ml-2 text-xs text-muted-foreground">
                                {(displayResult?.performance_score ?? 0) >= 8 && '(8-10分: $2,000)'}
                                {displayResult?.performance_score === 7 && '(7分: $1,000)'}
                                {displayResult?.performance_score === 6 && '(6分: $0, 需面談)'}
                                {(displayResult?.performance_score ?? 0) >= 3 && (displayResult?.performance_score ?? 0) <= 5 && '(3-5分: 抽成-1%)'}
                                {(displayResult?.performance_score ?? 0) >= 1 && (displayResult?.performance_score ?? 0) <= 2 && '(1-2分: 抽成-2%)'}
                              </span>
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-3 font-medium bg-muted/30">連續滿分次數</td>
                            <td className="p-3 text-right" colSpan={3}>
                              <span className="font-semibold text-indigo-600">
                                {displayResult?.consecutive_full_score_count || 0} 次
                              </span>
                              {(displayResult?.consecutive_full_score_count || 0) > 0 && (
                                <span className="ml-2">{'🔥'.repeat(Math.min(displayResult?.consecutive_full_score_count || 0, 5))}</span>
                              )}
                            </td>
                          </tr>
                          <tr className="border-t">
                            <td className="p-3 font-medium bg-muted/30">連續滿分加成</td>
                            <td className="p-3 text-right font-semibold text-purple-600" colSpan={3}>
                              +{formatCurrency(displayResult?.consecutive_bonus || 0)}
                              <span className="ml-2 text-xs text-muted-foreground">
                                {(displayResult?.consecutive_full_score_count || 0) === 1 && '(1次: +$500)'}
                                {(displayResult?.consecutive_full_score_count || 0) === 2 && '(2次: +$1,000)'}
                                {(displayResult?.consecutive_full_score_count || 0) >= 3 && '(3次+: +$2,000)'}
                              </span>
                            </td>
                          </tr>
                          {(displayResult?.commission_deduction_rate || 0) > 0 && (
                            <tr className="border-t bg-red-50">
                              <td className="p-3 font-medium text-red-700">抽成扣減</td>
                              <td className="p-3 text-right font-semibold text-red-600" colSpan={3}>
                                -{displayResult?.commission_deduction_rate}%
                                <span className="ml-2 text-xs">（因績效不佳）</span>
                              </td>
                            </tr>
                          )}
                          {displayResult?.requires_interview && (
                            <tr className="border-t bg-yellow-100">
                              <td className="p-3 font-medium text-yellow-800" colSpan={4}>
                                ⚠️ 績效分數為 6 分，需安排績效面談
                              </td>
                            </tr>
                          )}
                          <tr className="border-t bg-indigo-50">
                            <td className="p-3 font-bold text-indigo-900">績效獎金總計</td>
                            <td className="p-3 text-right font-bold text-xl text-indigo-600" colSpan={3}>
                              {formatCurrency(displayResult?.total_performance_bonus || 0)}
                            </td>
                          </tr>
                        </>
                      )}
                    </>
                  )}

                  {/* 未加保薪資 */}
                  <tr className="border-t bg-blue-50">
                    <td className="p-3 font-bold" colSpan={2}>
                      未加保薪資
                    </td>
                    <td className="p-3 text-right font-bold text-xl text-blue-600" colSpan={2}>
                      {formatCurrency(displayResult?.subtotal_before_deductions || 0)}
                    </td>
                  </tr>

                  {/* 扣除項區塊 */}
                  <tr className="border-t-4 border-red-400 bg-gradient-to-r from-red-50 to-orange-50">
                    <td className="p-4 font-bold text-red-900" colSpan={4}>
                      📋 扣除項目
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-3 font-medium bg-muted/30">請假扣款</td>
                    <td className="p-3 text-right" colSpan={3}>
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          type="number"
                          value={leaveDeduction}
                          onChange={(e) => setLeaveDeduction(Number(e.target.value))}
                          className="h-8 w-32 text-right"
                          placeholder="0"
                        />
                        <span>元</span>
                      </div>
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-3 font-medium bg-muted/30">勞保扣除（員工負擔）</td>
                    <td className="p-3 text-right text-red-600" colSpan={3}>{formatCurrency(displayResult?.labor_insurance || 0)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-3 font-medium bg-muted/30">健保扣除（員工負擔）</td>
                    <td className="p-3 text-right text-red-600" colSpan={3}>{formatCurrency(displayResult?.health_insurance || 0)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-3 font-medium bg-muted/30">手續費</td>
                    <td className="p-3 text-right text-red-600" colSpan={3}>$15</td>
                  </tr>
                  <tr className="border-t bg-red-100">
                    <td className="p-3 font-bold text-red-900" colSpan={2}>扣除項總計</td>
                    <td className="p-3 text-right font-bold text-xl text-red-600" colSpan={2}>
                      {formatCurrency((displayResult?.labor_insurance || 0) + (displayResult?.health_insurance || 0) + leaveDeduction + 15)}
                    </td>
                  </tr>

                  {/* 雇主負擔（參考用，不計入員工薪資） */}
                  <tr className="border-t-2 border-gray-300 bg-gray-50">
                    <td className="p-3 font-medium text-gray-600" colSpan={2}>
                      <span className="text-xs">📌 雇主負擔（不從薪資扣除）</span>
                    </td>
                    <td className="p-3 text-right text-gray-500" colSpan={2}>
                      退休金提撥: {formatCurrency(displayResult?.retirement_fund || 0)}
                    </td>
                  </tr>

                  {/* 最終薪資 */}
                  <tr className="border-t-4 border-green-500 bg-green-50">
                    <td className="p-4 font-bold text-lg" colSpan={2}>
                      實付薪資
                    </td>
                    <td className="p-4 text-right font-bold text-2xl text-green-600" colSpan={2}>
                      {formatCurrency((displayResult?.subtotal_before_deductions || 0) - (displayResult?.labor_insurance || 0) - (displayResult?.health_insurance || 0) - leaveDeduction - 15)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 業績明細 */}
            {displayResult?.details && displayResult.details.records && displayResult.details.records.length > 0 && (
              <div className="mt-6" ref={revenueDetailsRef}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">業績明細 (共 {displayResult.details.recordCount || 0} 筆)</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={captureRevenueDetails}>
                      <Camera className="mr-2 h-4 w-4" />
                      複製截圖
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportRevenueDetails}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      匯出 Excel
                    </Button>
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left font-medium">日期</th>
                        <th className="p-2 text-left font-medium">項目</th>
                        <th className="p-2 text-left font-medium">學員名稱</th>
                        <th className="p-2 text-left font-medium">付款方式</th>
                        <th className="p-2 text-left font-medium">諮詢師</th>
                        <th className="p-2 text-left font-medium">電訪人員</th>
                        {displayResult.role_type === 'teacher' && (
                          <th className="p-2 text-center font-medium">成交類型</th>
                        )}
                        <th className="p-2 text-right font-medium">實收金額</th>
                        {displayResult.role_type === 'teacher' && (
                          <th className="p-2 text-right font-medium">抽成金額</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {displayResult.details.records.map((record, index) => {
                        const date = new Date(record.date);
                        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                        return (
                          <tr key={index} className="border-t hover:bg-muted/20">
                            <td className="p-2">{formattedDate}</td>
                            <td className="p-2">{record.item}</td>
                            <td className="p-2">{record.student_name || '-'}</td>
                            <td className="p-2">{record.payment_method || '-'}</td>
                            <td className="p-2">{record.closer || '-'}</td>
                            <td className="p-2">{record.setter || '-'}</td>
                            {displayResult.role_type === 'teacher' && (
                              <td className="p-2 text-center">
                                {record.is_self_closed ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                    自己成交
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                                    他人成交
                                  </span>
                                )}
                              </td>
                            )}
                            <td className="p-2 text-right font-semibold text-blue-600">
                              {formatCurrency(record.amount)}
                            </td>
                            {displayResult.role_type === 'teacher' && (
                              <td className="p-2 text-right font-semibold text-green-600">
                                {formatCurrency(record.commission_amount || 0)}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                      <tr className="border-t bg-blue-50 font-bold">
                        <td colSpan={displayResult.role_type === 'teacher' ? 7 : 6} className="p-2 text-right">總計</td>
                        <td className="p-2 text-right text-blue-600">
                          {formatCurrency(displayResult.total_revenue)}
                        </td>
                        {displayResult.role_type === 'teacher' && (
                          <td className="p-2 text-right text-green-600">
                            {formatCurrency((displayResult.details.self_closed_commission || 0) + (displayResult.details.other_closed_commission || 0))}
                          </td>
                        )}
                      </tr>
                    </tbody>
                  </table>
                  {/* 老師業績分類統計 */}
                  {displayResult.role_type === 'teacher' && displayResult.details.self_closed_revenue !== undefined && (
                    <div className="border-t bg-gradient-to-r from-green-50 to-orange-50 p-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <div className="font-semibold text-green-700">自己成交（抽成 {((displayResult.details.commission_rate_used || 0.22) * 100).toFixed(1)}%）</div>
                          <div className="flex justify-between">
                            <span>業績總額:</span>
                            <span className="font-bold">{formatCurrency(displayResult.details.self_closed_revenue || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>抽成金額:</span>
                            <span className="font-bold text-green-600">{formatCurrency(displayResult.details.self_closed_commission || 0)}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="font-semibold text-orange-700">他人成交（固定比例 16.13%）</div>
                          <div className="flex justify-between">
                            <span>業績總額:</span>
                            <span className="font-bold">{formatCurrency(displayResult.details.other_closed_revenue || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>抽成金額:</span>
                            <span className="font-bold text-orange-600">{formatCurrency(displayResult.details.other_closed_commission || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {displayResult?.details && displayResult.details.recordCount === 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3">業績明細</h3>
                <div className="p-4 text-center text-muted-foreground border rounded-lg">
                  此期間無業績記錄
                </div>
              </div>
            )}

            {/* 體驗課明細（老師專用） */}
            {displayResult?.trial_class_details && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3">
                  🎓 體驗課明細 (共 {displayResult.trial_class_details.total_classes} 堂)
                </h3>
                {displayResult.trial_class_details.records.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-purple-50">
                        <tr>
                          <th className="p-2 text-left font-medium">上課日期</th>
                          <th className="p-2 text-left font-medium">學員姓名</th>
                          <th className="p-2 text-left font-medium">學員信箱</th>
                          <th className="p-2 text-left font-medium">課程類型</th>
                          <th className="p-2 text-right font-medium">鐘點費</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayResult.trial_class_details.records.map((record, index) => {
                          const date = new Date(record.class_date);
                          const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                          return (
                            <tr key={index} className="border-t hover:bg-muted/20">
                              <td className="p-2">{formattedDate}</td>
                              <td className="p-2">{record.student_name || '-'}</td>
                              <td className="p-2 text-muted-foreground text-xs">{record.student_email || '-'}</td>
                              <td className="p-2">
                                <span className="text-xs px-2 py-0.5 rounded bg-gray-100">
                                  {record.course_type || '未知'}
                                </span>
                              </td>
                              <td className="p-2 text-right font-semibold text-purple-600">
                                {formatCurrency(record.hourly_rate || 300)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {/* 體驗課統計 - 按課程類型分類 */}
                    <div className="border-t bg-purple-50 p-3">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span>總堂數: <strong>{displayResult.trial_class_details.total_classes}</strong></span>
                        </div>
                        {/* 按課程類型統計 */}
                        {displayResult.trial_class_details.by_course_type && Object.keys(displayResult.trial_class_details.by_course_type).length > 0 && (
                          <div className="border-t pt-2 mt-2">
                            <div className="text-xs font-semibold text-muted-foreground mb-1">按課程類型統計：</div>
                            <div className="space-y-1 text-sm">
                              {Object.entries(displayResult.trial_class_details.by_course_type).map(([courseType, stats]) => (
                                <div key={courseType} className="flex justify-between items-center">
                                  <span className="text-muted-foreground">{courseType}</span>
                                  <span>
                                    {stats.count} 堂 × {formatCurrency(stats.rate)} = <strong className="text-purple-600">{formatCurrency(stats.subtotal)}</strong>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="border-t pt-2 flex justify-end">
                          <span className="text-sm text-muted-foreground mr-2">體驗課鐘點費總計:</span>
                          <span className="font-bold text-lg text-purple-600">
                            {formatCurrency(displayResult.trial_class_details.trial_class_fee)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground border rounded-lg">
                    此期間無體驗課記錄
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

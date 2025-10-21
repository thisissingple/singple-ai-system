// ============================================
// 收支紀錄表 TypeScript 類型定義
// ============================================

/**
 * 交易類型
 */
export type TransactionType = 'income' | 'expense' | 'refund';

/**
 * 交易來源
 */
export type TransactionSource = 'manual' | 'ai' | 'system_sync' | 'imported';

/**
 * 成交類型（用於顧問獎金計算）
 */
export type DealType = 'self_deal' | 'assisted_deal' | null;

/**
 * 幣別
 */
export type Currency = 'TWD' | 'USD' | 'RMB';

/**
 * 收支記錄
 */
export interface IncomeExpenseRecord {
  id: string;

  // 基本資訊
  transaction_date: string;              // 交易日期 (YYYY-MM-DD)
  transaction_type: TransactionType;
  category: string;                      // 大分類
  item_name: string;                     // 項目名稱

  // 金額資訊
  amount: number;
  currency: Currency;
  exchange_rate_used?: number;           // 鎖定匯率
  amount_in_twd?: number;                // TWD 金額

  // 關聯人員
  customer_id?: string;                  // 客戶 ID（原 student_id）
  customer_name?: string;                // 商家/學生名稱（原 student_name）
  customer_email?: string;               // 客戶 Email（新增）
  customer_phone?: string;               // 客戶電話（新增）
  teacher_id?: string;
  teacher_name?: string;                 // 前端顯示用
  setter_id?: string;
  setter_name?: string;            // 前端顯示用
  consultant_id?: string;
  consultant_name?: string;              // 前端顯示用
  created_by_name?: string;              // 填表人姓名（新增）

  // 業務資訊
  course_code?: string;
  course_type?: string;
  payment_method?: string;
  deal_type?: DealType;

  // 關聯記錄
  cost_profit_record_id?: string;
  trial_purchase_id?: string;

  // 輔助資訊
  notes?: string;
  source: TransactionSource;

  // 狀態
  is_confirmed: boolean;
  confirmed_by?: string;
  confirmed_at?: string;

  // 時間戳
  created_at: string;
  updated_at: string;
  created_by?: string;
}

/**
 * 新增/編輯收支記錄的表單資料
 */
export interface IncomeExpenseFormData {
  transaction_date: string;
  transaction_type: TransactionType;
  category: string;
  item_name: string;
  amount: number;
  currency: Currency;
  customer_id?: string;                  // 客戶 ID（原 student_id）
  customer_name?: string;                // 客戶名稱（新增）
  customer_email?: string;               // 客戶 Email（新增）
  customer_phone?: string;               // 客戶電話（新增）
  teacher_id?: string;
  setter_id?: string;
  consultant_id?: string;
  course_code?: string;
  course_type?: string;
  payment_method?: string;
  deal_type?: DealType;
  notes?: string;
}

/**
 * 查詢參數
 */
export interface IncomeExpenseQueryParams {
  month?: string;                        // YYYY-MM
  transaction_type?: TransactionType;
  category?: string;
  teacher_id?: string;
  customer_id?: string;                  // 客戶 ID（原 student_id）
  consultant_id?: string;
  setter_id?: string;
  search?: string;                       // 關鍵字搜尋
  is_confirmed?: boolean;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

/**
 * 月度統計
 */
export interface MonthlySummary {
  month: string;                         // YYYY-MM
  total_income: number;                  // 總收入（TWD）
  total_expense: number;                 // 總支出（TWD）
  net_profit: number;                    // 淨利（TWD）
  record_count: number;                  // 記錄數量
  by_category: {
    category: string;
    amount: number;
    count: number;
  }[];
  by_currency: {
    currency: Currency;
    amount: number;
    count: number;
  }[];
}

// ============================================
// 薪資計算相關類型
// ============================================

/**
 * 薪資規則類型
 */
export type SalaryRuleType = 'fixed' | 'tiered' | 'course_based';

/**
 * 固定抽成規則配置
 */
export interface FixedCommissionConfig {
  rate: number;  // 抽成比例 (0.1 = 10%)
}

/**
 * 階梯式抽成規則配置
 */
export interface TieredCommissionConfig {
  tiers: {
    minAmount: number;
    maxAmount: number | null;
    rate: number;
  }[];
}

/**
 * 課程類型差異規則配置
 */
export interface CourseBasedCommissionConfig {
  default_rate: number;
  course_rates: {
    course_type: string;
    rate: number;
  }[];
}

/**
 * 薪資規則配置（聯合類型）
 */
export type SalaryRuleConfig =
  | FixedCommissionConfig
  | TieredCommissionConfig
  | CourseBasedCommissionConfig;

/**
 * 薪資規則
 */
export interface SalaryRule {
  id: string;
  role: string;
  user_id?: string;
  base_salary: number;
  rule_type: SalaryRuleType;
  rule_config: SalaryRuleConfig;
  effective_from: string;
  effective_to?: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 顧問獎金規則配置
 */
export interface ConsultantBonusRateConfig {
  selfDeal: {
    belowThreshold: number;
    aboveThreshold: number;
  };
  assistedDeal: {
    belowThreshold: number;
    aboveThreshold: number;
  };
}

/**
 * 顧問獎金規則
 */
export interface ConsultantBonusRule {
  id: string;
  consultant_id?: string;
  performance_threshold: number;
  rate_config: ConsultantBonusRateConfig;
  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 薪資計算狀態
 */
export type SalaryCalculationStatus = 'draft' | 'approved' | 'paid';

/**
 * 薪資計算詳情
 */
export interface SalaryCalculationDetails {
  income_records: {
    record_id: string;
    amount: number;
    rate: number;
    commission: number;
  }[];
  total_income: number;
  total_commission: number;
  rule_applied: string;
}

/**
 * 薪資計算記錄
 */
export interface SalaryCalculation {
  id: string;
  user_id: string;
  user_name?: string;                    // 前端顯示用
  role: string;
  calculation_month: string;             // YYYY-MM-01
  base_salary: number;
  commission: number;
  bonus: number;
  deductions: number;
  total_salary: number;
  income_record_ids: string[];
  calculation_details?: SalaryCalculationDetails;
  status: SalaryCalculationStatus;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  calculated_by?: string;
}

/**
 * 薪資計算請求
 */
export interface SalaryCalculationRequest {
  user_id: string;
  month: string;                         // YYYY-MM
  role: string;
}

/**
 * 批次薪資計算請求
 */
export interface BatchSalaryCalculationRequest {
  month: string;
  role?: string;                         // 可選，指定角色
  user_ids?: string[];                   // 可選，指定用戶
}

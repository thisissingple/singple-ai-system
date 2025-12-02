/**
 * Employee Management Types
 * 員工管理系統類型定義
 */

// ==================== Business Identity ====================

export type IdentityType = 'teacher' | 'consultant' | 'setter' | 'employee';

export interface BusinessIdentity {
  id: string;
  user_id: string;
  identity_type: IdentityType;
  identity_code: string; // T001, C001, S001, E001
  display_name: string | null;
  effective_from: string; // ISO date
  effective_to: string | null; // ISO date
  is_active: boolean;
  is_primary: boolean; // 是否為主身份（用於薪資計算器）
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// ==================== Employee Profile ====================

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';

export interface EmployeeProfile {
  id: string;
  user_id: string;
  national_id: string | null;
  national_id_file_url: string | null;
  residential_address: string | null;
  mailing_address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  employee_number: string | null; // E001, E002...
  hire_date: string | null; // ISO date
  resign_date: string | null; // ISO date
  employment_type: EmploymentType | null;
  contract_file_url: string | null;
  contract_start_date: string | null; // ISO date
  contract_end_date: string | null; // ISO date
  bank_name: string | null;
  bank_account_number: string | null;
  bank_branch: string | null;
  hr_notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// ==================== Employee Compensation ====================

export type CommissionType = 'percentage' | 'fixed' | 'tiered' | 'fixed_rate' | 'none';

export interface CommissionConfig {
  // For percentage type
  percentage?: number; // 0.15 = 15%

  // For fixed type
  fixed_amount?: number;

  // For tiered type
  tiers?: Array<{
    min_amount: number;
    max_amount: number | null;
    rate: number; // percentage
  }>;

  // Additional config
  target_types?: string[]; // ['trial_class', 'conversion', 'renewal']
  notes?: string;
}

export interface Allowances {
  transportation?: number;
  meal?: number;
  housing?: number;
  phone?: number;
  other?: Array<{
    name: string;
    amount: number;
  }>;
}

export interface EmployeeCompensation {
  id: string;
  user_id: string;
  base_salary: number | null;
  commission_type: CommissionType | null;
  commission_config: CommissionConfig | null;
  allowances: Allowances | null;
  effective_from: string; // ISO date
  effective_to: string | null; // ISO date
  adjustment_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// ==================== Employee Salary Settings (for Salary Calculator) ====================

export type SalaryRoleType = 'teacher' | 'closer' | 'setter';
export type SalaryEmploymentType = 'full_time' | 'part_time';

export interface EmployeeSalarySettings {
  id: string;
  employee_name: string;
  role_type: SalaryRoleType;
  employment_type: SalaryEmploymentType;
  base_salary: number | null;
  hourly_rate: number | null;
  commission_rate: number | null;
  point_commission_rate: number | null;
  performance_bonus: number | null;
  phone_bonus_rate: number | null;
  original_bonus: number | null;
  online_course_rate: number | null;
  labor_insurance: number | null;
  health_insurance: number | null;
  retirement_fund: number | null;
  service_fee: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== Employee Insurance ====================

export interface EmployeeInsurance {
  id: string;
  user_id: string;
  labor_insurance_grade: number | null;
  labor_insurance_amount: number | null;
  labor_insurance_employer_amount: number | null;
  health_insurance_grade: number | null;
  health_insurance_amount: number | null;
  health_insurance_employer_amount: number | null;
  pension_salary_base: number | null;
  pension_employer_rate: number | null; // 0.06 = 6%
  pension_employee_rate: number | null; // 0.06 = 6%
  pension_employer_amount: number | null;
  pension_employee_amount: number | null;
  effective_from: string; // ISO date
  effective_to: string | null; // ISO date
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// ==================== Combined Employee Data ====================

export interface User {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  profile_image_url: string | null;
  role: string | null;
  roles?: string[]; // Multi-role support
  department: string | null;
  status: 'active' | 'inactive';
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeData {
  user: User;
  profile: EmployeeProfile | null;
  identities: BusinessIdentity[];
  compensation: EmployeeCompensation[];
  insurance: EmployeeInsurance[];
  // 新增：薪資計算器用的薪資設定
  salary_settings?: EmployeeSalarySettings | null;
  // 前端快捷存取（從 API 直接映射）
  latest_compensation?: {
    id?: string;
    base_salary?: number | null;
    commission_type?: CommissionType | null;
    commission_rate?: number | null;
    // 階梯式抽成欄位
    tier1_max_revenue?: number | null;
    tier1_commission_amount?: number | null;
    tier2_max_revenue?: number | null;
    tier2_commission_amount?: number | null;
    other_revenue_rate?: number | null;
    effective_from?: string;
    adjustment_reason?: string | null;
  } | null;
  latest_insurance?: EmployeeInsurance | null;
}

// ==================== API Response Types ====================

export interface EmployeeListResponse {
  success: boolean;
  data: EmployeeData[];
  total: number;
}

export interface EmployeeDetailResponse {
  success: boolean;
  data: EmployeeData;
}

// ==================== Form Types ====================

export interface BusinessIdentityFormData {
  identity_type: IdentityType;
  display_name: string;
  effective_from: string;
  effective_to?: string;
  notes?: string;
}

export interface EmployeeProfileFormData {
  national_id?: string;
  residential_address?: string;
  mailing_address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  hire_date?: string;
  resign_date?: string;
  employment_type?: EmploymentType;
  contract_start_date?: string;
  contract_end_date?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_branch?: string;
  hr_notes?: string;
}

export interface EmployeeCompensationFormData {
  base_salary?: number;
  commission_type?: CommissionType;
  commission_config?: CommissionConfig;
  allowances?: Allowances;
  effective_from: string;
  effective_to?: string;
  adjustment_reason?: string;
}

export interface EmployeeInsuranceFormData {
  labor_insurance_grade?: number;
  labor_insurance_amount?: number;
  labor_insurance_employer_amount?: number;
  health_insurance_grade?: number;
  health_insurance_amount?: number;
  health_insurance_employer_amount?: number;
  pension_salary_base?: number;
  pension_employer_rate?: number;
  pension_employee_rate?: number;
  pension_employer_amount?: number;
  pension_employee_amount?: number;
  effective_from: string;
  effective_to?: string;
  notes?: string;
}

// ==================== Utility Functions ====================

export function getIdentityTypeLabel(type: IdentityType): string {
  const labels: Record<IdentityType, string> = {
    teacher: '教師',
    consultant: '諮詢師',
    setter: '電訪',
    employee: '員工',
  };
  return labels[type] || type;
}

export function getEmploymentTypeLabel(type: EmploymentType): string {
  const labels: Record<EmploymentType, string> = {
    full_time: '全職',
    part_time: '兼職',
    contract: '約聘',
    intern: '實習',
  };
  return labels[type] || type;
}

export function getCommissionTypeLabel(type: CommissionType): string {
  const labels: Record<CommissionType, string> = {
    percentage: '百分比抽成',
    fixed: '固定金額',
    tiered: '階梯式抽成',
    none: '無抽成',
  };
  return labels[type] || type;
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatPercentage(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return '-';
  return `${(rate * 100).toFixed(1)}%`;
}

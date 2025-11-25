-- Migration 043: Create User Permission Management System
-- Purpose: Enable manual permission assignment for feature modules
-- Date: 2025-10-30

-- =====================================================
-- Table 1: permission_modules
-- Stores module definitions for feature-level access control
-- =====================================================
CREATE TABLE IF NOT EXISTS permission_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT UNIQUE NOT NULL,
  module_name TEXT NOT NULL,
  module_category TEXT NOT NULL, -- 'teacher_system', 'telemarketing_system', 'consultant_system', 'management_system'
  description TEXT,
  supports_scope BOOLEAN DEFAULT true, -- Whether this module supports 'all' vs 'own_only' scope
  related_table TEXT, -- Main table for data filtering (e.g., 'trial_class_attendance')
  related_apis TEXT[], -- API endpoints protected by this module
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Table 2: user_permissions
-- Stores user-module permission assignments
-- =====================================================
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL REFERENCES permission_modules(module_id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'all', -- 'all' (see all data) | 'own_only' (see only own data)
  is_active BOOLEAN DEFAULT true,
  granted_by UUID REFERENCES users(id), -- Who granted this permission
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id), -- One permission per user per module
  CHECK (scope IN ('all', 'own_only'))
);

-- =====================================================
-- Indexes for performance
-- =====================================================
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_module_id ON user_permissions(module_id);
CREATE INDEX idx_user_permissions_active ON user_permissions(is_active) WHERE is_active = true;
CREATE INDEX idx_permission_modules_category ON permission_modules(module_category);
CREATE INDEX idx_permission_modules_active ON permission_modules(is_active) WHERE is_active = true;

-- =====================================================
-- Insert initial permission modules
-- =====================================================

-- Teacher System Modules
INSERT INTO permission_modules (module_id, module_name, module_category, description, supports_scope, related_table, related_apis, display_order) VALUES
('trial_class_report', '體驗課報表', 'teacher_system', '查看和管理體驗課記錄、出席狀況', true, 'trial_class_attendance',
  ARRAY['/api/reports/trial-class', '/api/trial-class-attendance'], 1),
('teaching_quality', '教學品質系統', 'teacher_system', '查看教學品質分析、出席記錄評分', true, 'teaching_quality_analysis',
  ARRAY['/api/teaching-quality/attendance-records', '/api/teaching-quality/analysis'], 2),
('teacher_forms', '教師表單', 'teacher_system', '填寫和查看教師相關表單', true, 'custom_form_submissions',
  ARRAY['/api/forms/teacher'], 3);

-- Telemarketing System Modules
INSERT INTO permission_modules (module_id, module_name, module_category, description, supports_scope, related_table, related_apis, display_order) VALUES
('telemarketing_system', '電訪系統', 'telemarketing_system', '管理電訪記錄、學生跟進、廣告名單', true, 'telemarketing_calls',
  ARRAY['/api/telemarketing/calls', '/api/telemarketing/calls/stats'], 10),
('ad_leads', '廣告名單管理', 'telemarketing_system', '查看和管理廣告潛在客戶', true, 'ad_leads',
  ARRAY['/api/leads/ad-leads'], 11),
('gohighlevel_contacts', 'GoHighLevel 聯絡人', 'telemarketing_system', '管理 GoHighLevel 整合的聯絡人', true, 'gohighlevel_contacts',
  ARRAY['/api/leads/gohighlevel'], 12),
('telemarketing_forms', '電訪表單', 'telemarketing_system', '填寫和查看電訪相關表單', true, 'custom_form_submissions',
  ARRAY['/api/forms/telemarketing'], 13);

-- Consultant System Modules
INSERT INTO permission_modules (module_id, module_name, module_category, description, supports_scope, related_table, related_apis, display_order) VALUES
('consultant_report', '諮詢師報表', 'consultant_system', '查看諮詢師成交記錄和業績統計', true, 'trial_class_purchase',
  ARRAY['/api/reports/consultant'], 20),
('consultant_forms', '諮詢師表單', 'consultant_system', '填寫和查看諮詢師相關表單', true, 'custom_form_submissions',
  ARRAY['/api/forms/consultant'], 21);

-- Management System Modules (Admin/Manager)
INSERT INTO permission_modules (module_id, module_name, module_category, description, supports_scope, related_table, related_apis, display_order) VALUES
('dashboard', '儀表板', 'management_system', '查看系統整體 KPI 和統計資料', false, NULL,
  ARRAY['/api/dashboard', '/api/reports/total-report'], 30),
('income_expense', '收支管理', 'management_system', '管理收入和支出記錄', true, 'income_expense_records',
  ARRAY['/api/income-expense'], 31),
('cost_profit', '成本利潤報表', 'management_system', '查看成本利潤分析和財務報表', true, 'cost_profit',
  ARRAY['/api/cost-profit', '/api/cost-profit/summary'], 32),
('employee_management', '員工管理', 'management_system', '管理員工資料、角色、身份', false, 'users',
  ARRAY['/api/users', '/api/business-identities'], 33),
('form_builder', '表單建立器', 'management_system', '建立和管理自訂表單', false, 'custom_forms',
  ARRAY['/api/forms/custom'], 34),
('database_browser', '資料庫瀏覽器', 'management_system', '直接查看和編輯資料庫資料', false, NULL,
  ARRAY['/api/database/tables'], 35),
('kpi_calculator', 'KPI 計算器', 'management_system', '配置和測試 KPI 計算公式', false, 'report_metric_configs',
  ARRAY['/api/kpi/calculate'], 36),
('system_settings', '系統設定', 'management_system', '管理系統設定、權限、角色', false, NULL,
  ARRAY['/api/settings', '/api/permissions'], 37);

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE permission_modules IS '權限模組定義表：儲存系統中所有可授權的功能模組';
COMMENT ON TABLE user_permissions IS '使用者權限表：儲存使用者對各模組的存取權限';
COMMENT ON COLUMN permission_modules.module_id IS '模組唯一識別碼，用於程式碼中檢查權限';
COMMENT ON COLUMN permission_modules.module_category IS '模組分類：teacher_system, telemarketing_system, consultant_system, management_system';
COMMENT ON COLUMN permission_modules.supports_scope IS '是否支援資料範圍過濾（all 看全部 vs own_only 只看自己的）';
COMMENT ON COLUMN user_permissions.scope IS '資料範圍：all=查看所有資料, own_only=僅查看自己的資料';
COMMENT ON COLUMN user_permissions.granted_by IS '授權者的 user_id，記錄是誰給予這個權限';

-- =====================================================
-- Migration complete
-- =====================================================

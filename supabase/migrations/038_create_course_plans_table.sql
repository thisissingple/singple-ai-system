/**
 * Migration 038: 創建課程方案表
 *
 * 目的：儲存各種體驗課方案及其對應的堂數
 * 用途：自動計算剩餘堂數 = 方案總堂數 - 已上堂數
 *
 * 作者：Claude Code
 * 日期：2025-10-23
 */

-- ==================== 課程方案表 ====================
CREATE TABLE IF NOT EXISTS course_plans (
  id BIGSERIAL PRIMARY KEY,

  -- 方案資訊
  plan_name VARCHAR(255) NOT NULL UNIQUE,  -- 方案名稱（如：初學專案、進階專案）
  plan_code VARCHAR(50),                    -- 方案代碼（選填）
  total_classes INTEGER NOT NULL,           -- 總堂數

  -- 方案描述
  description TEXT,                         -- 方案描述
  category VARCHAR(100),                    -- 方案分類（體驗課/正式課/特殊方案）

  -- 定價資訊（選填）
  price_per_class DECIMAL(10, 2),          -- 每堂單價
  total_price DECIMAL(10, 2),              -- 方案總價

  -- 狀態管理
  is_active BOOLEAN DEFAULT TRUE,          -- 是否啟用
  display_order INTEGER DEFAULT 0,         -- 顯示順序

  -- 時間戳記
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- 備註
  notes TEXT
);

-- ==================== 索引 ====================
CREATE INDEX idx_course_plans_active ON course_plans(is_active);
CREATE INDEX idx_course_plans_category ON course_plans(category);
CREATE INDEX idx_course_plans_name ON course_plans(plan_name);

-- ==================== 觸發器：自動更新 updated_at ====================
CREATE OR REPLACE FUNCTION update_course_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_course_plans_timestamp
  BEFORE UPDATE ON course_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_course_plans_updated_at();

-- ==================== 預設資料 ====================
-- 插入常見的體驗課方案
INSERT INTO course_plans (plan_name, total_classes, category, description, is_active, display_order) VALUES
  ('初學專案', 4, '體驗課', '適合初學者的4堂體驗課程', TRUE, 1),
  ('進階專案', 6, '體驗課', '適合進階學員的6堂體驗課程', TRUE, 2),
  ('密集專案', 8, '體驗課', '密集訓練的8堂體驗課程', TRUE, 3),
  ('一對一體驗', 3, '體驗課', '一對一教學的3堂體驗課', TRUE, 4),
  ('團體體驗', 4, '體驗課', '團體課程的4堂體驗', TRUE, 5)
ON CONFLICT (plan_name) DO NOTHING;

-- ==================== 權限設定 ====================
-- Admin 可以完整管理
-- Manager 可以查看和編輯
-- 其他角色只能查看
COMMENT ON TABLE course_plans IS '課程方案表：儲存各種體驗課方案及對應堂數，用於自動計算剩餘堂數';
COMMENT ON COLUMN course_plans.plan_name IS '方案名稱（唯一）';
COMMENT ON COLUMN course_plans.total_classes IS '方案總堂數';
COMMENT ON COLUMN course_plans.category IS '方案分類（體驗課/正式課/特殊方案）';
COMMENT ON COLUMN course_plans.is_active IS '是否啟用（停用的方案不會出現在下拉選單）';

-- ============================================
-- Migration 090: 老師課程進度追蹤表
-- 目標：追蹤老師教學進度，支援2025新制分潤計算
-- 執行日期：2025-12-02
-- ============================================

-- ========================================
-- 1. 建立老師課程進度表
-- ========================================

CREATE TABLE IF NOT EXISTS teacher_course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 關聯
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  student_email TEXT NOT NULL,
  purchase_id UUID,  -- 關聯到 trial_class_purchases

  -- 課程資訊
  course_type VARCHAR(50) DEFAULT 'full',  -- 'full' (完整課程), '1/3', '2/3'
  purchase_amount DECIMAL(12,2),            -- 購買金額

  -- 成交資訊
  closer_id UUID REFERENCES users(id),      -- 成交者
  is_self_closed BOOLEAN DEFAULT FALSE,     -- 是否老師自己成交

  -- 卡片進度 (總共37張)
  total_cards INTEGER DEFAULT 37,
  cards_completed INTEGER DEFAULT 0,

  -- 模組完成狀態
  track_completed BOOLEAN DEFAULT FALSE,    -- 軌道完成 (9張)
  track_completed_at TIMESTAMP,
  pivot_completed BOOLEAN DEFAULT FALSE,    -- 支點完成 (20張)
  pivot_completed_at TIMESTAMP,
  breath_completed BOOLEAN DEFAULT FALSE,   -- 氣息完成 (37張)
  breath_completed_at TIMESTAMP,

  -- Trello 同步資訊
  trello_card_id TEXT,                      -- Trello 卡片 ID
  trello_list_id TEXT,                      -- Trello 列表 ID
  trello_board_id TEXT,                     -- Trello 看板 ID
  last_synced_at TIMESTAMP,                 -- 最後同步時間

  -- 分潤計算快取
  teaching_commission_paid DECIMAL(12,2) DEFAULT 0,  -- 已發放教學分潤
  module_bonus_paid DECIMAL(12,2) DEFAULT 0,         -- 已發放模組獎勵
  sales_bonus_paid DECIMAL(12,2) DEFAULT 0,          -- 已發放銷售獎金

  -- 狀態
  status VARCHAR(50) DEFAULT 'active',      -- 'active', 'completed', 'refunded', 'transferred'
  notes TEXT,

  -- 時間戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 2. 建立卡片完成記錄表
-- ========================================

CREATE TABLE IF NOT EXISTS teacher_card_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  progress_id UUID REFERENCES teacher_course_progress(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id),
  student_email TEXT NOT NULL,

  -- 卡片資訊
  card_number INTEGER NOT NULL,             -- 卡片編號 (1-37)
  card_name TEXT,                           -- 卡片名稱
  module_name VARCHAR(50),                  -- 所屬模組: 'track', 'pivot', 'breath'

  -- Trello 資訊
  trello_card_id TEXT,
  trello_checklist_item_id TEXT,

  -- 完成資訊
  completed_at TIMESTAMP NOT NULL,
  completed_by UUID REFERENCES users(id),   -- 標記完成的人

  -- 分潤
  card_value DECIMAL(8,2),                  -- 單張卡片價值 ($770 或 $654)
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMP,
  paid_in_period TEXT,                      -- 發放的薪資期間 (如 '2025-01')

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 3. 建立 Trello 同步設定表
-- ========================================

CREATE TABLE IF NOT EXISTS trello_sync_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Trello 設定
  board_id TEXT NOT NULL,
  board_name TEXT,

  -- 列表對應
  list_mappings JSONB DEFAULT '{}',         -- { "listId": "status" }

  -- 同步設定
  sync_enabled BOOLEAN DEFAULT TRUE,
  sync_interval_minutes INTEGER DEFAULT 30,
  last_sync_at TIMESTAMP,
  last_sync_status VARCHAR(50),
  last_sync_error TEXT,

  -- API 設定 (加密儲存)
  api_key_encrypted TEXT,
  api_token_encrypted TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 4. 建立索引
-- ========================================

CREATE INDEX IF NOT EXISTS idx_teacher_course_progress_teacher ON teacher_course_progress(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_course_progress_student ON teacher_course_progress(student_email);
CREATE INDEX IF NOT EXISTS idx_teacher_course_progress_closer ON teacher_course_progress(closer_id);
CREATE INDEX IF NOT EXISTS idx_teacher_course_progress_trello ON teacher_course_progress(trello_card_id);
CREATE INDEX IF NOT EXISTS idx_teacher_course_progress_status ON teacher_course_progress(status);

CREATE INDEX IF NOT EXISTS idx_teacher_card_completions_progress ON teacher_card_completions(progress_id);
CREATE INDEX IF NOT EXISTS idx_teacher_card_completions_teacher ON teacher_card_completions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_card_completions_student ON teacher_card_completions(student_email);
CREATE INDEX IF NOT EXISTS idx_teacher_card_completions_completed ON teacher_card_completions(completed_at);

-- ========================================
-- 5. 建立觸發器 - 自動更新 updated_at
-- ========================================

CREATE OR REPLACE FUNCTION update_teacher_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_teacher_course_progress_updated_at
  BEFORE UPDATE ON teacher_course_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_progress_updated_at();

-- ========================================
-- 6. 建立觸發器 - 卡片完成時自動更新進度
-- ========================================

CREATE OR REPLACE FUNCTION update_progress_on_card_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_cards_count INTEGER;
  v_track_count INTEGER;
  v_pivot_count INTEGER;
BEGIN
  -- 更新已完成卡片數
  SELECT COUNT(*) INTO v_cards_count
  FROM teacher_card_completions
  WHERE progress_id = NEW.progress_id;

  UPDATE teacher_course_progress
  SET cards_completed = v_cards_count
  WHERE id = NEW.progress_id;

  -- 檢查軌道完成 (卡片 1-9)
  SELECT COUNT(*) INTO v_track_count
  FROM teacher_card_completions
  WHERE progress_id = NEW.progress_id AND card_number <= 9;

  IF v_track_count >= 9 THEN
    UPDATE teacher_course_progress
    SET track_completed = TRUE,
        track_completed_at = COALESCE(track_completed_at, NOW())
    WHERE id = NEW.progress_id AND track_completed = FALSE;
  END IF;

  -- 檢查支點完成 (卡片 1-20)
  SELECT COUNT(*) INTO v_pivot_count
  FROM teacher_card_completions
  WHERE progress_id = NEW.progress_id AND card_number <= 20;

  IF v_pivot_count >= 20 THEN
    UPDATE teacher_course_progress
    SET pivot_completed = TRUE,
        pivot_completed_at = COALESCE(pivot_completed_at, NOW())
    WHERE id = NEW.progress_id AND pivot_completed = FALSE;
  END IF;

  -- 檢查氣息完成 (全部37張)
  IF v_cards_count >= 37 THEN
    UPDATE teacher_course_progress
    SET breath_completed = TRUE,
        breath_completed_at = COALESCE(breath_completed_at, NOW()),
        status = 'completed'
    WHERE id = NEW.progress_id AND breath_completed = FALSE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_progress_on_card_completion
  AFTER INSERT ON teacher_card_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_progress_on_card_completion();

-- ========================================
-- 7. 新增分潤設定欄位到 employee_salary_settings
-- ========================================

-- 卡片價值
ALTER TABLE employee_salary_settings
ADD COLUMN IF NOT EXISTS card_value_self_closed DECIMAL(8,2) DEFAULT 770;

ALTER TABLE employee_salary_settings
ADD COLUMN IF NOT EXISTS card_value_other_closed DECIMAL(8,2) DEFAULT 654;

-- 銷售獎金率
ALTER TABLE employee_salary_settings
ADD COLUMN IF NOT EXISTS sales_bonus_rate DECIMAL(5,4) DEFAULT 0.08;

-- 模組完成獎勵
ALTER TABLE employee_salary_settings
ADD COLUMN IF NOT EXISTS track_bonus DECIMAL(8,2) DEFAULT 1000;

ALTER TABLE employee_salary_settings
ADD COLUMN IF NOT EXISTS pivot_bonus DECIMAL(8,2) DEFAULT 1500;

ALTER TABLE employee_salary_settings
ADD COLUMN IF NOT EXISTS breath_bonus DECIMAL(8,2) DEFAULT 2000;

-- 欄位註解
COMMENT ON COLUMN employee_salary_settings.card_value_self_closed IS '自己成交時每張卡片價值，預設 $770';
COMMENT ON COLUMN employee_salary_settings.card_value_other_closed IS '他人成交時每張卡片價值，預設 $654';
COMMENT ON COLUMN employee_salary_settings.sales_bonus_rate IS '銷售獎金比例，預設 8%';
COMMENT ON COLUMN employee_salary_settings.track_bonus IS '軌道模組完成獎勵，預設 $1,000';
COMMENT ON COLUMN employee_salary_settings.pivot_bonus IS '支點模組完成獎勵，預設 $1,500';
COMMENT ON COLUMN employee_salary_settings.breath_bonus IS '氣息模組完成獎勵，預設 $2,000';

-- ========================================
-- 8. 啟用 RLS
-- ========================================

ALTER TABLE teacher_course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_card_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trello_sync_config ENABLE ROW LEVEL SECURITY;

-- 允許 service_role 完全存取
CREATE POLICY "Enable all for service_role" ON teacher_course_progress FOR ALL USING (true);
CREATE POLICY "Enable all for service_role" ON teacher_card_completions FOR ALL USING (true);
CREATE POLICY "Enable all for service_role" ON trello_sync_config FOR ALL USING (true);

-- ========================================
-- 完成
-- ========================================

SELECT '✅ Migration 090 完成：老師課程進度追蹤表已建立' as status;

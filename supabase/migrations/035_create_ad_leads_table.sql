-- ========================================
-- 廣告名單表（Facebook Lead Ads）
-- ========================================
-- 用途：追蹤 Facebook Lead Ads 廣告名單的轉換流程
-- 兩階段轉換：
--   階段 1：廣告名單 → 預約體驗課
--   階段 2：體驗課 → 成交正式課程

CREATE TABLE IF NOT EXISTS ad_leads (
  -- 基本資訊
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Facebook Lead Ads 資料
  leadgen_id TEXT UNIQUE,           -- Facebook 名單 ID（用於防止重複）
  ad_id TEXT,                       -- 廣告 ID
  ad_name TEXT,                     -- 廣告名稱
  campaign_id TEXT,                 -- 廣告活動 ID
  campaign_name TEXT,               -- 廣告活動名稱
  form_id TEXT,                     -- 表單 ID
  form_name TEXT,                   -- 表單名稱

  -- 學員資訊
  student_name TEXT NOT NULL,
  student_phone TEXT NOT NULL,
  student_email TEXT,

  -- 認領狀態
  claim_status TEXT DEFAULT 'unclaimed',  -- unclaimed（未認領）, claimed（已認領）
  claimed_by TEXT,                  -- 認領人（電訪人員姓名或 user_id）
  claimed_at TIMESTAMPTZ,           -- 認領時間

  -- 聯絡狀態
  contact_status TEXT DEFAULT 'pending',  -- pending（待聯絡）, contacted（已聯絡）, no_answer（無人接聽）, invalid（無效號碼）
  first_contact_date TIMESTAMPTZ,
  last_contact_date TIMESTAMPTZ,
  contact_count INTEGER DEFAULT 0,  -- 聯絡次數

  -- 轉換追蹤 - 階段 1：預約諮詢
  stage1_status TEXT DEFAULT 'pending',   -- pending（未預約）, scheduled（已預約在 EOD）, rejected（拒絕預約）
  stage1_converted_at TIMESTAMPTZ,        -- 階段 1 轉換時間（出現在 EOD 的時間）

  -- 轉換追蹤 - 階段 2：是否上線諮詢
  stage2_status TEXT DEFAULT 'pending',   -- pending（未上線）, showed（已上線）, no_show（未出席）
  stage2_converted_at TIMESTAMPTZ,        -- 階段 2 轉換時間（上線時間）

  -- 轉換追蹤 - 階段 3：高階課程成交
  stage3_status TEXT DEFAULT 'pending',   -- pending（未成交）, converted（已成交高階）, trial_only（僅購買體驗課）, lost（流失）
  stage3_converted_at TIMESTAMPTZ,        -- 階段 3 轉換時間（成交時間）
  deal_amount DECIMAL(10, 2),             -- 成交金額
  deal_package TEXT,                      -- 成交方案名稱
  consultation_result TEXT,               -- 諮詢結果（從 EOD 複製）

  -- 關聯資料
  telemarketing_call_ids UUID[],          -- 關聯的電訪記錄 ID 陣列
  eod_record_id UUID,                     -- 關聯的 EOD 諮詢記錄 ID（重要！）
  trial_class_purchase_id UUID,           -- 如果僅購買體驗課，關聯的體驗課購買記錄 ID

  -- 備註
  notes TEXT,                             -- 備註
  rejection_reason TEXT,                  -- 拒絕原因
  lost_reason TEXT,                       -- 流失原因

  -- 系統欄位
  raw_data JSONB DEFAULT '{}'::jsonb,     -- Facebook 原始資料
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- 索引
-- ========================================

CREATE INDEX idx_ad_leads_leadgen_id ON ad_leads(leadgen_id);
CREATE INDEX idx_ad_leads_campaign_id ON ad_leads(campaign_id);
CREATE INDEX idx_ad_leads_ad_id ON ad_leads(ad_id);
CREATE INDEX idx_ad_leads_student_phone ON ad_leads(student_phone);
CREATE INDEX idx_ad_leads_student_email ON ad_leads(student_email);
CREATE INDEX idx_ad_leads_claim_status ON ad_leads(claim_status);
CREATE INDEX idx_ad_leads_claimed_by ON ad_leads(claimed_by);
CREATE INDEX idx_ad_leads_contact_status ON ad_leads(contact_status);
CREATE INDEX idx_ad_leads_stage1_status ON ad_leads(stage1_status);
CREATE INDEX idx_ad_leads_stage2_status ON ad_leads(stage2_status);
CREATE INDEX idx_ad_leads_stage3_status ON ad_leads(stage3_status);
CREATE INDEX idx_ad_leads_created_at ON ad_leads(created_at);
CREATE INDEX idx_ad_leads_eod_record_id ON ad_leads(eod_record_id);

-- ========================================
-- 更新時間戳記觸發器
-- ========================================

CREATE OR REPLACE FUNCTION update_ad_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ad_leads_updated_at
  BEFORE UPDATE ON ad_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_ad_leads_updated_at();

-- ========================================
-- 權限設定
-- ========================================

GRANT ALL ON ad_leads TO authenticated;
GRANT ALL ON ad_leads TO anon;

-- ========================================
-- 註解
-- ========================================

COMMENT ON TABLE ad_leads IS '廣告名單表 - Facebook Lead Ads 名單追蹤與三階段轉換（預約諮詢→上線→高階成交）';
COMMENT ON COLUMN ad_leads.leadgen_id IS 'Facebook 名單 ID（唯一值，防止重複插入）';
COMMENT ON COLUMN ad_leads.claim_status IS '認領狀態：unclaimed（未認領）, claimed（已認領）';
COMMENT ON COLUMN ad_leads.contact_status IS '聯絡狀態：pending, contacted, no_answer, invalid';
COMMENT ON COLUMN ad_leads.stage1_status IS '階段 1 狀態：pending（未預約）, scheduled（已預約在 EOD）, rejected（拒絕）';
COMMENT ON COLUMN ad_leads.stage2_status IS '階段 2 狀態：pending（未上線）, showed（已上線）, no_show（未出席）';
COMMENT ON COLUMN ad_leads.stage3_status IS '階段 3 狀態：pending（未成交）, converted（已成交高階）, trial_only（僅購買體驗課）, lost（流失）';
COMMENT ON COLUMN ad_leads.eod_record_id IS '關聯的 eods_for_closers 記錄 ID（用於追蹤諮詢結果）';
COMMENT ON COLUMN ad_leads.telemarketing_call_ids IS '關聯的所有電訪記錄 ID';

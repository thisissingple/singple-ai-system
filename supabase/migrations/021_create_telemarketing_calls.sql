-- 電訪記錄表
-- 記錄電訪人員的每次電話聯絡情況

CREATE TABLE IF NOT EXISTS telemarketing_calls (
  -- 基本資訊
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  student_phone TEXT,
  student_email TEXT,

  -- 電訪資訊
  caller_name TEXT NOT NULL,
  call_date DATE NOT NULL,
  call_time TIME,
  call_duration INTEGER, -- 通話時長（秒）

  -- 聯絡結果
  call_result TEXT NOT NULL, -- 已接通、未接通、拒接、無效號碼等
  contact_status TEXT, -- 有意願、考慮中、無意願、再聯絡
  scheduled_callback_date DATE, -- 預約回電日期

  -- 意向資訊
  interest_level TEXT, -- 高、中、低
  interested_package TEXT, -- 感興趣的方案
  budget_range TEXT, -- 預算範圍

  -- 後續處理
  forwarded_to_consultant BOOLEAN DEFAULT false,
  consultant_name TEXT,

  -- 備註
  notes TEXT,

  -- 系統欄位
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 建立索引
CREATE INDEX idx_telemarketing_student_name ON telemarketing_calls(student_name);
CREATE INDEX idx_telemarketing_student_phone ON telemarketing_calls(student_phone);
CREATE INDEX idx_telemarketing_caller ON telemarketing_calls(caller_name);
CREATE INDEX idx_telemarketing_call_date ON telemarketing_calls(call_date);
CREATE INDEX idx_telemarketing_result ON telemarketing_calls(call_result);
CREATE INDEX idx_telemarketing_status ON telemarketing_calls(contact_status);

-- 權限設定
GRANT ALL ON telemarketing_calls TO authenticated;
GRANT ALL ON telemarketing_calls TO anon;

-- 註解
COMMENT ON TABLE telemarketing_calls IS '電訪記錄表 - 記錄電訪人員的電話聯絡情況';
COMMENT ON COLUMN telemarketing_calls.call_duration IS '通話時長（秒）';
COMMENT ON COLUMN telemarketing_calls.call_result IS '聯絡結果：已接通、未接通、拒接、無效號碼等';
COMMENT ON COLUMN telemarketing_calls.contact_status IS '聯絡狀態：有意願、考慮中、無意願、再聯絡';
COMMENT ON COLUMN telemarketing_calls.interest_level IS '意向程度：高、中、低';

-- Migration 046: 新增諮詢 AI 分析功能
-- 建立日期: 2025-11-05
-- 目的:
--   1. 新增 consultation_transcript 欄位到 eods_for_closers 表
--   2. 建立 consultation_quality_analysis 表儲存 AI 分析結果
--   3. 不會自動分析，只支援手動觸發

-- ============================================================================
-- Part 1: 新增欄位到 eods_for_closers 表
-- ============================================================================

-- 新增諮詢轉錄內容欄位（可為空，因為舊記錄沒有轉錄）
ALTER TABLE eods_for_closers
ADD COLUMN IF NOT EXISTS consultation_transcript TEXT;

-- 新增諮詢時長欄位（可為空）
ALTER TABLE eods_for_closers
ADD COLUMN IF NOT EXISTS consultation_duration_minutes INTEGER;

COMMENT ON COLUMN eods_for_closers.consultation_transcript IS '諮詢內容轉錄文字，用於 AI 分析';
COMMENT ON COLUMN eods_for_closers.consultation_duration_minutes IS '諮詢時長（分鐘）';

-- ============================================================================
-- Part 2: 建立 consultation_quality_analysis 表
-- ============================================================================

CREATE TABLE IF NOT EXISTS consultation_quality_analysis (
  -- 主鍵
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 外鍵關聯到諮詢記錄
  eod_id UUID NOT NULL REFERENCES eods_for_closers(id) ON DELETE CASCADE,

  -- 基本資訊（冗餘儲存，方便查詢）
  student_name TEXT,
  closer_name TEXT,
  consultation_date DATE,

  -- ========== AI 分析結果 ==========

  -- 總體評分與評論
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 10),
  overall_comment TEXT,

  -- 亮點與改進建議（陣列格式）
  strengths TEXT[],
  improvements TEXT[],
  recommendations TEXT[],

  -- ========== 評分維度（諮詢專用）==========

  -- 1. 建立關係（Rapport Building）
  rapport_building_score INTEGER CHECK (rapport_building_score >= 1 AND rapport_building_score <= 10),
  rapport_building_comment TEXT,

  -- 2. 需求分析（Needs Analysis）
  needs_analysis_score INTEGER CHECK (needs_analysis_score >= 1 AND needs_analysis_score <= 10),
  needs_analysis_comment TEXT,

  -- 3. 異議處理（Objection Handling）
  objection_handling_score INTEGER CHECK (objection_handling_score >= 1 AND objection_handling_score <= 10),
  objection_handling_comment TEXT,

  -- 4. 成交技巧（Closing Technique）
  closing_technique_score INTEGER CHECK (closing_technique_score >= 1 AND closing_technique_score <= 10),
  closing_technique_comment TEXT,

  -- ========== 系統欄位 ==========

  -- 分析時間與版本
  analyzed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  analysis_version VARCHAR(10) DEFAULT '1.0',

  -- 建立與更新時間
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- 確保每筆諮詢記錄只有一個分析結果
  UNIQUE(eod_id)
);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_consultation_quality_analysis_eod_id
  ON consultation_quality_analysis(eod_id);

CREATE INDEX IF NOT EXISTS idx_consultation_quality_analysis_closer_name
  ON consultation_quality_analysis(closer_name);

CREATE INDEX IF NOT EXISTS idx_consultation_quality_analysis_consultation_date
  ON consultation_quality_analysis(consultation_date);

CREATE INDEX IF NOT EXISTS idx_consultation_quality_analysis_overall_rating
  ON consultation_quality_analysis(overall_rating);

-- 新增表註解
COMMENT ON TABLE consultation_quality_analysis IS '諮詢品質 AI 分析結果表（手動觸發，不會自動分析）';
COMMENT ON COLUMN consultation_quality_analysis.eod_id IS '關聯到 eods_for_closers 表的諮詢記錄 ID';
COMMENT ON COLUMN consultation_quality_analysis.overall_rating IS '總體評分（1-10 分）';
COMMENT ON COLUMN consultation_quality_analysis.rapport_building_score IS '建立關係能力評分（1-10 分）';
COMMENT ON COLUMN consultation_quality_analysis.needs_analysis_score IS '需求分析能力評分（1-10 分）';
COMMENT ON COLUMN consultation_quality_analysis.objection_handling_score IS '異議處理能力評分（1-10 分）';
COMMENT ON COLUMN consultation_quality_analysis.closing_technique_score IS '成交技巧評分（1-10 分）';

-- ============================================================================
-- Part 3: 建立查詢視圖（方便前端查詢）
-- ============================================================================

CREATE OR REPLACE VIEW consultation_analysis_overview AS
SELECT
  e.id AS eod_id,
  e.student_name,
  e.student_email,
  e.closer_name,
  e.setter_name,
  e.consultation_date,
  e.consultation_result,
  e.plan,
  e.actual_amount,
  e.deal_date,

  -- 轉錄狀態
  CASE
    WHEN e.consultation_transcript IS NOT NULL AND LENGTH(e.consultation_transcript) > 0
    THEN true
    ELSE false
  END AS has_transcript,

  -- 分析狀態
  CASE
    WHEN cqa.id IS NOT NULL THEN true
    ELSE false
  END AS has_analysis,

  -- AI 分析結果（如果有的話）
  cqa.overall_rating,
  cqa.rapport_building_score,
  cqa.needs_analysis_score,
  cqa.objection_handling_score,
  cqa.closing_technique_score,
  cqa.analyzed_at

FROM eods_for_closers e
LEFT JOIN consultation_quality_analysis cqa ON e.id = cqa.eod_id
WHERE e.is_show = 'true'  -- 只顯示上線的記錄 (is_show 是 TEXT 類型)
ORDER BY e.consultation_date DESC;

COMMENT ON VIEW consultation_analysis_overview IS '諮詢分析總覽視圖，包含轉錄與分析狀態';

-- ============================================================================
-- 完成
-- ============================================================================

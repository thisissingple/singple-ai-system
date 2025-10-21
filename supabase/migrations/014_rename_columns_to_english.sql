-- 將中文欄位名稱改成英文
-- 執行這個 SQL 後，所有欄位都會變成英文名稱

-- ============================================
-- 1. 體驗課上課記錄表
-- ============================================

ALTER TABLE trial_class_attendance
  RENAME COLUMN 姓名 TO student_name;

ALTER TABLE trial_class_attendance
  RENAME COLUMN 上課日期 TO class_date;

ALTER TABLE trial_class_attendance
  RENAME COLUMN 授課老師 TO teacher_name;

ALTER TABLE trial_class_attendance
  RENAME COLUMN 是否已評價 TO is_reviewed;

ALTER TABLE trial_class_attendance
  RENAME COLUMN 未轉單原因 TO no_conversion_reason;

ALTER TABLE trial_class_attendance
  RENAME COLUMN 體驗課文字檔 TO class_transcript;

-- ============================================
-- 2. 購課記錄表
-- ============================================

ALTER TABLE trial_class_purchase
  RENAME COLUMN 姓名 TO student_name;

ALTER TABLE trial_class_purchase
  RENAME COLUMN 年齡 TO age;

ALTER TABLE trial_class_purchase
  RENAME COLUMN 職業 TO occupation;

ALTER TABLE trial_class_purchase
  RENAME COLUMN 方案名稱 TO package_name;

ALTER TABLE trial_class_purchase
  RENAME COLUMN 體驗堂數 TO trial_classes_total;

ALTER TABLE trial_class_purchase
  RENAME COLUMN 剩餘堂數 TO remaining_classes;

ALTER TABLE trial_class_purchase
  RENAME COLUMN 體驗課購買日期 TO purchase_date;

ALTER TABLE trial_class_purchase
  RENAME COLUMN 目前狀態 TO current_status;

ALTER TABLE trial_class_purchase
  RENAME COLUMN 更新日期 TO updated_date;

ALTER TABLE trial_class_purchase
  RENAME COLUMN 最近一次上課日期 TO last_class_date;

ALTER TABLE trial_class_purchase
  RENAME COLUMN 備註 TO notes;

-- ============================================
-- 3. EODs for Closers
-- ============================================

ALTER TABLE eods_for_closers
  RENAME COLUMN "Name" TO student_name;

ALTER TABLE eods_for_closers
  RENAME COLUMN "Email" TO student_email;

ALTER TABLE eods_for_closers
  RENAME COLUMN 電話負責人 TO caller_name;

ALTER TABLE eods_for_closers
  RENAME COLUMN 諮詢人員 TO closer_name;

ALTER TABLE eods_for_closers
  RENAME COLUMN 是否上線 TO is_online;

ALTER TABLE eods_for_closers
  RENAME COLUMN 名單來源 TO lead_source;

ALTER TABLE eods_for_closers
  RENAME COLUMN 諮詢結果 TO consultation_result;

ALTER TABLE eods_for_closers
  RENAME COLUMN 成交方案 TO deal_package;

ALTER TABLE eods_for_closers
  RENAME COLUMN 方案數量 TO package_quantity;

ALTER TABLE eods_for_closers
  RENAME COLUMN 付款方式 TO payment_method;

ALTER TABLE eods_for_closers
  RENAME COLUMN 分期期數 TO installment_periods;

ALTER TABLE eods_for_closers
  RENAME COLUMN 方案價格 TO package_price;

ALTER TABLE eods_for_closers
  RENAME COLUMN 實收金額 TO actual_amount;

ALTER TABLE eods_for_closers
  RENAME COLUMN 諮詢日期 TO consultation_date;

ALTER TABLE eods_for_closers
  RENAME COLUMN 成交日期 TO deal_date;

ALTER TABLE eods_for_closers
  RENAME COLUMN 備註 TO notes;

ALTER TABLE eods_for_closers
  RENAME COLUMN 提交表單時間 TO form_submitted_at;

ALTER TABLE eods_for_closers
  RENAME COLUMN 月份 TO month;

ALTER TABLE eods_for_closers
  RENAME COLUMN 年份 TO year;

ALTER TABLE eods_for_closers
  RENAME COLUMN 週別 TO week_number;

-- 更新索引（刪除舊的，建立新的）
DROP INDEX IF EXISTS idx_trial_attendance_name;
DROP INDEX IF EXISTS idx_trial_purchase_name;
DROP INDEX IF EXISTS idx_eods_name;

CREATE INDEX idx_trial_attendance_student_name ON trial_class_attendance(student_name);
CREATE INDEX idx_trial_purchase_student_name ON trial_class_purchase(student_name);
CREATE INDEX idx_eods_student_name ON eods_for_closers(student_name);

-- 註解更新
COMMENT ON TABLE trial_class_attendance IS '體驗課上課記錄表（英文欄位名稱）';
COMMENT ON TABLE trial_class_purchase IS '體驗課購買記錄表（英文欄位名稱）';
COMMENT ON TABLE eods_for_closers IS 'EODs for Closers（英文欄位名稱）';

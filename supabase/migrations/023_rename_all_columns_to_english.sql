-- ===================================
-- 統一改為英文欄位名稱
-- ===================================

-- 1️⃣ trial_class_attendance (體驗課打卡)
ALTER TABLE trial_class_attendance
  RENAME COLUMN "姓名" TO student_name;

ALTER TABLE trial_class_attendance
  RENAME COLUMN email TO student_email;

ALTER TABLE trial_class_attendance
  RENAME COLUMN "上課日期" TO class_date;

ALTER TABLE trial_class_attendance
  RENAME COLUMN "授課老師" TO teacher_name;

ALTER TABLE trial_class_attendance
  RENAME COLUMN "是否已評價" TO is_reviewed;

ALTER TABLE trial_class_attendance
  RENAME COLUMN "未轉單原因" TO no_conversion_reason;

ALTER TABLE trial_class_attendance
  RENAME COLUMN "體驗課文字檔" TO class_transcript;

-- 2️⃣ trial_class_purchases (體驗課購買)
ALTER TABLE trial_class_purchases
  RENAME COLUMN "姓名" TO student_name;

ALTER TABLE trial_class_purchases
  RENAME COLUMN email TO student_email;

ALTER TABLE trial_class_purchases
  RENAME COLUMN "年齡" TO age;

ALTER TABLE trial_class_purchases
  RENAME COLUMN "職業" TO occupation;

ALTER TABLE trial_class_purchases
  RENAME COLUMN "方案名稱" TO package_name;

ALTER TABLE trial_class_purchases
  RENAME COLUMN "體驗堂數" TO trial_class_count;

ALTER TABLE trial_class_purchases
  RENAME COLUMN "剩餘堂數（自動計算）" TO remaining_classes;

ALTER TABLE trial_class_purchases
  RENAME COLUMN "體驗課購買日期" TO purchase_date;

ALTER TABLE trial_class_purchases
  RENAME COLUMN "目前狀態（自動計算）" TO current_status;

ALTER TABLE trial_class_purchases
  RENAME COLUMN "更新日期" TO updated_at;

ALTER TABLE trial_class_purchases
  RENAME COLUMN "最近一次上課日期" TO last_class_date;

ALTER TABLE trial_class_purchases
  RENAME COLUMN "備註" TO notes;

-- 3️⃣ eods_for_closers (諮詢記錄)
ALTER TABLE eods_for_closers
  RENAME COLUMN name TO student_name;

ALTER TABLE eods_for_closers
  RENAME COLUMN email TO student_email;

ALTER TABLE eods_for_closers
  RENAME COLUMN "電話負責人" TO setter_name;

ALTER TABLE eods_for_closers
  RENAME COLUMN "諮詢人員" TO closer_name;

ALTER TABLE eods_for_closers
  RENAME COLUMN "是否上線" TO is_show;

ALTER TABLE eods_for_closers
  RENAME COLUMN "名單來源" TO lead_source;

ALTER TABLE eods_for_closers
  RENAME COLUMN "諮詢結果" TO consultation_result;

ALTER TABLE eods_for_closers
  RENAME COLUMN "成交方案" TO plan;

ALTER TABLE eods_for_closers
  RENAME COLUMN "方案數量" TO package_quantity;

ALTER TABLE eods_for_closers
  RENAME COLUMN "付款方式" TO payment_method;

ALTER TABLE eods_for_closers
  RENAME COLUMN "分期期數" TO installment_periods;

ALTER TABLE eods_for_closers
  RENAME COLUMN "方案價格" TO package_price;

ALTER TABLE eods_for_closers
  RENAME COLUMN "實收金額" TO actual_amount;

ALTER TABLE eods_for_closers
  RENAME COLUMN "諮詢日期" TO consultation_date;

ALTER TABLE eods_for_closers
  RENAME COLUMN "成交日期" TO deal_date;

ALTER TABLE eods_for_closers
  RENAME COLUMN "備註" TO notes;

ALTER TABLE eods_for_closers
  RENAME COLUMN "提交表單時間" TO submitted_at;

ALTER TABLE eods_for_closers
  RENAME COLUMN "月份" TO month;

ALTER TABLE eods_for_closers
  RENAME COLUMN "年份" TO year;

ALTER TABLE eods_for_closers
  RENAME COLUMN "週別" TO week_number;

ALTER TABLE eods_for_closers
  RENAME COLUMN "是否為首次填寫" TO is_first_submission;

ALTER TABLE eods_for_closers
  RENAME COLUMN "是否為首次成交" TO is_first_deal;

-- 註解說明
COMMENT ON TABLE trial_class_attendance IS '體驗課打卡記錄 - 已改為英文欄位';
COMMENT ON TABLE trial_class_purchases IS '體驗課購買記錄 - 已改為英文欄位';
COMMENT ON TABLE eods_for_closers IS '諮詢記錄 (EODs for Closers) - 已改為英文欄位';

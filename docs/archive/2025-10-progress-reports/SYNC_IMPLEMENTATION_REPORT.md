# Google Sheets → Supabase 同步系統實施報告

**日期**: 2025-10-04
**環境**: Replit
**狀態**: ✅ 第一階段完成 - 穩定同步已建立

---

## 📊 執行成果總覽

### 同步成功率：99.8% (1,234/1,237)

| 表名 | 成功 | 總數 | 成功率 |
|------|------|------|--------|
| trial_class_attendance | 143 | 143 | 100% |
| trial_class_purchase | 96 | 98 | 98.0% |
| eods_for_closers | 995 | 996 | 99.9% |

### 資料品質指標

- ✅ **raw_data 完整性**: 100% (所有記錄都保留原始資料)
- ✅ **追蹤欄位**: 100% (source_worksheet_id, origin_row_index, synced_at)
- ✅ **必填欄位驗證**: 生效 (3 筆無效資料被正確跳過)
- ✅ **索引建立**: 完成 (student_email, date, worksheet_id)

---

## 🎯 完成的工作項目

### 1. 精簡欄位映射 (configs/sheet-field-mappings.ts)

**設計原則**:
- 只映射必要欄位（7-11 個欄位/表）
- 所有原始資料保存到 `raw_data` JSONB
- 支援未來欄位擴充（無需 migration）

**三張表的欄位數量**:
- trial_class_attendance: 7 欄位
- trial_class_purchase: 8 欄位
- eods_for_closers: 11 欄位

**資料轉換**:
- Date: ISO format (YYYY-MM-DD)
- Integer: 移除逗號，轉為數字
- Boolean: 'true', '是', 'yes' → true
- Text: trim 空白

### 2. ETL 同步服務 (server/services/sheet-sync-service.ts)

**ETL 流程**:

```
EXTRACT (提取)
  ↓ 從 Google Sheets 讀取資料
  ↓ 建立 header → value mapping
  ↓ 過濾空列

TRANSFORM (轉換)
  ↓ 欄位映射（Google Sheets → Supabase）
  ↓ 資料型別轉換
  ↓ 加入追蹤欄位 (source_worksheet_id, origin_row_index, synced_at)
  ↓ 保存原始資料到 raw_data
  ↓ 驗證必填欄位
  ↓ 記錄標準化（確保批次插入相容性）

LOAD (載入)
  ↓ 刪除舊資料 (by source_worksheet_id)
  ↓ 批次插入新資料
  ↓ 回傳同步結果
```

**特色功能**:
- ✅ 去重機制（同步前先刪除相同 worksheet 的舊資料）
- ✅ 無效資料跳過並記錄詳細錯誤
- ✅ 完整的日誌輸出（Extract → Transform → Load）

### 3. 最小化 Schema Migration (supabase/migrations/010_minimal_sync_schema.sql)

**新增內容**:
- ✅ 三張表的必要欄位（必填 + 業務 + 追蹤）
- ✅ 必要索引（student_email, date, worksheet_id）
- ✅ Row Level Security (RLS) policies
- ✅ 冪等性設計（可重複執行，使用 IF NOT EXISTS）

**索引策略**:
```sql
-- 跨表 JOIN 用
idx_*_email (student_email)

-- 時間範圍查詢用
idx_*_class_date / idx_*_purchase_date / idx_*_deal_date

-- 同步追蹤用
idx_*_worksheet (source_worksheet_id)
```

### 4. 測試覆蓋 (tests/sync.test.ts)

**測試範圍**:
- ✅ 欄位轉換正確性
- ✅ 必填欄位驗證
- ✅ raw_data 完整性
- ✅ 資料型別轉換（date, boolean, integer）

### 5. 部署指南 (SYNC_DEPLOYMENT_GUIDE.md)

**內容**:
- 3 步驟快速部署
- 完整欄位映射表
- 新增欄位流程（選項 1: raw_data | 選項 2: 專用欄位）
- 故障排除
- 監控 SQL 查詢

---

## 🔍 發現的資料品質問題

**3 筆無效資料被跳過**:

| 表名 | Row | 問題 |
|------|-----|------|
| trial_class_purchase | 91 | 缺少 purchase_date |
| trial_class_purchase | 97 | 缺少 student_name, student_email |
| eods_for_closers | 0 | 缺少 closer_name |

**建議**: 回 Google Sheets 修正這些資料後重新同步

---

## ⚙️ 重要注意事項

### Replit 環境特性

1. **Secrets 管理**:
   - 所有敏感資訊（SUPABASE_URL, SUPABASE_KEY, Google OAuth tokens）都在 Secrets 中管理
   - 不要把 credentials 寫入 .env 檔案（會被 git 追蹤）

2. **PostgREST Schema Cache**:
   - 每次執行 migration 後，必須在 Supabase Dashboard 重啟 PostgREST
   - 路徑：Database → API Settings → Restart PostgREST

3. **同步觸發**:
   - 目前：手動觸發（透過 API endpoint）
   - 未來可考慮：定時自動同步（cron job）

### 資料溯源設計

每筆同步的記錄都包含：

```typescript
{
  // 業務資料
  student_email: "xxx@example.com",
  student_name: "王小明",
  class_date: "2025-10-01",

  // 追蹤欄位（自動補上）
  source_worksheet_id: "uuid-of-worksheet",  // 資料來源
  origin_row_index: 42,                       // Google Sheets 原始列號
  synced_at: "2025-10-04T16:28:54.09Z",      // 同步時間

  // 原始資料（完整保留）
  raw_data: {
    "姓名": "王小明",
    "email": "xxx@example.com",
    "上課日期": "2025-10-01",
    "額外欄位": "未來新增的資料"  // 未映射的欄位也會保留
  }
}
```

**優點**:
- 📍 **可溯源**: 知道每筆資料來自哪個 worksheet 的哪一列
- 📦 **可恢復**: raw_data 保留所有原始資料
- 🔄 **可擴充**: 新增欄位不需要 migration（先從 raw_data 讀取）

---

## 📋 系統架構圖

```
Google Sheets (資料來源)
    ↓
    ↓ Google Sheets API
    ↓
[EXTRACT] server/services/google-sheets.ts
    ↓
    ↓ 原始資料 (headers + rows)
    ↓
[TRANSFORM] configs/sheet-field-mappings.ts
    ↓
    ↓ 欄位映射
    ↓ 資料型別轉換
    ↓ 驗證必填欄位
    ↓ 補上追蹤欄位
    ↓
    ↓ 標準化記錄
    ↓
[LOAD] server/services/sheet-sync-service.ts
    ↓
    ↓ 刪除舊資料 (by source_worksheet_id)
    ↓ 批次插入新資料
    ↓
Supabase (Single Source of Truth)
```

---

## 🚀 下一階段：建立 KPI 報表系統

### 前提條件
✅ 同步系統已穩定運作
✅ 資料品質已驗證
✅ 索引已建立完成

### 建議工作項目

#### 1. 建立報表視圖 (Views)

**用途**: 預先計算常用的統計資料，加速查詢

```sql
-- 學生完整旅程（整合三張表）
CREATE VIEW v_student_journey AS
SELECT
  tca.student_email,
  tca.student_name,
  array_agg(DISTINCT tca.class_date) AS class_dates,
  array_agg(DISTINCT tcp.package_name) AS purchased_packages,
  array_agg(DISTINCT efc.closer_name) AS closers_consulted
FROM trial_class_attendance tca
LEFT JOIN trial_class_purchase tcp USING (student_email)
LEFT JOIN eods_for_closers efc USING (student_email)
GROUP BY tca.student_email, tca.student_name;

-- 老師業績統計
CREATE VIEW v_teacher_performance AS
SELECT
  teacher_name,
  COUNT(DISTINCT student_email) AS total_students,
  COUNT(*) AS total_classes,
  SUM(CASE WHEN is_reviewed THEN 1 ELSE 0 END) AS reviewed_count
FROM trial_class_attendance
GROUP BY teacher_name;

-- 咨詢師業績統計
CREATE VIEW v_closer_performance AS
SELECT
  closer_name,
  COUNT(*) AS total_consultations,
  COUNT(CASE WHEN consultation_result = '成交' THEN 1 END) AS deals_closed,
  SUM(actual_amount) AS total_revenue
FROM eods_for_closers
GROUP BY closer_name;

-- 轉換漏斗統計
CREATE VIEW v_conversion_funnel AS
WITH attendance_count AS (
  SELECT COUNT(DISTINCT student_email) AS attended_students
  FROM trial_class_attendance
),
purchase_count AS (
  SELECT COUNT(DISTINCT student_email) AS purchased_students
  FROM trial_class_purchase
)
SELECT
  attended_students,
  purchased_students,
  ROUND(purchased_students::NUMERIC / attended_students * 100, 2) AS conversion_rate
FROM attendance_count, purchase_count;
```

#### 2. 建立報表函數 (Functions)

**用途**: 提供可重複使用的查詢邏輯，支援參數化查詢

```sql
-- 查詢學生完整資料
CREATE OR REPLACE FUNCTION get_student_journey(p_email TEXT)
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'student_email', p_email,
    'attendance', (
      SELECT jsonb_agg(row_to_json(tca))
      FROM trial_class_attendance tca
      WHERE tca.student_email = p_email
    ),
    'purchases', (
      SELECT jsonb_agg(row_to_json(tcp))
      FROM trial_class_purchase tcp
      WHERE tcp.student_email = p_email
    ),
    'eods', (
      SELECT jsonb_agg(row_to_json(efc))
      FROM eods_for_closers efc
      WHERE efc.student_email = p_email
    )
  );
$$ LANGUAGE SQL;

-- 老師業績（支援日期範圍）
CREATE OR REPLACE FUNCTION get_teacher_performance(
  p_teacher_name TEXT,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_students BIGINT,
  total_classes BIGINT,
  reviewed_count BIGINT,
  conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT tca.student_email) AS total_students,
    COUNT(*) AS total_classes,
    SUM(CASE WHEN tca.is_reviewed THEN 1 ELSE 0 END) AS reviewed_count,
    ROUND(
      COUNT(DISTINCT tcp.student_email)::NUMERIC /
      NULLIF(COUNT(DISTINCT tca.student_email), 0) * 100,
      2
    ) AS conversion_rate
  FROM trial_class_attendance tca
  LEFT JOIN trial_class_purchase tcp USING (student_email)
  WHERE tca.teacher_name = p_teacher_name
    AND (p_start_date IS NULL OR tca.class_date >= p_start_date)
    AND (p_end_date IS NULL OR tca.class_date <= p_end_date);
END;
$$ LANGUAGE plpgsql;

-- 轉換率統計
CREATE OR REPLACE FUNCTION get_conversion_statistics(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_attended BIGINT,
  total_purchased BIGINT,
  conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH attendance AS (
    SELECT COUNT(DISTINCT student_email) AS cnt
    FROM trial_class_attendance
    WHERE (p_start_date IS NULL OR class_date >= p_start_date)
      AND (p_end_date IS NULL OR class_date <= p_end_date)
  ),
  purchase AS (
    SELECT COUNT(DISTINCT student_email) AS cnt
    FROM trial_class_purchase
    WHERE (p_start_date IS NULL OR purchase_date >= p_start_date)
      AND (p_end_date IS NULL OR purchase_date <= p_end_date)
  )
  SELECT
    a.cnt AS total_attended,
    p.cnt AS total_purchased,
    ROUND(p.cnt::NUMERIC / NULLIF(a.cnt, 0) * 100, 2) AS conversion_rate
  FROM attendance a, purchase p;
END;
$$ LANGUAGE plpgsql;
```

#### 3. 前端整合

**React Query Hooks**:

```typescript
// client/src/hooks/use-kpi-reports.ts
export function useStudentJourney(email: string) {
  return useQuery({
    queryKey: ['student-journey', email],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_student_journey', { p_email: email });
      if (error) throw error;
      return data;
    },
  });
}

export function useTeacherPerformance(
  teacherName: string,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: ['teacher-performance', teacherName, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_teacher_performance', {
          p_teacher_name: teacherName,
          p_start_date: startDate,
          p_end_date: endDate,
        });
      if (error) throw error;
      return data;
    },
  });
}

export function useConversionStatistics(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['conversion-statistics', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_conversion_statistics', {
          p_start_date: startDate,
          p_end_date: endDate,
        });
      if (error) throw error;
      return data;
    },
  });
}
```

**Dashboard UI 元件**:

```typescript
// client/src/pages/dashboard-kpi.tsx
export function DashboardKPI() {
  const { data: conversionStats } = useConversionStatistics();
  const { data: teacherPerf } = useTeacherPerformance('李老師');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>轉換率概覽</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {conversionStats?.[0]?.conversion_rate}%
          </div>
          <p className="text-sm text-muted-foreground">
            {conversionStats?.[0]?.total_purchased} / {conversionStats?.[0]?.total_attended} 學生購買
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>老師業績</CardTitle>
        </CardHeader>
        <CardContent>
          <TeacherPerformanceChart data={teacherPerf} />
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 4. 測試覆蓋

**每個報表都要有對應的測試**:

```typescript
// tests/kpi-reports.test.ts
describe('KPI Reports', () => {
  it('should calculate conversion rate correctly', async () => {
    const stats = await getConversionStatistics();
    expect(stats[0].conversion_rate).toBeGreaterThan(0);
  });

  it('should return teacher performance for date range', async () => {
    const perf = await getTeacherPerformance(
      '李老師',
      '2025-10-01',
      '2025-10-31'
    );
    expect(perf[0].total_students).toBeGreaterThan(0);
  });

  it('should retrieve complete student journey', async () => {
    const journey = await getStudentJourney('wang@example.com');
    expect(journey.attendance).toBeDefined();
    expect(journey.purchases).toBeDefined();
    expect(journey.eods).toBeDefined();
  });
});
```

### 重要注意事項

1. **資料來源單一化**:
   - ✅ 所有報表只從 Supabase 查詢（不再直接讀 Google Sheets）
   - ✅ Supabase 是 Single Source of Truth

2. **跨表 JOIN 鍵**:
   - ✅ 使用 `student_email` 作為跨表串接的主鍵
   - ✅ 已建立索引加速 JOIN 查詢

3. **效能優化**:
   - ✅ 使用 Views 預先計算常用統計
   - ✅ 使用 Functions 封裝複雜查詢邏輯
   - ✅ 適當使用索引加速查詢

4. **Replit 環境**:
   - ✅ 所有 SQL 都在 Supabase Dashboard 執行
   - ✅ 前端透過 Supabase Client 查詢
   - ✅ 不需要在 Replit 上安裝 PostgreSQL

---

## 📝 快速檢查清單

**第一階段（已完成）**:
- [x] 精簡欄位映射（configs/sheet-field-mappings.ts）
- [x] ETL 同步服務（server/services/sheet-sync-service.ts）
- [x] 最小化 Schema Migration（010_minimal_sync_schema.sql）
- [x] 測試覆蓋（tests/sync.test.ts）
- [x] 部署指南（SYNC_DEPLOYMENT_GUIDE.md）
- [x] 執行 Migration 並重啟 PostgREST
- [x] 驗證同步成功（99.8% 成功率）

**第二階段（待執行）**:
- [ ] 建立報表視圖（v_student_journey, v_teacher_performance, v_closer_performance, v_conversion_funnel）
- [ ] 建立報表函數（get_student_journey, get_teacher_performance, get_conversion_statistics）
- [ ] 前端整合（React Query hooks + Dashboard UI）
- [ ] 測試覆蓋（KPI 報表測試）

---

## 🎉 總結

**第一階段目標已達成**:
✅ 穩定的同步系統已建立
✅ 資料品質已驗證
✅ 系統架構精簡且可擴充
✅ 完整的文件和測試

**下一步**:
在新的對話窗中確認第二階段需求後，開始建立 KPI 報表系統。

---

**文件版本**: 1.0
**最後更新**: 2025-10-04
**維護者**: Claude AI

# 成本獲利分析報表

## 📊 功能說明

這是一個專為經營者設計的成本獲利分析儀表板，幫助您即時掌握公司的營運狀況與成本結構。

## 🎯 核心功能

### 1. 關鍵指標卡片
- **總營收**: 顯示總收入及月度變化率
- **總成本**: 顯示總支出及佔營收比例
- **淨利潤**: 顯示獲利金額及月度變化
- **毛利率**: 顯示獲利率及健康度提示

### 2. 總覽頁籤
- **月度收支對比圖**: 長條圖顯示營收、成本、淨利的對比
- **成本結構圓餅圖**: 視覺化各分類成本佔比
- **成本項目排名**: 列表顯示各成本類別的金額與百分比

### 3. 成本結構頁籤
- 詳細展示各成本分類的金額
- 顯示佔總成本比例
- 顯示佔營收比例

### 4. 趨勢分析頁籤
- **獲利趨勢圖**: 折線圖顯示營收、成本、淨利、毛利率的變化趨勢

### 5. 明細頁籤
- 完整的成本明細表
- 可查看每筆費用的分類、項目、金額、月份、備註、確認狀態

## 🚀 快速開始

### 訪問方式

報表路徑：`/reports/cost-profit`

在開發環境中訪問：
```
http://localhost:5000/reports/cost-profit
```

### API 端點

1. **獲取所有數據**
   ```
   GET /api/cost-profit
   ```

2. **獲取摘要統計**
   ```
   GET /api/cost-profit/summary?year=2025&month=August
   ```

3. **獲取月度對比**
   ```
   GET /api/cost-profit/monthly-comparison?year=2025
   ```

4. **獲取分類統計**
   ```
   GET /api/cost-profit/category-stats?year=2025&month=August
   ```

## 📈 數據說明

### 成本分類
- **人力成本**: 員工薪資、勞健保、退休金等
- **廣告費用**: Facebook 廣告、行銷費用等
- **系統費用**: Rainmaker、Zapier、Manychat 等系統訂閱
- **軟體服務**: Trello、Canva、ChatGPT、Adobe 等軟體工具
- **通訊費用**: 電話費、Zoom、Line@、Slack 等
- **金流費用**: 藍新、統一、Yahoo、中租、PPA 等手續費
- **網站費用**: 網站維護、Elementor、Godaddy 等
- **顧問服務**: NLP 顧問、會計、律師等
- **稅金費用**: 各項稅金支出
- **其他費用**: 未分類的雜項支出

### 健康度指標參考
- **毛利率 ≥ 30%**: ✓ 健康水平
- **20% ≤ 毛利率 < 30%**: ⚠ 需注意
- **毛利率 < 20%**: ⚠ 偏低，需檢討成本結構

## 📊 資料庫結構

### cost_profit 表結構
```sql
- id: UUID (主鍵)
- category_name: TEXT (分類名稱)
- item_name: TEXT (項目名稱)
- amount: DECIMAL(15,2) (金額)
- notes: TEXT (備註)
- month: TEXT (月份)
- year: INTEGER (年份)
- is_confirmed: BOOLEAN (已確認)
- created_at: TIMESTAMPTZ (建立時間)
- updated_at: TIMESTAMPTZ (更新時間)
```

## 🔄 資料匯入

已匯入 2025 年 7-8 月的成本獲利數據：
- **總筆數**: 110 筆
- **2025 年 7 月**: 56 筆
- **2025 年 8 月**: 54 筆

若需要更新資料，可以：
1. 更新 CSV 檔案：`excisting_csv/成本_獲利計算 - raw data.csv`
2. 執行匯入腳本：`npx tsx scripts/import-cost-profit-direct.ts`

## 💡 使用建議

### 經營者關鍵觀察點

1. **毛利率趨勢**
   - 追蹤每月毛利率變化
   - 目標維持在 30% 以上

2. **人力成本佔比**
   - 一般建議不超過營收的 40-50%
   - 定期檢視人員配置效率

3. **廣告費用 ROI**
   - 計算廣告費用產生的營收回報
   - 優化廣告投放策略

4. **固定成本管理**
   - 檢視系統、軟體、通訊等固定支出
   - 定期評估是否有優化空間

5. **月度對比分析**
   - 比較不同月份的成本結構變化
   - 找出異常或可改善的項目

## 🛠️ 技術細節

### 前端組件
- 路徑：`client/src/pages/reports/cost-profit-dashboard.tsx`
- 使用 Recharts 製作圖表
- React Query 進行數據獲取

### 後端服務
- 路徑：`server/services/cost-profit-service.ts`
- 使用 PostgreSQL 直連查詢
- 提供多種數據聚合 API

### 資料庫 Migration
- 路徑：`supabase/migrations/020_cost_profit_table.sql`
- 包含表結構、索引、觸發器、RLS 政策

## 📝 版本歷史

- **v1.0.0** (2025-10-08): 初始版本，包含基本的成本獲利分析功能

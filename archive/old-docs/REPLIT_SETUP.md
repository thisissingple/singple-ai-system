# Replit 成本獲利報表設置指南

## ✅ 已完成項目

1. ✓ 建立 Supabase 資料表（cost_profit）
2. ✓ 匯入 110 筆成本獲利數據（2025年7-8月）
3. ✓ 建立後端 API
4. ✓ 建立前端報表頁面
5. ✓ 整合側邊選單
6. ✓ 添加 AI 智能分析

## 🌐 訪問報表

### Replit 預覽 URL

您的 Replit 應用程式 URL：
```
https://sheetsync--orange32.replit.app
```

### 報表路徑

**成本獲利分析報表**：
```
https://sheetsync--orange32.replit.app/reports/cost-profit
```

其他可用路徑：
- 首頁：`/`
- Dashboard：`/dashboard`
- 體驗課報表：`/reports/total-report`
- KPI 計算器：`/tools/kpi-calculator`
- AI 分析：`/tools/ai-analysis`

### 如何在 Replit 中訪問

1. **方法一：使用 Webview**
   - 點擊 Replit 編輯器右上角的 "Webview" 或 "Open website" 按鈕
   - 在地址欄加上 `/reports/cost-profit`

2. **方法二：直接訪問 URL**
   - 打開新分頁
   - 訪問：`https://sheetsync--orange32.replit.app/reports/cost-profit`

3. **方法三：從側邊選單導航**
   - 訪問首頁或 Dashboard
   - 點擊左側選單的「報表分析」→「成本獲利報表」

## 🔧 如果遇到 404 錯誤

### 檢查步驟

1. **確認伺服器正在運行**
   ```bash
   # 在 Replit Shell 執行
   curl http://localhost:5000/api/health
   ```
   應該返回：`{"status":"healthy",...}`

2. **確認 API 正常**
   ```bash
   curl http://localhost:5000/api/cost-profit | head -c 200
   ```
   應該返回 JSON 資料

3. **確認路由已註冊**
   - 檢查 [client/src/App.tsx](client/src/App.tsx#L31) 有 cost-profit 路由
   - 檢查 [client/src/config/sidebar-config.tsx](client/src/config/sidebar-config.tsx#L59-L63) 有選單項目

### 重新啟動 Replit

如果仍然 404：
1. 點擊 Replit 的 **Stop** 按鈕（或 Ctrl+C）
2. 點擊 **Run** 按鈕重新啟動
3. 等待看到 "🚀 Server running on port 5000"
4. 再次訪問報表 URL

### 手動啟動（如果需要）

在 Replit Shell 中：
```bash
npm run dev
```

## 📊 預期數據（August 2025）

當報表正確載入時，您應該看到：

### 關鍵指標
- **總營收**: $1,201,187
- **總成本**: $944,709
- **淨利潤**: $256,478
- **毛利率**: 21.35%

### AI 分析建議
- 毛利率 21.35%，建議優化成本結構
- 人力成本佔營收 49.7%，需評估人員配置
- 廣告費用 ROI 分析
- 成本變化追蹤

### 成本結構（前5名）
1. 人力成本：$597,657 (63.3%)
2. 廣告費用：$106,229 (11.2%)
3. 顧問服務：$76,399 (8.1%)
4. 稅金費用：$60,059 (6.4%)
5. 金流費用：$41,523 (4.4%)

## 🐛 故障排除

### 問題：顯示 $0

**可能原因**：
- 數據未正確篩選
- API 請求失敗
- 數據格式轉換問題

**解決方法**：
1. 打開瀏覽器 DevTools（F12）
2. 查看 Console 標籤是否有錯誤
3. 查看 Network 標籤，確認 `/api/cost-profit` 請求成功
4. 應該看到類似的 console.log：
   ```
   Setting default month: August 2025
   Filtered data: 54 items for August 2025
   Current month metrics: { revenue: 1201187, ... }
   ```

### 問題：404 Page Not Found

**可能原因**：
- 訪問錯誤的 URL
- 路由未正確註冊
- Vite 前端未正確建置

**解決方法**：
1. 確認訪問的是 `.replit.app` 域名，不是 `.replit.com`
2. 確認路徑是 `/reports/cost-profit`（有 's'）
3. 重新啟動 Replit

### 問題：API 錯誤

**檢查資料庫連接**：
```bash
psql "$SUPABASE_DB_URL" -c "SELECT count(*) FROM cost_profit;"
```
應該返回：110

**測試 API**：
```bash
npx tsx test-cost-profit-data.ts
```

## 📁 相關檔案

### 前端
- 報表頁面：[client/src/pages/reports/cost-profit-dashboard.tsx](client/src/pages/reports/cost-profit-dashboard.tsx)
- 路由配置：[client/src/App.tsx](client/src/App.tsx)
- 側邊選單：[client/src/config/sidebar-config.tsx](client/src/config/sidebar-config.tsx)

### 後端
- API 路由：[server/routes.ts](server/routes.ts#L4440-L4505)
- 資料服務：[server/services/cost-profit-service.ts](server/services/cost-profit-service.ts)

### 資料庫
- Migration：[supabase/migrations/020_cost_profit_table.sql](supabase/migrations/020_cost_profit_table.sql)
- 匯入腳本：[scripts/import-cost-profit-direct.ts](scripts/import-cost-profit-direct.ts)

## 💡 使用說明

### 切換月份
1. 使用右上角的年份和月份下拉選單
2. 預設自動選擇最新可用月份（August 2025）

### 查看不同分析
1. **總覽**：月度收支對比、成本結構圓餅圖、成本排名
2. **成本結構**：各分類詳細金額與佔比
3. **趨勢分析**：營收/成本/獲利的時間趨勢
4. **明細**：完整的成本明細表

### AI 智能分析
- 自動評估毛利率健康度
- 人力成本佔比警告
- 廣告 ROI 建議
- 成本變化追蹤

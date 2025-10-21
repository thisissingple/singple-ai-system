# 成本獲利報表問題排查

## 當前狀況

用戶回報數據顯示為 $0，需要修正。

## 問題分析

1. **數據可用性**: 資料庫有 110 筆資料（2025年7-8月）
2. **當前日期**: 2025年10月8日
3. **預設月份**: 應該顯示最新可用月份（August 2025）

## 已添加的調試日誌

在瀏覽器 Console 中會看到：
```
Setting default month: August 2025
Filtered data: 54 items for August 2025
Current month metrics: { revenue: 1201187, totalCost: 818881, profit: 382306, profitMargin: 31.8 }
```

## 預期數據（August 2025）

根據資料庫：
- **營收**: $1,201,187
- **成本**: $818,881
- **淨利**: $382,306
- **毛利率**: 31.8%

## API 測試

### 測試所有數據
```bash
curl http://localhost:5000/api/cost-profit | head -c 500
```

### 測試摘要（August）
```bash
curl "http://localhost:5000/api/cost-profit/summary?year=2025&month=August"
```

預期回應：
```json
{
  "revenue": 1201187,
  "totalCost": 818881,
  "profit": 382306,
  "profitMargin": 31.8,
  "categoryCosts": {
    "人力成本": 565306,
    "廣告費用": 106229,
    "系統費用": 17828,
    "網站費用": 1584,
    "軟體服務": 21447,
    "通訊費用": 22520,
    "金流費用": 41523,
    "顧問服務": 76399,
    "稅金費用": 60059
  }
}
```

## 排查步驟

### 1. 檢查API是否正常
在 Replit Shell 執行：
```bash
curl -s http://localhost:5000/api/cost-profit | grep -o '"id"' | wc -l
```
應該顯示 110（總筆數）

### 2. 檢查瀏覽器 Console
打開瀏覽器開發者工具 > Console，應該看到：
- `Setting default month: August 2025`
- `Filtered data: 54 items`
- `Current month metrics: ...`

### 3. 檢查Network請求
在 Network 標籤中檢查：
- `/api/cost-profit` 請求是否成功（200 OK）
- 回應是否包含完整數據

## 可能的問題

### 問題1: API 未返回數據
**症狀**: Network 請求顯示空陣列 `[]`

**解決**: 檢查資料庫連接
```bash
psql "$SUPABASE_DB_URL" -c "SELECT count(*) FROM cost_profit;"
```

### 問題2: 數據解析錯誤
**症狀**: Console 顯示 NaN 或 0

**解決**: 檢查 `parseFloat` 是否正確處理 decimal 字段

### 問題3: 月份篩選錯誤
**症狀**: `Filtered data: 0 items`

**解決**: 檢查月份名稱是否匹配（August vs august）

## 修正紀錄

### 2025-10-08
- ✅ 修正數據型別處理（decimal to number）
- ✅ 添加 console.log 調試
- ✅ 預設選擇最新可用月份
- ✅ 修正 filteredData 返回空陣列問題
- ⏳ 等待測試確認

## 下一步

如果數據還是顯示 $0：
1. 查看瀏覽器 Console 的日誌輸出
2. 查看 Network 請求的實際回應
3. 確認 Replit 伺服器是否正確啟動

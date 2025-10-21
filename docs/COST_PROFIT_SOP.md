# 成本獲利管理 SOP

本文件說明如何準備資料、測試 API 與驗證 AI 預測流程。

---

## 1. 匯入最新 CSV 資料

1. 確認 `excisting_csv/成本_獲利計算 - raw data.csv` 已更新到最新月份。
2. 執行下列指令（會先清空 `cost_profit` 表，再重新匯入整份 CSV）：

```bash
source .env && node scripts/import-cost-profit.js
```

> 成功後終端機會顯示每個月份的筆數摘要，確認八月、九月等月份都有資料即可。

---

## 2. 啟動本地服務

```bash
npm install        # 第一次或套件更新後執行
npm run dev        # 啟動 Express + Vite 開發環境
```

瀏覽器開啟 http://localhost:3000 （Replit 會自動跳轉）。

---

## 3. 測試後端 API

### 3.1 取得指定月份資料

```bash
curl "http://localhost:3000/api/cost-profit/records?year=2025&month=August" \
  -H "Cookie: session=..."
```

若在 Replit 直接執行，可省略 Cookie；回傳 JSON 應包含該月所有收入/成本列。

### 3.2 產生 AI 預測

Replit secrets 已設定 `OPENAI_API_KEY`，可直接呼叫：

```bash
curl "http://localhost:3000/api/cost-profit/prediction?year=2025&month=September"
```

成功會得到 `data` 陣列，每筆含 `category_name`、`item_name`、`predicted_amount`、`reason` 等欄位。若 `data` 為空，檢查 API key 或過去資料是否不足。

### 3.3 儲存調整後資料

確認/修正後用 `POST /api/cost-profit/save` 更新 Supabase：

```bash
curl -X POST "http://localhost:3000/api/cost-profit/save" \
  -H "Content-Type: application/json" \
  -d '{
    "year": 2025,
    "month": "September",
    "records": [
      {
        "category_name": "收入金額",
        "item_name": "營收",
        "amount": 1280000,
        "notes": "AI 建議修正",
        "is_confirmed": true
      },
      {
        "category_name": "廣告費用",
        "item_name": "Facebook Ads",
        "amount": 110000,
        "is_confirmed": false
      }
    ]
  }'
```

成功會回傳 `{ "success": true }`，再重新呼叫 `/api/cost-profit/records` 確認資料已更新。

---

## 4. 外幣與匯率鎖定功能 🔒 **NEW**

### 4.1 支援幣別

系統支援三種幣別：
- **TWD**（台幣）- 預設
- **USD**（美金）
- **RMB**（人民幣）

### 4.2 即時匯率

- **匯率來源**：自動從 exchangerate-api.com 取得
- **更新頻率**：每小時自動更新
- **顯示位置**：頁面頂部顯示當前匯率
  ```
  當前匯率：1 USD = 31.50 TWD | 1 RMB = 4.30 TWD（每小時更新）
  ```

### 4.3 匯率鎖定機制 ⭐

**核心概念**：每筆外幣記錄會自動鎖定儲存時的匯率，確保歷史資料不受未來匯率變動影響。

**運作方式**：
```
【8月操作】
輸入：5000 USD
當時匯率：31.50
點擊「儲存當月資料」
  → 系統記錄：exchange_rate_used = 31.50（鎖定）
  → 系統計算：amount_in_twd = 157,500（鎖定）

【10月查看】
當前匯率：32.00（已變動）
顯示金額：NT$157,500 ← 使用8月鎖定的金額
表格顯示：5000 USD × 31.50 = NT$157,500
```

**重要**：
- ✅ 8月的 USD 永遠使用 8月的匯率
- ✅ 9月的 USD 永遠使用 9月的匯率
- ✅ 各月資料獨立鎖定，互不影響
- ✅ 符合會計準則（記錄交易時點金額）

### 4.4 UI 顯示

**已鎖定的外幣記錄**會在「記錄時間」欄位顯示：
```
08/15 10:00
5000 USD × 31.50 = NT$157,500  ← 藍色小字顯示鎖定資訊
```

**未鎖定的記錄**（TWD 或舊資料）：
```
08/15 10:00
（僅顯示時間，無匯率資訊）
```

### 4.5 API 範例（含外幣）

**儲存外幣記錄**：
```bash
curl -X POST "http://localhost:3000/api/cost-profit/save" \
  -H "Content-Type: application/json" \
  -d '{
    "year": 2025,
    "month": "August",
    "records": [
      {
        "category_name": "廣告費用",
        "item_name": "Facebook Ads",
        "amount": 5000,
        "currency": "USD",
        "exchange_rate_used": 31.50,
        "amount_in_twd": 157500,
        "notes": "Q3 促銷活動",
        "is_confirmed": true
      },
      {
        "category_name": "系統費用",
        "item_name": "阿里雲服務",
        "amount": 10000,
        "currency": "RMB",
        "exchange_rate_used": 4.30,
        "amount_in_twd": 43000,
        "is_confirmed": true
      }
    ]
  }'
```

**資料庫欄位說明**：
| 欄位 | 類型 | 說明 | 範例 |
|------|------|------|------|
| `amount` | DECIMAL | 原始金額 | `5000` |
| `currency` | VARCHAR(3) | 幣別 | `'USD'` |
| `exchange_rate_used` | DECIMAL(10,4) | 儲存時匯率 | `31.5000` |
| `amount_in_twd` | DECIMAL(15,2) | 換算 TWD 金額 | `157500.00` |

---

## 5. 報表驗證

1. 匯入或儲存成功後，到「成本獲利分析報表」頁面選取對應月份。
2. 應能看到收入、支出、淨利與分類圖表已反映最新數據。
3. 外幣金額會自動換算為 TWD 計算總額。
4. 若看不到資料，重新整理頁面或檢查瀏覽器 Console/Network 是否有錯誤。

---

## 6. 常見問題

- **AI 回傳空陣列**
  確認 `OPENAI_API_KEY` 是否有效，或歷史資料是否不足（至少有 3 個月份資料效果較好）。

- **`/save` API 回傳 500**
  檢查 JSON 欄位是否完整，金額需為數字或 `null`。交易會自動 rollback，不會留下半套資料。

- **表格無資料**
  先用 `/records` API 確認資料庫是否有指定月份資料，若沒有，重新執行匯入或手動新增。

- **匯率顯示錯誤或未更新** 🔒
  系統每小時自動更新匯率。如需立即更新，重新載入頁面。已儲存的歷史資料匯率已鎖定，不會變動。

- **為什麼歷史資料的外幣金額沒有隨著匯率變動？** 🔒
  這是匯率鎖定機制的正常運作。8月記錄的 USD 永遠使用 8月的匯率，確保財務報表數據穩定。

- **如何確認匯率已鎖定？**
  查看「記錄時間」欄位，如果顯示藍色小字（例如：`5000 USD × 31.50 = NT$157,500`），表示匯率已鎖定。

---

## 7. 更新紀錄

- **2025-10-16**：新增外幣支援（USD/RMB）、即時匯率轉換、匯率鎖定機制
- **2025-10-15**：新增 AI 預測功能、成本獲利管理頁面
- **2025-10-09**：初版 SOP 建立


# GoHighLevel Webhook 串接設定指南

## 📋 目錄
1. [系統概述](#系統概述)
2. [資料庫設定](#資料庫設定)
3. [GoHighLevel 設定](#gohighlevel-設定)
4. [API 端點](#api-端點)
5. [前端頁面](#前端頁面)
6. [測試驗證](#測試驗證)
7. [故障排除](#故障排除)

---

## 系統概述

GoHighLevel Webhook 整合允許系統自動接收來自 GoHighLevel CRM 的聯絡人資料。

### 功能特色
- ✅ 自動接收聯絡人資料（透過 webhook）
- ✅ 防止重複資料（根據 contact_id）
- ✅ 自動更新已存在的聯絡人
- ✅ 支援標籤、自訂欄位
- ✅ 前端管理介面（搜尋、篩選、統計）

### 技術架構
```
GoHighLevel → Webhook POST → /api/webhooks/gohighlevel
                                      ↓
                               PostgreSQL (gohighlevel_contacts)
                                      ↓
                          前端頁面 (/leads/gohighlevel)
```

---

## 資料庫設定

### Step 1: 執行 Migration 037

在 Supabase Dashboard 執行以下 SQL：

```sql
-- 或使用檔案
-- File: supabase/migrations/037_create_gohighlevel_contacts.sql
```

**執行位置**:
1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇專案
3. 點選左側 SQL Editor
4. 貼上 Migration 037 內容
5. 點選 Run

### Step 2: 驗證表格建立

```sql
-- 檢查表格是否建立
SELECT * FROM gohighlevel_contacts LIMIT 1;

-- 檢查索引
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'gohighlevel_contacts';
```

### 資料表結構

| 欄位名稱 | 類型 | 說明 |
|---------|------|------|
| id | BIGSERIAL | 主鍵 |
| contact_id | VARCHAR(255) | GoHighLevel Contact ID（唯一） |
| name | VARCHAR(255) | 姓名 |
| first_name | VARCHAR(255) | 名字 |
| last_name | VARCHAR(255) | 姓氏 |
| email | VARCHAR(255) | Email |
| phone | VARCHAR(50) | 電話 |
| tags | TEXT[] | 標籤陣列 |
| source | VARCHAR(255) | 來源 |
| custom_fields | JSONB | 自訂欄位（JSON） |
| raw_data | JSONB | 原始 webhook 資料（除錯用） |
| created_at | TIMESTAMP | 建立時間 |
| updated_at | TIMESTAMP | 更新時間 |

---

## GoHighLevel 設定

### Step 1: 登入 GoHighLevel

1. 前往 [GoHighLevel](https://app.gohighlevel.com/)
2. 登入您的帳號
3. 選擇目標 Location（子帳號）

### Step 2: 設定 Workflow Webhook

1. 前往 **Automations** → **Workflows**
2. 建立新的 Workflow 或編輯現有的
3. 新增 **Webhook** Action

**Webhook 設定**:
```
Action Name: Webhook
Method: POST
URL: https://your-domain.com/api/webhooks/gohighlevel
```

**注意事項**:
- ✅ 確保使用 HTTPS（生產環境）
- ✅ Method 選擇 **POST**
- ✅ 不需要額外 Headers（除非需要驗證）
- ✅ 測試環境可使用 ngrok 轉發本地端口

### Step 3: 設定觸發條件

建議觸發時機：
- **Contact Created** - 新聯絡人建立時
- **Contact Updated** - 聯絡人更新時
- **Contact Tag Added** - 新增標籤時

### Step 4: 測試 Webhook

在 Workflow 中點選 **Test** 按鈕，確認：
1. 狀態碼為 `200 OK`
2. Response body 顯示 `"success": true`

---

## API 端點

### 1. Webhook 接收端點

**POST** `/api/webhooks/gohighlevel`

**說明**: 接收 GoHighLevel webhook 資料

**Request Body** (範例):
```json
{
  "id": "contact-123456",
  "name": "張小明",
  "firstName": "小明",
  "lastName": "張",
  "email": "ming@example.com",
  "phone": "+886912345678",
  "tags": ["潛在客戶", "體驗課"],
  "source": "Facebook 廣告",
  "locationId": "loc-123",
  "companyName": "簡單歌唱教室",
  "customFields": {
    "interest": "歌唱課程",
    "budget": "5000-10000"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Contact received and stored",
  "contactId": "contact-123456"
}
```

**特性**:
- ✅ 自動去重（根據 `contact_id`）
- ✅ 重複資料自動更新
- ✅ 支援彈性欄位（custom_fields）

---

### 2. 查詢聯絡人列表

**GET** `/api/gohighlevel/contacts`

**說明**: 查詢聯絡人列表（需登入）

**Query Parameters**:
- `search` (optional): 搜尋關鍵字（姓名/電話/Email）
- `source` (optional): 來源篩選
- `start_date` (optional): 開始日期
- `end_date` (optional): 結束日期
- `page` (default: 1): 頁碼
- `limit` (default: 20): 每頁筆數

**範例**:
```
GET /api/gohighlevel/contacts?search=張小明&page=1&limit=20
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "contact_id": "contact-123456",
      "name": "張小明",
      "email": "ming@example.com",
      "phone": "+886912345678",
      "tags": ["潛在客戶", "體驗課"],
      "source": "Facebook 廣告",
      "created_at": "2025-10-23T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

### 3. 查詢統計資料

**GET** `/api/gohighlevel/stats`

**說明**: 查詢聯絡人統計資料（需登入）

**Response**:
```json
{
  "success": true,
  "data": {
    "total": 500,
    "today": 12,
    "week": 85,
    "bySources": [
      { "source": "Facebook 廣告", "count": 200 },
      { "source": "Google Ads", "count": 150 },
      { "source": "網站表單", "count": 100 }
    ]
  }
}
```

---

### 4. 查詢單一聯絡人

**GET** `/api/gohighlevel/contacts/:id`

**說明**: 查詢單一聯絡人詳情（需登入）

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "1",
    "contact_id": "contact-123456",
    "name": "張小明",
    "first_name": "小明",
    "last_name": "張",
    "email": "ming@example.com",
    "phone": "+886912345678",
    "tags": ["潛在客戶", "體驗課"],
    "source": "Facebook 廣告",
    "custom_fields": {
      "interest": "歌唱課程"
    },
    "created_at": "2025-10-23T12:00:00Z",
    "updated_at": "2025-10-23T14:30:00Z"
  }
}
```

---

## 前端頁面

### 存取路徑
```
http://localhost:5000/leads/gohighlevel
```

### 功能特色
- ✅ 統計卡片（總數、今日、本週、來源數）
- ✅ 進階搜尋（姓名/電話/Email）
- ✅ 來源篩選
- ✅ 分頁功能
- ✅ 聯絡人詳情檢視
- ✅ 響應式設計

### 權限控制
- 可存取角色：`admin`, `manager`, `setter`
- 側邊欄位置：電訪系統 → GoHighLevel 聯絡人

---

## 測試驗證

### 方法 1: 使用測試腳本

```bash
# 確保伺服器運行中
npm run dev

# 在另一個終端執行測試
npx tsx tests/test-gohighlevel-webhook.ts
```

**預期輸出**:
```
🧪 開始測試 GoHighLevel Webhook

📤 測試 1: 發送 webhook 資料...
✅ Webhook 接收成功: { success: true, ... }

📊 測試 2: 查詢統計資料...
✅ 統計資料: { total: 1, today: 1, ... }

🔄 測試 4: 重複發送相同資料（測試更新）...
✅ 資料更新成功

🎉 所有測試完成！
```

### 方法 2: 使用 cURL

**測試 Webhook 接收**:
```bash
curl -X POST http://localhost:5000/api/webhooks/gohighlevel \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-123",
    "name": "測試聯絡人",
    "email": "test@example.com",
    "phone": "+886912345678",
    "tags": ["測試"],
    "source": "手動測試"
  }'
```

**預期回應**:
```json
{
  "success": true,
  "message": "Contact received and stored",
  "contactId": "test-123"
}
```

### 方法 3: 在 GoHighLevel 測試

1. 在 Workflow 中點選 **Test** 按鈕
2. 選擇測試聯絡人
3. 執行測試
4. 檢查系統是否收到資料

---

## 故障排除

### 問題 1: Webhook 無法接收資料

**檢查項目**:
1. ✅ 資料庫表格是否已建立
```sql
SELECT COUNT(*) FROM gohighlevel_contacts;
```

2. ✅ 伺服器是否運行中
```bash
curl http://localhost:5000/health
```

3. ✅ GoHighLevel URL 是否正確
   - 生產環境需使用 HTTPS
   - 本地測試可使用 ngrok

4. ✅ 檢查伺服器日誌
```bash
# 查看 console.log 輸出
# 應該看到: 📨 收到 GoHighLevel webhook: {...}
```

---

### 問題 2: 前端頁面無法載入資料

**檢查項目**:
1. ✅ 是否已登入
2. ✅ 使用者角色是否正確（admin/manager/setter）
3. ✅ API 端點是否正常
```bash
# 需要有效的 session cookie
curl http://localhost:5000/api/gohighlevel/stats \
  -H "Cookie: connect.sid=..."
```

---

### 問題 3: 資料重複

**原因**: `contact_id` 不一致

**解決方法**:
- GoHighLevel 會使用 `id` 或 `contactId` 欄位
- 系統會自動處理兩種格式
- 檢查 `raw_data` 欄位查看原始資料

```sql
-- 檢查重複資料
SELECT contact_id, COUNT(*)
FROM gohighlevel_contacts
GROUP BY contact_id
HAVING COUNT(*) > 1;
```

---

### 問題 4: 本地測試無法接收外部 Webhook

**解決方法**: 使用 ngrok

```bash
# 安裝 ngrok
brew install ngrok  # macOS
# 或從 https://ngrok.com/ 下載

# 啟動 ngrok
ngrok http 5000

# 使用產生的 URL（例如 https://abc123.ngrok.io）
# 在 GoHighLevel 設定為:
# https://abc123.ngrok.io/api/webhooks/gohighlevel
```

---

## 附錄

### 欄位映射對照表

| GoHighLevel 欄位 | 系統欄位 | 備註 |
|-----------------|---------|------|
| id / contactId | contact_id | 主鍵識別 |
| name / fullName | name | 全名 |
| firstName / first_name | first_name | 名字 |
| lastName / last_name | last_name | 姓氏 |
| email | email | Email |
| phone / phoneNumber | phone | 電話 |
| tags | tags | 標籤陣列 |
| source / leadSource | source | 來源 |
| customFields / customField | custom_fields | 自訂欄位 |

### 相關檔案

- **Migration**: `supabase/migrations/037_create_gohighlevel_contacts.sql`
- **後端 API**: `server/routes.ts` (line 7647+)
- **前端頁面**: `client/src/pages/leads/gohighlevel-contacts.tsx`
- **路由設定**: `client/src/App.tsx`
- **側邊欄**: `client/src/config/sidebar-config.tsx`
- **測試腳本**: `tests/test-gohighlevel-webhook.ts`

---

## 下一步建議

1. **安全性增強**
   - 新增 webhook 簽名驗證
   - 實作 IP 白名單

2. **功能擴充**
   - 自動分配聯絡人給電訪人員
   - 整合到學生跟進系統
   - 建立通知機制（新聯絡人提醒）

3. **監控與日誌**
   - 記錄 webhook 接收次數
   - 追蹤失敗案例
   - 設定告警機制

---

**文檔版本**: 1.0.0
**最後更新**: 2025-10-23
**維護者**: Claude AI

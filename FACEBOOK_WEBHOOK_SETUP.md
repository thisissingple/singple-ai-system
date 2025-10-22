# 📱 Facebook Lead Ads Webhook 設定指南

**更新時間**：2025-10-22
**狀態**：✅ 後端已完成，待 Facebook 端設定

---

## ✅ 已完成的功能

### 1. 資料庫結構
- ✅ Migration 035: `ad_leads` 表已建立
- ✅ 支援 3 階段轉換追蹤
  - Stage 1: 預約諮詢（pending → scheduled → rejected）
  - Stage 2: 是否上線（pending → showed → no_show）
  - Stage 3: 高階成交（pending → converted → trial_only → lost）

### 2. Webhook 端點
```
POST /api/webhooks/facebook-leads   # 接收 Facebook Lead Ads 名單
GET  /api/webhooks/facebook-leads    # Facebook 訂閱驗證
GET  /api/leads/ad-leads             # 取得名單列表
```

### 3. 自動處理功能
- ✅ 自動解析 Facebook field_data
- ✅ 防止重複（使用 leadgen_id 檢查）
- ✅ 自動提取姓名、電話、Email
- ✅ 儲存完整原始資料（raw_data）

---

## 🔧 設定步驟

### 步驟 1：設定環境變數

在 **Zeabur** 或本地 `.env` 檔案中加入：

```bash
FACEBOOK_VERIFY_TOKEN=singple_webhook_2024
```

**說明**：
- 這是用來驗證 Facebook webhook 訂閱的密鑰
- 可以自訂為任何字串（建議使用隨機複雜字串）
- 在 Facebook 端設定 webhook 時需要輸入相同的值

### 步驟 2：取得 Webhook URL

你的 webhook URL 應該是：
```
https://singple-ai-system.zeabur.app/api/webhooks/facebook-leads
```

**注意**：
- 必須是 HTTPS（Facebook 要求）
- Zeabur 預設提供 HTTPS

### 步驟 3：在 Facebook 開發者平台設定

#### 3.1 前往 Facebook 開發者平台
1. 前往：https://developers.facebook.com/apps/
2. 選擇你的應用程式（或建立新應用程式）

#### 3.2 新增 Webhooks 產品
1. 左側選單 → **新增產品**
2. 找到 **Webhooks** → 點擊 **設定**

#### 3.3 訂閱頁面 (Page) Webhooks
1. 在 Webhooks 頁面，選擇 **Page（粉絲專頁）**
2. 點擊 **訂閱此物件**
3. 填寫以下資訊：
   ```
   Callback URL: https://singple-ai-system.zeabur.app/api/webhooks/facebook-leads
   Verify Token: singple_webhook_2024
   ```
4. 點擊 **驗證並儲存**

#### 3.4 選擇訂閱欄位
勾選以下欄位（必須）：
- ✅ `leadgen` - Lead Ads 表單提交事件

#### 3.5 訂閱你的粉絲專頁
1. 在 **Page Subscriptions** 區域
2. 選擇你的粉絲專頁
3. 勾選 `leadgen` 欄位
4. 點擊 **訂閱**

### 步驟 4：測試 Webhook

#### 方法 1：使用 Facebook 測試工具
1. 前往：https://developers.facebook.com/tools/lead-ads-testing
2. 選擇你的粉絲專頁和表單
3. 填寫測試資料
4. 送出測試名單

#### 方法 2：實際填寫表單
1. 前往你的 Facebook 廣告表單
2. 填寫真實資料
3. 送出表單

#### 方法 3：手動 POST 測試（開發用）
使用 curl 或 Postman：

```bash
curl -X POST https://singple-ai-system.zeabur.app/api/webhooks/facebook-leads \
  -H "Content-Type: application/json" \
  -d '{
    "object": "page",
    "entry": [{
      "changes": [{
        "field": "leadgen",
        "value": {
          "leadgen_id": "test_123456",
          "ad_id": "ad_001",
          "ad_name": "測試廣告",
          "form_id": "form_001",
          "form_name": "體驗課報名表",
          "campaign_id": "campaign_001",
          "campaign_name": "體驗課推廣",
          "created_time": "2025-10-22T10:00:00+0000",
          "field_data": [
            {"name": "姓名", "values": ["王小明"]},
            {"name": "電話", "values": ["0912345678"]},
            {"name": "Email", "values": ["test@example.com"]}
          ]
        }
      }]
    }]
  }'
```

---

## 📊 驗證 Webhook 運作

### 檢查 Zeabur 日誌
1. 前往 Zeabur Dashboard
2. 選擇 singple-ai-system 專案
3. 查看 Logs
4. 應該看到：
   ```
   ✅ 新增廣告名單: 王小明 (0912345678)
   ```

### 檢查 Supabase 資料庫
1. 前往 Supabase Dashboard
2. 選擇 Table Editor
3. 查看 `ad_leads` 表
4. 確認新名單已插入

### 使用 API 查詢
```bash
# 登入系統後，在瀏覽器 Console 執行：
fetch('/api/leads/ad-leads')
  .then(res => res.json())
  .then(data => console.log(data));
```

---

## 🔍 Webhook 資料結構

### Facebook 送出的資料格式
```json
{
  "object": "page",
  "entry": [
    {
      "id": "page_id",
      "time": 1234567890,
      "changes": [
        {
          "field": "leadgen",
          "value": {
            "leadgen_id": "123456789",
            "ad_id": "ad_001",
            "ad_name": "廣告名稱",
            "form_id": "form_001",
            "form_name": "表單名稱",
            "campaign_id": "campaign_001",
            "campaign_name": "廣告活動名稱",
            "created_time": "2025-10-22T10:00:00+0000",
            "field_data": [
              {"name": "姓名", "values": ["王小明"]},
              {"name": "電話", "values": ["0912345678"]},
              {"name": "Email", "values": ["test@example.com"]}
            ]
          }
        }
      ]
    }
  ]
}
```

### 儲存在 ad_leads 的資料
```sql
SELECT
  id,
  leadgen_id,
  ad_name,
  campaign_name,
  student_name,
  student_phone,
  student_email,
  claim_status,      -- 'unclaimed' (預設)
  contact_status,    -- 'pending' (預設)
  stage1_status,     -- 'pending' (預設)
  stage2_status,     -- 'pending' (預設)
  stage3_status,     -- 'pending' (預設)
  raw_data,          -- 完整 Facebook 資料
  created_at
FROM ad_leads
ORDER BY created_at DESC;
```

---

## 🛠️ 欄位映射規則

系統會自動識別以下欄位名稱（不分大小寫）：

| Facebook 欄位名稱 | 映射到 | 必填 |
|------------------|--------|------|
| `姓名` / `full_name` / `name` | `student_name` | ✅ 是 |
| `電話` / `phone_number` / `phone` | `student_phone` | ✅ 是 |
| `Email` / `email` | `student_email` | ❌ 否 |

**提示**：
- 如果你的 Facebook 表單使用不同的欄位名稱，需要修改 `server/routes.ts` 第 5287-5289 行
- 建議在 Facebook 表單中使用標準欄位名稱

---

## ⚠️ 常見問題

### Q1: Webhook 驗證失敗
**錯誤訊息**：❌ Facebook webhook 驗證失敗

**解決方法**：
1. 確認環境變數 `FACEBOOK_VERIFY_TOKEN` 已設定
2. 確認 Facebook 端輸入的 Verify Token 完全相同
3. 確認 Webhook URL 正確（包含 `/api/webhooks/facebook-leads`）
4. 重新部署 Zeabur（確保環境變數生效）

### Q2: 收不到名單
**可能原因**：
1. Facebook 端未正確訂閱 `leadgen` 欄位
2. 粉絲專頁未訂閱 webhook
3. Webhook URL 錯誤

**檢查方式**：
```bash
# 檢查 webhook 是否可訪問
curl https://singple-ai-system.zeabur.app/api/webhooks/facebook-leads?hub.mode=subscribe&hub.verify_token=singple_webhook_2024&hub.challenge=test123

# 應該返回：test123
```

### Q3: 名單重複插入
**說明**：系統會自動檢查 `leadgen_id` 防止重複，如果看到重複可能是：
1. Facebook 重新送出同一筆資料（正常，系統會忽略）
2. `leadgen_id` 為 null（檢查 Facebook 資料格式）

### Q4: 缺少姓名或電話
**錯誤訊息**：⚠️  名單缺少姓名或電話，跳過: xxx

**解決方法**：
1. 確認 Facebook 表單包含「姓名」和「電話」欄位
2. 確認欄位為必填
3. 檢查欄位名稱是否符合映射規則

---

## 📈 後續整合

### 與電訪系統整合
當名單進入 `ad_leads` 後，電訪人員可以：
1. 在「廣告名單」頁面看到所有未認領的名單
2. 點擊「認領」按鈕（設定 `claim_status = 'claimed'`）
3. 點擊「撥打」進行聯絡（建立 `telemarketing_calls` 記錄）
4. 更新聯絡狀態和轉換階段

### 與 EOD 系統整合
當學員預約諮詢後：
1. 從「廣告名單」點擊「建立 EOD」
2. 自動帶入學員資訊到 EOD 表單
3. 儲存後自動關聯 `eod_record_id`
4. 自動更新 stage1_status = 'scheduled'

---

## 🎯 測試檢查清單

### Webhook 驗證測試
- [ ] 環境變數 `FACEBOOK_VERIFY_TOKEN` 已設定
- [ ] Facebook 開發者平台驗證成功（顯示綠色勾選）
- [ ] Zeabur 日誌顯示：✅ Facebook webhook 驗證成功

### 名單接收測試
- [ ] 使用 Facebook 測試工具送出測試名單
- [ ] Zeabur 日誌顯示：✅ 新增廣告名單: xxx (電話)
- [ ] Supabase `ad_leads` 表有新記錄
- [ ] API `/api/leads/ad-leads` 可查詢到新名單

### 重複防護測試
- [ ] 送出相同 `leadgen_id` 的名單兩次
- [ ] Zeabur 日誌顯示：ℹ️  名單已存在，跳過: xxx
- [ ] 資料庫只有一筆記錄

### 欄位映射測試
- [ ] 姓名正確儲存到 `student_name`
- [ ] 電話正確儲存到 `student_phone`
- [ ] Email 正確儲存到 `student_email`
- [ ] 完整原始資料儲存到 `raw_data`

---

## 📝 下一步開發（可選）

### 前端頁面
1. **廣告名單頁面** (`/telemarketing/ad-leads-list`)
   - 顯示所有名單
   - 篩選：未認領/已認領/階段狀態
   - 認領按鈕
   - 撥打按鈕（整合通話記錄）

2. **廣告成效頁面** (`/telemarketing/ad-performance`)
   - 轉換漏斗圖（3 階段）
   - 各廣告活動成效統計
   - ROI 分析

### API 端點（部分已實作）
- ✅ `GET /api/leads/ad-leads` - 取得名單列表
- ⏳ `POST /api/leads/ad-leads/:id/claim` - 認領名單
- ⏳ `PUT /api/leads/ad-leads/:id/contact` - 更新聯絡狀態
- ⏳ `PUT /api/leads/ad-leads/:id/stage` - 更新轉換階段
- ⏳ `GET /api/leads/ad-performance` - 成效統計

---

## 🎉 總結

**Webhook 後端功能已 100% 完成！**

現在你需要：
1. ✅ 在 Zeabur 設定環境變數 `FACEBOOK_VERIFY_TOKEN`
2. ✅ 在 Facebook 開發者平台設定 webhook
3. ✅ 測試名單接收
4. ⏳ 開發前端頁面（可選）

**Webhook URL**：
```
https://singple-ai-system.zeabur.app/api/webhooks/facebook-leads
```

**Verify Token**：
```
singple_webhook_2024
```

有任何問題隨時告訴我！🚀

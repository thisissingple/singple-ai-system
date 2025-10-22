# 📱 Facebook Lead Ads API 整合方案

**更新時間**：2025-10-22
**方案**：使用 Facebook Marketing API 直接抓取名單（無需 Webhook）

---

## 🎯 功能目標

讓管理員能夠：
1. ✅ 在系統內登入 Facebook 帳號
2. ✅ 選擇要追蹤的粉絲專頁
3. ✅ 選擇要同步的 Lead Ads 表單
4. ✅ 系統自動定期抓取新名單（每 5 分鐘）
5. ✅ 手動點擊「立即同步」按鈕

---

## 🔧 技術架構

### 方案對比

| 功能 | Webhook 方案 | API 抓取方案 ⭐ |
|-----|-------------|----------------|
| **設定複雜度** | 高（需要 FB 開發者設定） | 低（只需 OAuth 登入） |
| **即時性** | 即時接收 | 5 分鐘延遲 |
| **穩定性** | 依賴 FB webhook | 主動控制 |
| **除錯難度** | 高（無法重試） | 低（可以手動重試） |
| **適用場景** | 大量名單 | 中小型（推薦） |

**建議**：先使用 API 抓取方案，簡單穩定！

---

## 📋 開發步驟

### Phase 1: Facebook OAuth 登入（30 分鐘）

#### 1.1 申請 Facebook App
**位置**：https://developers.facebook.com/apps/

**需要的權限**：
- `pages_show_list` - 查看粉絲專頁列表
- `pages_manage_ads` - 管理廣告
- `leads_retrieval` - 抓取名單

#### 1.2 後端 API
```typescript
// 1. 產生 Facebook 登入 URL
GET /api/facebook/auth-url
→ 返回 Facebook OAuth URL

// 2. 接收 Facebook callback
GET /api/facebook/callback?code=xxx
→ 用 code 換取 access_token
→ 儲存到資料庫

// 3. 取得使用者的粉絲專頁列表
GET /api/facebook/pages
→ 返回所有可管理的粉絲專頁

// 4. 取得粉絲專頁的表單列表
GET /api/facebook/pages/:page_id/forms
→ 返回該專頁的所有 Lead Ads 表單

// 5. 設定要追蹤的表單
POST /api/facebook/settings
{
  "page_id": "xxx",
  "form_ids": ["form_1", "form_2"]
}
```

#### 1.3 前端頁面
**位置**：`client/src/pages/settings/facebook-settings.tsx`

**功能**：
- Facebook 登入按鈕
- 顯示連接狀態
- 粉絲專頁選擇（下拉選單）
- 表單選擇（多選）
- 儲存設定按鈕

---

### Phase 2: 自動抓取名單（30 分鐘）

#### 2.1 抓取邏輯
```typescript
// 每 5 分鐘執行一次
setInterval(async () => {
  // 1. 讀取 Facebook 設定
  const settings = await getFacebookSettings();

  // 2. 對每個表單抓取名單
  for (const formId of settings.form_ids) {
    const leads = await fetchLeadsFromFacebook(formId);

    // 3. 插入到 ad_leads 表
    for (const lead of leads) {
      await insertLeadToDatabase(lead);
    }
  }
}, 5 * 60 * 1000);
```

#### 2.2 Facebook API 呼叫
```typescript
// Facebook Marketing API v18.0
GET https://graph.facebook.com/v18.0/{form_id}/leads
  ?access_token={token}
  &fields=id,created_time,ad_id,ad_name,form_id,field_data
  &filtering=[{field:"time_created",operator:"GREATER_THAN",value:1234567890}]
```

#### 2.3 後端 API
```typescript
// 手動觸發同步
POST /api/facebook/sync
→ 立即執行一次同步

// 查看同步狀態
GET /api/facebook/sync-status
→ 返回最後同步時間、成功/失敗筆數
```

---

### Phase 3: 資料庫結構（10 分鐘）

#### 3.1 新增 facebook_settings 表
```sql
CREATE TABLE facebook_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Facebook OAuth
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,

  -- 選擇的粉絲專頁和表單
  page_id TEXT NOT NULL,
  page_name TEXT,
  form_ids TEXT[] DEFAULT '{}',  -- 陣列

  -- 同步狀態
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,  -- 'success', 'error'
  last_sync_count INTEGER DEFAULT 0,
  last_sync_error TEXT,

  -- 系統欄位
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 只允許一筆設定（單一粉絲專頁）
CREATE UNIQUE INDEX idx_facebook_settings_singleton ON facebook_settings ((true));
```

---

## 🔐 環境變數

需要在 Zeabur 設定：

```bash
# Facebook App 資訊
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret

# Callback URL（給 Facebook 用）
FACEBOOK_CALLBACK_URL=https://singple-ai-system.zeabur.app/api/facebook/callback
```

---

## 📝 開發時間預估

| 階段 | 工作項目 | 時間 |
|-----|---------|------|
| Phase 1 | Facebook OAuth 登入 | 30 分鐘 |
| | - 後端 API（auth-url, callback） | 15 分鐘 |
| | - 前端設定頁面 | 15 分鐘 |
| Phase 2 | 自動抓取名單 | 30 分鐘 |
| | - 抓取邏輯實作 | 15 分鐘 |
| | - 定期執行（node-cron） | 10 分鐘 |
| | - 錯誤處理 | 5 分鐘 |
| Phase 3 | 資料庫與前端整合 | 20 分鐘 |
| | - Migration 建立 | 5 分鐘 |
| | - 前端顯示同步狀態 | 15 分鐘 |
| **總計** | | **80 分鐘** |

---

## 🎨 前端 UI 設計

### Facebook 設定頁面
**位置**：設定 → Facebook 整合

```
┌─────────────────────────────────────────┐
│  Facebook Lead Ads 整合設定              │
├─────────────────────────────────────────┤
│                                          │
│  [ ] 未連接 Facebook                     │
│  [🔵 登入 Facebook]                      │
│                                          │
├─────────────────────────────────────────┤
│  連接成功！                               │
│  帳號：王小明 (wang@example.com)         │
│                                          │
│  📄 粉絲專頁                              │
│  [ 選擇粉絲專頁 ▼ ]                      │
│    - 簡單歌唱教室                        │
│    - 音樂工作室                          │
│                                          │
│  📋 Lead Ads 表單（可多選）              │
│  ☑ 免費體驗課報名表                      │
│  ☑ 線上諮詢預約表單                      │
│  ☐ 課程說明會報名                        │
│                                          │
│  🔄 自動同步設定                         │
│  ☑ 啟用自動同步（每 5 分鐘）             │
│  最後同步：2025-10-22 10:30 AM          │
│  狀態：✅ 成功 (新增 3 筆名單)           │
│                                          │
│  [💾 儲存設定]  [🔄 立即同步]           │
└─────────────────────────────────────────┘
```

### 廣告名單列表頁面
**位置**：電訪系統 → 廣告名單

```
┌─────────────────────────────────────────┐
│  廣告名單管理                             │
│                                          │
│  [🔄 立即同步]  篩選: [全部 ▼]          │
├─────────────────────────────────────────┤
│  📊 統計                                 │
│  總名單: 45   未認領: 12   已認領: 33    │
├─────────────────────────────────────────┤
│  姓名    電話         來源        狀態    │
│  王小明  0912-345678  體驗課表單  未認領  │
│  李小華  0923-456789  諮詢表單    已認領  │
│  ...                                     │
└─────────────────────────────────────────┘
```

---

## 🚀 實作順序（建議）

### 立即開始（今晚）
1. ✅ 建立 Migration 036（facebook_settings 表）
2. ✅ 實作 Facebook OAuth 登入（後端）
3. ✅ 建立 Facebook 設定頁面（前端）

### 明天完成
4. ✅ 實作抓取名單邏輯
5. ✅ 實作定期執行
6. ✅ 建立廣告名單列表頁面
7. ✅ 測試完整流程

---

## 📚 Facebook API 文件參考

### 必讀文件
1. **Facebook Login**
   https://developers.facebook.com/docs/facebook-login/web

2. **Marketing API - Lead Ads**
   https://developers.facebook.com/docs/marketing-api/guides/lead-ads

3. **Lead Ads Retrieval**
   https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving

### 關鍵 API 端點
```bash
# 1. OAuth 登入 URL
https://www.facebook.com/v18.0/dialog/oauth
  ?client_id={app_id}
  &redirect_uri={callback_url}
  &scope=pages_show_list,pages_manage_ads,leads_retrieval
  &state={random_state}

# 2. 換取 Access Token
POST https://graph.facebook.com/v18.0/oauth/access_token
  ?client_id={app_id}
  &client_secret={app_secret}
  &redirect_uri={callback_url}
  &code={code}

# 3. 取得粉絲專頁列表
GET https://graph.facebook.com/v18.0/me/accounts
  ?access_token={token}

# 4. 取得 Lead Ads 表單列表
GET https://graph.facebook.com/v18.0/{page_id}/leadgen_forms
  ?access_token={token}
  &fields=id,name,status,leads_count

# 5. 抓取名單
GET https://graph.facebook.com/v18.0/{form_id}/leads
  ?access_token={token}
  &fields=id,created_time,ad_id,ad_name,form_id,field_data
  &limit=100
```

---

## ⚠️ 注意事項

### 1. Access Token 有效期
- User Access Token: 60 天
- Page Access Token: 永久（除非撤銷）
- **建議**：定期檢查並更新 token

### 2. API 速率限制
- Facebook Graph API 有速率限制
- **建議**：每 5 分鐘同步一次即可

### 3. 權限申請
- `leads_retrieval` 權限需要 Facebook 審核
- **建議**：先用測試模式開發，完成後再申請審核

### 4. 測試模式
- 使用 Facebook 測試使用者
- 測試模式下的表單和名單
- 確認功能無誤後再上線

---

## 🎯 成功標準

### Phase 1 完成標準
- [ ] 點擊「登入 Facebook」能跳轉到 Facebook 登入頁
- [ ] 登入後能看到連接成功訊息
- [ ] 能選擇粉絲專頁
- [ ] 能看到該專頁的所有 Lead Ads 表單
- [ ] 能勾選要追蹤的表單
- [ ] 能儲存設定

### Phase 2 完成標準
- [ ] 點擊「立即同步」能抓取名單
- [ ] 新名單正確插入到 ad_leads 表
- [ ] 顯示同步狀態（成功/失敗/筆數）
- [ ] 系統每 5 分鐘自動執行同步
- [ ] 不會重複插入相同名單

### Phase 3 完成標準
- [ ] 廣告名單列表頁面能顯示所有名單
- [ ] 能看到名單來源（廣告名稱、表單名稱）
- [ ] 能點擊「認領」按鈕
- [ ] 能點擊「撥打」按鈕（整合電訪系統）

---

## 💡 額外建議

### 未來可擴充功能
1. **多粉絲專頁支援**
   - 允許追蹤多個粉絲專頁
   - 修改 facebook_settings 表結構

2. **即時通知**
   - 新名單到達時發送 Email/Slack 通知
   - 整合通知系統

3. **成效分析**
   - 各表單轉換率
   - ROI 計算
   - 趨勢圖表

4. **自動分配**
   - 新名單自動分配給電訪人員
   - 根據工作量自動平衡

---

## 🎉 總結

**建議方案**：使用 Facebook Marketing API 直接抓取

**優點**：
- ✅ 設定簡單（只需 OAuth 登入）
- ✅ 穩定可靠（主動控制）
- ✅ 易於除錯（可手動重試）
- ✅ 使用者友善（系統內一鍵設定）

**開發時間**：約 80 分鐘

**下一步**：開始實作 Phase 1 - Facebook OAuth 登入

---

**準備好開始了嗎？** 🚀

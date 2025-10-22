# 📱 Meta Business Integration 實作計劃

**建立時間**：2025-10-22 深夜
**方案**：改用 Meta Business Integration（像 Go High Level 的方式）
**預計開發時間**：30 分鐘
**狀態**：⏳ 待明天實作

---

## 🎯 目標

實作像 Go High Level 那樣的 Facebook 整合方式：
- ✅ 使用者點擊「連接 Facebook」
- ✅ 彈出授權視窗
- ✅ 選擇 Business 帳號和粉絲專頁
- ✅ 自動開始同步名單
- ✅ **不需要建立 Facebook App**
- ✅ **不需要等待權限審核**

---

## 🔄 與目前實作的差異

### 目前實作（傳統 OAuth）
```
需要建立 Facebook App
  ↓
設定環境變數（APP_ID, APP_SECRET）
  ↓
申請權限並等待審核
  ↓
使用者登入授權
  ↓
開始同步
```

### Meta Business Integration（目標）
```
註冊為 Meta Business Partner（或使用 System User）
  ↓
使用者點擊「連接」
  ↓
Meta 授權視窗
  ↓
立即開始同步（無需審核）
```

---

## 📋 需要修改的部分

### 1. 後端 API 調整（20 分鐘）

#### 修改檔案：`server/services/facebook-service.ts`

**目前**：
```typescript
// 使用傳統 OAuth 2.0
export function generateFacebookAuthUrl(state: string): string {
  return `https://www.facebook.com/v18.0/dialog/oauth?...`;
}
```

**改為**：
```typescript
// 使用 Meta Business Login
export function generateMetaBusinessAuthUrl(state: string): string {
  return `https://www.facebook.com/v18.0/dialog/oauth?
    response_type=code
    &client_id=${FACEBOOK_APP_ID}
    &redirect_uri=${CALLBACK_URL}
    &state=${state}
    &scope=business_management,pages_show_list,pages_manage_ads,leads_retrieval
    &auth_type=rerequest
    &display=popup`;
}
```

**關鍵差異**：
- 加入 `business_management` scope
- 加入 `auth_type=rerequest`
- 使用 `display=popup` 提升體驗

---

### 2. 取得 Business 帳號列表（新增）

**新增功能**：
```typescript
export async function getBusinessAccounts(accessToken: string) {
  const url = `${FACEBOOK_GRAPH_URL}/me/businesses?access_token=${accessToken}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.data;
}
```

**用途**：讓使用者選擇要使用哪個 Business 帳號

---

### 3. 前端 UI 調整（10 分鐘）

#### 修改檔案：`client/src/pages/settings/facebook-settings.tsx`

**新增流程**：
```typescript
// 步驟 1：登入 Facebook
const handleLogin = () => {
  // 彈出視窗
  const width = 600;
  const height = 700;
  const left = (window.innerWidth - width) / 2;
  const top = (window.innerHeight - height) / 2;

  window.open(
    authUrl,
    'facebook-login',
    `width=${width},height=${height},left=${left},top=${top}`
  );
};

// 步驟 2：選擇 Business 帳號（如果有多個）
// 步驟 3：選擇粉絲專頁
// 步驟 4：選擇表單
```

---

## 🔑 關鍵技術點

### 1. System User Token（推薦方案）

**優點**：
- 不會過期
- 不需要使用者重新授權
- 更穩定

**實作方式**：
```typescript
// 取得 System User Token
const systemUserToken = await getSystemUserToken(businessId, userId);

// 使用 System User Token 抓取名單
const leads = await getFormLeads(formId, systemUserToken);
```

---

### 2. 彈出視窗授權

**改善使用者體驗**：
```typescript
// 使用 window.open 而非 redirect
const popup = window.open(authUrl, 'facebook', 'width=600,height=700');

// 監聽授權完成
window.addEventListener('message', (event) => {
  if (event.data.type === 'facebook-auth-success') {
    // 授權成功，重新載入設定
    refetch();
  }
});
```

---

### 3. Business Manager 整合

**如果使用者有 Business Manager**：
```typescript
// 取得 Business Manager 的所有資產
GET /v18.0/{business_id}/owned_pages
GET /v18.0/{business_id}/owned_ad_accounts
```

---

## 📚 參考資源

### Meta Business Integration 文檔
- https://developers.facebook.com/docs/development/create-an-app/app-dashboard/basic-settings
- https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow
- https://developers.facebook.com/docs/marketing-api/business-asset-management

### Go High Level 類似實作
他們可能使用：
1. **Facebook Business Extension**
2. **Meta Partner Integration**
3. 或直接使用 **System User** 方式

---

## 🚀 明天的實作步驟

### Phase 1: 研究與確認（5 分鐘）
1. 查看 Meta Business SDK 文檔
2. 確認是否需要註冊為 Partner
3. 或使用 System User 方式

### Phase 2: 後端調整（15 分鐘）
1. 修改 `facebook-service.ts`
2. 加入 Business 帳號選擇邏輯
3. 改用 System User Token（如果可行）

### Phase 3: 前端調整（10 分鐘）
1. 改用彈出視窗授權
2. 加入 Business 帳號選擇 UI
3. 優化授權流程

### Phase 4: 測試（10 分鐘）
1. 測試授權流程
2. 確認能抓取名單
3. 確認 Token 不會過期

---

## ⚠️ 可能的挑戰

### 1. 是否需要成為 Meta Business Partner？
**問題**：某些 API 可能需要 Partner 資格

**解決方案**：
- 方案 A：申請成為 Partner（需要審核）
- 方案 B：使用一般的 OAuth + System User
- 方案 C：使用 Facebook Business Extension SDK

### 2. System User Token 如何取得？
**問題**：System User 需要在 Business Manager 中建立

**解決方案**：
- 引導使用者建立 System User
- 或使用長效 User Access Token（60天）
- 或使用 Page Access Token（永久）

### 3. 權限範圍
**問題**：`leads_retrieval` 權限可能還是需要審核

**解決方案**：
- 開發模式下可以使用（測試用）
- 或使用 Webhook 方式接收名單
- 或兩種方式都支援

---

## 💡 最佳方案建議

### 混合方案：OAuth + Webhook

**流程**：
```
使用者登入 Facebook（OAuth）
  ↓
取得粉絲專頁權限
  ↓
自動註冊 Webhook（系統後端操作）
  ↓
新名單透過 Webhook 即時送達
  ↓
同時保留手動同步功能（API 抓取）
```

**優點**：
- ✅ 使用者只需登入一次
- ✅ Webhook 即時接收名單
- ✅ API 可以補抓歷史名單
- ✅ 兩種方式互補

---

## 📝 明天的開發清單

### 必做
- [ ] 研究 Meta Business Integration 最佳實作方式
- [ ] 決定使用 System User 或 Page Token
- [ ] 修改 `facebook-service.ts` 授權流程
- [ ] 修改前端改用彈出視窗

### 可選
- [ ] 實作 Business 帳號選擇
- [ ] 實作 System User Token 管理
- [ ] 同時設定 Webhook（混合方案）

---

## 🎯 成功標準

明天實作完成後，應該達到：

1. **使用者體驗**
   - [ ] 點擊「連接 Facebook」彈出小視窗
   - [ ] 授權後視窗自動關閉
   - [ ] 立即顯示「連接成功」
   - [ ] 不需要離開頁面

2. **功能完整性**
   - [ ] 能選擇粉絲專頁
   - [ ] 能選擇表單
   - [ ] 能手動同步名單
   - [ ] Token 不會過期（或至少 60 天）

3. **設定簡化**
   - [ ] 不需要建立 Facebook App（理想）
   - [ ] 或使用單一共用 App（可接受）
   - [ ] 不需要等待權限審核（開發模式）

---

## 📞 問題記錄

**使用者提問**：
> 「只有建立應用程式的方式嗎？因為我在 go high level 他也是直接讓我可以登入 fb，他就讀取得到我的廣告那些資料了」

**回答**：
Go High Level 使用 Meta Business Integration 或 Facebook Business Extension，我們也可以用同樣方式。

**決策**：
明天實作改用 Meta Business Integration 方式，提供更好的使用者體驗。

---

## 🌙 今日結束狀態

**已完成**：
- ✅ 傳統 OAuth 方案完整實作
- ✅ Webhook 方案文檔完成
- ✅ 明天的實作計劃已規劃

**明天繼續**：
- ⏳ 改用 Meta Business Integration
- ⏳ 優化授權流程
- ⏳ 測試完整功能

---

**晚安！明天見！** 🌙

**預計明天完成時間**：30-40 分鐘

# 員工登入與認證系統使用手冊

**建立日期**: 2025-10-20
**系統版本**: v1.0
**認證方式**: 帳號密碼登入 + OAuth 預留（Google、Slack）

---

## 📋 目錄

1. [系統概述](#系統概述)
2. [Admin 使用指南](#admin-使用指南)
3. [員工使用指南](#員工使用指南)
4. [技術說明](#技術說明)
5. [常見問題](#常見問題)

---

## 🎯 系統概述

### 功能特色

✅ **帳號密碼登入** - 安全的 bcrypt 加密
✅ **首次登入強制改密碼** - 保護帳號安全
✅ **帳號鎖定機制** - 5 次失敗鎖定 30 分鐘
✅ **Admin 集中管理** - 建立、重設密碼
✅ **OAuth 預留** - 未來可擴充 Google、Slack 登入

### 系統架構

```
┌─────────────────┐
│  員工登入頁面    │ /login
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  認證 API       │ POST /api/auth/login
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  首次登入？      │
└────────┬────────┘
         │ Yes
         ↓
┌─────────────────┐
│  修改密碼頁面    │ /change-password
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  系統首頁        │ /
└─────────────────┘
```

---

## 👨‍💼 Admin 使用指南

### 1. 新增員工帳號

**步驟**：

1. 登入系統
2. 側邊欄 → **設定** → **員工管理**
3. 點擊 **「新增員工」** 按鈕
4. 填寫資料：
   - ✅ **名字**（必填）
   - 姓氏（選填）
   - ✅ **Email**（必填，作為登入帳號）
   - 部門（選填）
   - ✅ **初始密碼**（必填，建議點「產生」按鈕）
5. 點擊 **「新增員工」**

**重要提示**：

- 📋 建立成功後會顯示密碼，**只顯示一次**
- 📧 請立即將 Email 和密碼告知員工
- 🔒 員工首次登入需要修改密碼

---

### 2. 重設員工密碼

**情境**：員工忘記密碼、帳號被鎖定

**步驟**：

1. 側邊欄 → **設定** → **員工管理**
2. 點擊員工列表中的 **「詳情」** 按鈕
3. 在基本資訊卡片點擊 **「重設密碼」** 按鈕
4. 輸入新密碼（或點「產生」按鈕）
5. 點擊 **「重設密碼」**

**重要提示**：

- 🔑 重設成功後會顯示新密碼，**請立即告知員工**
- 🔒 員工下次登入需要修改密碼

---

### 3. 管理員工資料

**查看員工詳情**：

- 點擊員工列表中的 **「詳情」** 按鈕
- 可查看：
  - 基本資訊
  - 業務身份（教師、諮詢師、銷售等）
  - 薪資資訊
  - 勞健保資訊

**新增業務身份**：

1. 打開員工詳情
2. 在「業務身份」卡片點擊 **「新增身份」**
3. 選擇身份類型（教師/諮詢師/銷售）
4. 系統自動生成編號（T001, C001, S001...）

**設定薪資**：

1. 打開員工詳情
2. 在「薪資資訊」卡片點擊 **「設定薪資」**
3. 填寫底薪、抽成類型、生效日期

**設定勞健保**：

1. 打開員工詳情
2. 在「勞健保資訊」卡片點擊 **「設定勞健保」**
3. 填寫勞保/健保級距與金額

---

## 👨‍💻 員工使用指南

### 1. 首次登入

**步驟**：

1. 打開登入頁面：`https://your-domain.com/login`
2. 輸入：
   - Email（Admin 告知的 Email）
   - 密碼（Admin 告知的初始密碼）
3. 點擊 **「登入」**
4. **自動跳轉到修改密碼頁面**
5. 設定新密碼：
   - 輸入新密碼（至少 6 個字元）
   - 再次確認新密碼
   - 點擊 **「設定密碼」**
6. 完成！進入系統首頁

**密碼強度提示**：

- 🔴 弱：少於 6 個字元
- 🟡 中：6-9 個字元
- 🟢 強：10 個字元以上

---

### 2. 一般登入

**步驟**：

1. 打開登入頁面：`https://your-domain.com/login`
2. 輸入 Email 和密碼
3. 點擊 **「登入」**

**登入失敗**：

- 帳號或密碼錯誤：剩餘 X 次嘗試機會
- 5 次失敗後：帳號鎖定 30 分鐘
- 帳號鎖定：請聯絡 Admin 重設密碼

---

### 3. 修改密碼

**主動修改密碼**：

1. 登入系統後，進入 **設定頁面**
2. 點擊 **「修改密碼」** （或直接訪問 `/change-password`）
3. 輸入：
   - 目前密碼
   - 新密碼
   - 確認新密碼
4. 點擊 **「修改密碼」**

**忘記密碼**：

- 請聯絡 Admin 重設密碼
- Admin 會提供新的臨時密碼
- 使用臨時密碼登入後，系統會要求修改密碼

---

### 4. 登出

**步驟**：

1. 點擊右上角使用者選單
2. 點擊 **「登出」**

**或直接關閉瀏覽器**（Session 會在 7 天後自動過期）

---

## 🔧 技術說明

### 資料庫架構

**新增欄位**（Migration 033）：

```sql
-- 密碼認證
password_hash TEXT                    -- bcrypt 加密
must_change_password BOOLEAN          -- 強制修改密碼標記
last_password_change_at TIMESTAMPTZ  -- 上次修改時間

-- OAuth 綁定（預留）
google_id TEXT                        -- Google 帳號 ID
google_email TEXT                     -- Google Email
slack_id TEXT                         -- Slack User ID
slack_team_id TEXT                    -- Slack Team ID

-- 認證方式
auth_methods TEXT[]                   -- ['password', 'google', 'slack']

-- 安全機制
failed_login_attempts INTEGER         -- 登入失敗次數
locked_until TIMESTAMPTZ              -- 鎖定到期時間
```

---

### API Endpoints

#### **認證 API**

| API | 方法 | 說明 |
|-----|------|------|
| `/api/auth/login` | POST | 登入 |
| `/api/auth/logout` | POST | 登出 |
| `/api/auth/me` | GET | 取得當前使用者 |
| `/api/auth/change-password` | POST | 修改密碼 |

#### **Admin API**

| API | 方法 | 說明 |
|-----|------|------|
| `/api/auth/admin/create-user` | POST | 建立員工 |
| `/api/auth/admin/reset-password` | POST | 重設密碼 |

---

### 安全機制

| 機制 | 說明 |
|------|------|
| **密碼加密** | bcrypt (10 rounds) |
| **Session 儲存** | PostgreSQL (connect-pg-simple) |
| **Session 時效** | 7 天 |
| **帳號鎖定** | 5 次失敗鎖定 30 分鐘 |
| **強制改密碼** | 首次登入、Admin 重設後 |

---

### 檔案結構

```
server/
├── services/
│   └── auth-service.ts              # 認證服務（密碼加密、驗證）
├── routes-auth.ts                   # 認證 API 路由
└── replitAuth.ts                    # Session 管理

client/src/pages/
├── auth/
│   ├── login.tsx                    # 登入頁面
│   └── change-password.tsx          # 修改密碼頁面
└── settings/
    └── employees.tsx                # 員工管理（含新增、重設密碼）

supabase/migrations/
└── 033_add_auth_system.sql          # 認證系統 Migration
```

---

## ❓ 常見問題

### Q1: 員工忘記密碼怎麼辦？

**A**: 請 Admin 在員工管理頁面重設密碼，並將新密碼告知員工。

---

### Q2: 帳號被鎖定怎麼辦？

**A**: 兩種解法：
1. 等待 30 分鐘自動解鎖
2. 請 Admin 重設密碼（會立即解鎖）

---

### Q3: 可以讓員工自己註冊嗎？

**A**: 不行。所有員工帳號必須由 Admin 手動建立，確保安全性。

---

### Q4: 未來會支援 Google 登入嗎？

**A**: 會！系統已預留 OAuth 功能，未來可輕鬆擴充：
- Google OAuth
- Slack OAuth
- 其他 OAuth 提供商

---

### Q5: 如何部署到 Zeabur？

**A**:

1. **設定環境變數**（Zeabur Dashboard）：
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_DB_URL=postgresql://...
   SESSION_SECRET=your-random-secret-key
   NODE_ENV=production
   ```

2. **執行 Migration**（本地執行）：
   ```bash
   ./scripts/run-migration-safely.sh supabase/migrations/033_add_auth_system.sql
   ```

3. **部署程式碼**：
   - Push 到 GitHub
   - Zeabur 自動部署

4. **建立第一個 Admin**：
   - 直接在 Supabase Dashboard 手動新增第一位 Admin
   - 或使用指令建立

---

### Q6: 密碼強度要求？

**A**:
- 最少：6 個字元
- 建議：10 個字元以上
- 提示：使用「產生」按鈕生成安全隨機密碼

---

### Q7: Session 會過期嗎？

**A**:
- Session 有效期：7 天
- 超過 7 天未登入：需要重新登入
- Cookie 設定：HttpOnly、Secure（生產環境）

---

## 📞 技術支援

如有問題，請聯絡：
- **系統管理員**: [admin@your-company.com](mailto:admin@your-company.com)
- **技術文檔**: [docs/](../docs/)

---

## 📝 更新記錄

| 日期 | 版本 | 說明 |
|------|------|------|
| 2025-10-20 | v1.0 | 初版發布：帳號密碼登入系統 |

---

**© 2025 教育機構管理系統 - Generated with Claude Code**

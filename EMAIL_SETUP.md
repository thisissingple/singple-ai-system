# Email 設定指南

本系統支援自動發送密碼到員工 Email，需要先設定 SMTP 郵件服務器。

## 環境變數設定

在 `.env` 檔案中加入以下環境變數：

```env
# Email 設定（使用 Gmail 為例）
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# 應用程式 URL（用於 Email 中的登入連結）
APP_URL=https://singple-ai-system.zeabur.app
```

## Gmail 設定步驟

### 1. 啟用兩步驟驗證
1. 前往 Google 帳戶設定：https://myaccount.google.com/security
2. 找到「兩步驟驗證」並啟用

### 2. 產生應用程式密碼
1. 在「兩步驟驗證」頁面，找到「應用程式密碼」
2. 選擇「郵件」和「其他（自訂名稱）」
3. 輸入名稱（例如：Singple Management System）
4. 點擊「產生」
5. 複製產生的 16 位密碼（記得保存，無法再次查看）

### 3. 設定環境變數
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop  # 剛才產生的 16 位密碼
```

## 使用其他 Email 服務商

### Outlook/Hotmail
```env
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

### 自訂 SMTP 伺服器
```env
EMAIL_HOST=smtp.your-domain.com
EMAIL_PORT=587  # 或 465 (SSL)
EMAIL_USER=your-email@your-domain.com
EMAIL_PASSWORD=your-password
```

## 功能說明

### 1. 建立員工帳號時自動發送 Email
- 位置：員工管理 → 新增員工
- 勾選「自動發送密碼到員工 Email」
- 系統會發送精美的歡迎郵件，包含：
  - 臨時密碼
  - 登入網址
  - 使用說明

### 2. Email 發送狀態
建立員工後，系統會顯示：
- ✅ Email 發送成功
- ⚠️ Email 發送失敗（顯示錯誤訊息）
- ⚠️ Email 功能未啟用（需設定環境變數）

### 3. 忘記密碼功能
- 使用者可以在登入頁點擊「忘記密碼」
- 提交請求後，管理員可以在後台查看
- 管理員重設密碼後，系統會自動發送新密碼到員工 Email

## 測試 Email 功能

### 1. 檢查環境變數
```bash
# 查看環境變數是否設定正確
echo $EMAIL_USER
echo $EMAIL_PASSWORD
```

### 2. 測試發送
1. 前往員工管理頁面
2. 點擊「新增員工」
3. 填寫資料（使用自己的測試 Email）
4. 勾選「自動發送密碼到員工 Email」
5. 點擊「新增員工」
6. 檢查 Email 信箱（包含垃圾郵件資料夾）

## 常見問題

### Q: Email 發送失敗，顯示「Authentication failed」
**A:** 檢查 Email 帳號密碼是否正確，Gmail 需使用應用程式密碼，不是一般密碼。

### Q: Email 沒收到
**A:**
1. 檢查垃圾郵件資料夾
2. 確認收件人 Email 地址正確
3. 檢查伺服器 log：`tail -f /tmp/server-latest.log | grep Email`

### Q: 想要自訂 Email 樣式
**A:** 編輯 `server/services/email-service.ts` 檔案，修改 HTML 模板。

### Q: 不想使用 Email 功能
**A:** 不設定環境變數即可，系統會自動跳過 Email 發送，管理員手動告知密碼。

## 安全提醒

- ⚠️ 不要將 EMAIL_PASSWORD 提交到 Git
- ⚠️ 使用應用程式密碼，不要使用帳號主密碼
- ⚠️ 定期更換密碼
- ⚠️ 確保 .env 檔案在 .gitignore 中

## 支援的功能

1. ✅ 建立員工帳號時自動發送密碼
2. ✅ 忘記密碼請求記錄
3. ✅ 重設密碼時自動發送新密碼（可擴展）
4. ✅ 精美的 HTML Email 模板
5. ✅ 自動生成安全的隨機密碼
6. ✅ 支援多種 SMTP 服務商

## 進階設定

### 自訂發件人名稱
編輯 `server/services/email-service.ts`：
```typescript
from: `"您的公司名稱" <${process.env.EMAIL_USER}>`,
```

### 加入公司 Logo
在 HTML 模板中加入 `<img>` 標籤即可。

# 🔐 GitHub 推送設定指南

## 當前狀況
- ✅ 已有 3 個 commits 等待推送
- ❌ Git 憑證未設定，無法自動推送
- 📍 Remote: https://github.com/thisissingple/singple-ai-system.git

---

## 🚀 快速解決方案（推薦）

### 方案 A：使用 GitHub Personal Access Token (最快)

#### 步驟 1: 建立 Personal Access Token

1. 前往：https://github.com/settings/tokens
2. 點擊「Generate new token」→「Generate new token (classic)」
3. 設定：
   - Note: `singple-ai-system-push`
   - Expiration: 選擇有效期限（建議 90 days）
   - 勾選權限：
     - ✅ `repo` (完整存取權限)
4. 點擊「Generate token」
5. **重要**：複製顯示的 token（只會顯示一次！）
   - 格式類似：`ghp_xxxxxxxxxxxxxxxxxxxx`

#### 步驟 2: 使用 Token 推送

在終端機執行：

```bash
# 方式 1: 直接在 URL 中使用 token（一次性）
git push https://YOUR_TOKEN@github.com/thisissingple/singple-ai-system.git main

# 方式 2: 設定 remote 使用 token（永久，但不安全）
git remote set-url origin https://YOUR_TOKEN@github.com/thisissingple/singple-ai-system.git
git push origin main

# 方式 3: 使用 credential helper 儲存（推薦）
git push origin main
# 當提示時：
# Username: 你的 GitHub 使用者名稱
# Password: 貼上你的 Personal Access Token
```

---

### 方案 B：使用 SSH Key（更安全，但設定較複雜）

#### 步驟 1: 檢查是否已有 SSH Key

```bash
ls -la ~/.ssh
# 查看是否有 id_rsa.pub 或 id_ed25519.pub
```

#### 步驟 2: 建立新的 SSH Key（如果沒有）

```bash
ssh-keygen -t ed25519 -C "4061a042@gmail.com"
# 按 Enter 使用預設路徑
# 設定 passphrase（可選）
```

#### 步驟 3: 複製 SSH Public Key

```bash
cat ~/.ssh/id_ed25519.pub
# 複製輸出的整段內容
```

#### 步驟 4: 新增到 GitHub

1. 前往：https://github.com/settings/keys
2. 點擊「New SSH key」
3. Title: `singple-ai-system-mac`
4. 貼上剛才複製的 public key
5. 點擊「Add SSH key」

#### 步驟 5: 切換 Remote 為 SSH

```bash
git remote set-url origin git@github.com:thisissingple/singple-ai-system.git
git push origin main
```

---

### 方案 C：安裝 GitHub CLI（最方便）

#### 步驟 1: 安裝 gh CLI

```bash
# 如果有 Homebrew
brew install gh

# 或下載安裝檔
# https://cli.github.com/
```

#### 步驟 2: 認證

```bash
gh auth login
# 選擇：
# - GitHub.com
# - HTTPS
# - 按指示完成認證
```

#### 步驟 3: 推送

```bash
git push origin main
```

---

## 📊 目前等待推送的 Commits

```bash
# 查看等待推送的 commits
git log origin/main..main --oneline
```

應該會看到：
```
a9a2c8e docs: Update PROJECT_PROGRESS.md with Phase 24-26 telemarketing system completion
8fa002a docs: Add verification guide and system status report
1283b04 feat: Complete telemarketing system with student follow-up
```

**包含內容**：
- 📞 電訪系統完整功能（學生跟進、通話記錄、教師分配）
- 📝 驗收測試文檔
- 📊 進度報告更新

---

## 🆘 如果遇到問題

### 問題 1：Token 認證失敗

```bash
# 錯誤：Authentication failed
# 解決：確認 token 權限包含 'repo'
```

### 問題 2：SSH 連線失敗

```bash
# 測試 SSH 連線
ssh -T git@github.com

# 應該看到：
# Hi thisissingple! You've successfully authenticated...
```

### 問題 3：Push 被拒絕（rejected）

```bash
# 可能 remote 有新的 commits
git pull --rebase origin main
git push origin main
```

---

## ✅ 推送成功後

1. **確認推送成功**：
   ```bash
   git status
   # 應該顯示：Your branch is up to date with 'origin/main'
   ```

2. **前往 Zeabur 檢查部署**：
   - Zeabur 會自動偵測到新 commit
   - 等待 3-5 分鐘完成部署

3. **測試電訪系統**：
   - 前往線上網址
   - 登入：xk4kx4563022@gmail.com / Fff1359746!
   - 測試：電訪系統 → 學生跟進

---

## 🎯 我的推薦

**最快速**：方案 A - Personal Access Token（5 分鐘）
**最安全**：方案 B - SSH Key（10 分鐘）
**最方便**：方案 C - GitHub CLI（15 分鐘，但之後最方便）

---

**需要我協助哪個方案嗎？告訴我你想用哪種方式！**

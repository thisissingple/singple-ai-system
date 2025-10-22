# 🚀 快速參考指南

**更新時間**：2025-10-22 晚上 10:40 PM

---

## 📋 系統登入資訊

### 線上系統
- **URL**：https://singple-ai-system.zeabur.app（待確認）
- **Email**：xk4kx4563022@gmail.com
- **密碼**：Fff1359746!
- **更新日期**：2025-10-22

### GitHub
- **Repository**：https://github.com/thisissingple/singple-ai-system
- **Branch**：main
- **Latest Commit**：cf2ab91
- **Token 過期**：2025-11-20

### Supabase
- **URL**：在 Zeabur 環境變數中
- **連線方式**：pg 模組直接連線
- **重要資料表**：
  - `trial_class_purchases` - 體驗課購買
  - `trial_class_records` - 上課記錄
  - `telemarketing_calls` - 通話記錄
  - `fb_lead_ads` - FB 廣告名單

---

## 🎯 今日完成功能（2025-10-22）

### 電訪系統（Phase 24-26）
✅ **學生跟進** - `/telemarketing/student-follow-up`
- 優先級計算（🔴🟡🟢）
- 6 個統計卡片
- 進階篩選和搜尋

✅ **通話記錄** - 撥打對話框 + 記錄列表
- 通話結果記錄
- 條件式欄位
- 意願程度追蹤

✅ **教師分配** - 分配對話框
- 教師列表顯示
- 智能推薦（⭐）
- ⚠️ 後端 API 待實作（Phase 3）

---

## 📂 重要文檔位置

### 驗收測試
- **[HOW_TO_VERIFY.md](HOW_TO_VERIFY.md)** - 5 分鐘快速驗收指南
- **[TELEMARKETING_ACCEPTANCE_TEST.md](TELEMARKETING_ACCEPTANCE_TEST.md)** - 85+ 詳細測試項目

### 開發文檔
- **[TELEMARKETING_SYSTEM_COMPLETE.md](TELEMARKETING_SYSTEM_COMPLETE.md)** - 完整開發報告
- **[PROJECT_PROGRESS.md](PROJECT_PROGRESS.md)** - 專案進度追蹤（2602 行）
- **[TODAY_COMPLETION_SUMMARY.md](TODAY_COMPLETION_SUMMARY.md)** - 今日完成總結

### 系統狀態
- **[DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md)** - 部署狀態報告
- **[SYSTEM_STATUS_REPORT.md](SYSTEM_STATUS_REPORT.md)** - 系統問題記錄

### 操作指南
- **[GITHUB_PUSH_GUIDE.md](GITHUB_PUSH_GUIDE.md)** - GitHub 推送指南
- **[.github-credentials](.github-credentials)** - GitHub Token（⚠️ 敏感）

---

## ⚡ 常用指令

### Git 操作
```bash
# 推送到 GitHub（已設定自動認證）
git push origin main

# 查看狀態
git status

# 查看最近 commits
git log --oneline -5

# 查看未推送的 commits
git log origin/main..main --oneline
```

### 本地開發
```bash
# 啟動開發伺服器
npm run dev

# 類型檢查
npm run check

# 建置生產版本
npm run build

# 清除舊程序並重啟
npm run dev:clean
```

### 測試
```bash
# KPI 計算測試
npx tsx tests/test-kpi-only.ts

# AI 欄位映射測試
npx tsx tests/test-ai-field-mapper.ts

# 環境變數檢查
npx tsx tests/test-env-check.ts
```

---

## 🔍 快速驗收（5 分鐘）

### 步驟 1：登入系統
1. 前往線上網址
2. 使用上方登入資訊
3. 確認能成功登入

### 步驟 2：測試學生跟進
1. 點擊：電訪系統 → 學生跟進
2. 確認：
   - [ ] 看到 6 個統計卡片
   - [ ] 學生列表顯示（有 🔴🟡🟢 標記）
   - [ ] 「今日待辦」按鈕有效
   - [ ] 搜尋功能正常

### 步驟 3：測試撥打對話框
1. 點擊任一學生的「撥打」按鈕
2. 確認：
   - [ ] 對話框正常開啟
   - [ ] 選擇「已接通」→ 顯示聯絡狀態
   - [ ] 選擇「未接通」→ 隱藏聯絡狀態
   - [ ] 填寫並儲存成功

### 步驟 4：測試分配教師
1. 找到「未分配」的學生
2. 點擊「分配教師」按鈕
3. 確認：
   - [ ] 對話框正常開啟
   - [ ] 看到教師列表
   - [ ] 看到工作量數字
   - [ ] 看到推薦標記（⭐）
   - ⚠️ 點擊「確認分配」可能失敗（API 待實作）

**通過標準**：前 3 個步驟全部正常即可通過驗收

---

## ⚠️ 已知問題

### 可接受的問題
1. **分配教師 API 未實作**
   - 對話框能開啟 ✅
   - 實際分配可能失敗 ⚠️
   - 屬於 Phase 3 功能

2. **部分學生缺電話**
   - 顯示「無資料」或「-」
   - 需要同步 Google Sheets

### 遺留問題（不影響驗收）
1. Dashboard 顯示 972 筆無效資料
2. pending 計算顯示 -474（負數）
3. 2 筆購買記錄遺失

---

## 📞 需要協助時

### 查看日誌
1. **Zeabur 部署日誌**
   - 前往 Zeabur Dashboard
   - 選擇專案
   - 查看 Deployment Logs

2. **瀏覽器 Console**
   - 按 F12 開啟開發者工具
   - 查看 Console 標籤

### 常見問題
**Q: 看不到「學生跟進」選單？**
A: 確認 Zeabur 已部署最新版本（commit cf2ab91）

**Q: 統計卡片顯示 0？**
A: 可能資料庫中沒有體驗課購買記錄

**Q: 分配教師按鈕無反應？**
A: 正常，後端 API 待實作（Phase 3）

---

## 🎯 下一步行動

### 今晚/明天
1. ✅ 確認 Zeabur 部署狀態
2. ✅ 執行快速驗收（5 分鐘）
3. ✅ 記錄任何問題

### 本週（可選）
4. ⏳ 實作分配教師 API
5. ⏳ 同步 Google Sheets 電話資料
6. ⏳ 修復 Dashboard 警告

### 未來規劃
7. ⏳ Phase 3 進階功能
8. ⏳ 權限控制系統
9. ⏳ UI/UX 優化

---

## 📊 系統架構快速參考

### 前端路由
```
/telemarketing/student-follow-up  → 學生跟進頁面
/telemarketing/call-records       → 通話記錄列表
/telemarketing/ad-leads-list      → FB 廣告名單
/telemarketing/ad-performance     → FB 成效報表
```

### API 端點
```
GET  /api/telemarketing/calls           # 查詢通話記錄
GET  /api/telemarketing/calls/stats     # 統計資訊
POST /api/telemarketing/calls           # 新增通話記錄
GET  /api/trial-class-purchases/students # 學生列表
GET  /api/teachers                      # 教師列表
```

### 核心檔案
```
client/src/pages/telemarketing/
├── student-follow-up.tsx       # 學生跟進主頁面
├── call-records-list.tsx       # 通話記錄列表
├── ad-leads-list.tsx           # FB 廣告名單
└── ad-performance-report.tsx   # FB 成效報表

client/src/components/telemarketing/
├── call-dialog.tsx             # 撥打對話框
└── assign-teacher-dialog.tsx   # 分配教師對話框

server/
└── routes.ts                   # API 路由（5150+ 行）
```

---

## 🎉 祝驗收順利！

有任何問題隨時查看相關文檔或詢問我！

**最後更新**：2025-10-22 晚上 10:40 PM

# 🚀 快速恢復指南（Replit Reload 後使用）

> **用途**: 當 Replit 重啟或 Claude 對話消失時，用這份文件快速恢復工作狀態
> **最後更新**: 2025-10-13

---

## ⚡ 快速恢復步驟（30 秒內完成）

### 1. 告訴 Claude 你在哪裡
```
我 Replit 重啟了，對話記錄消失。
請查看 QUICK_RECOVERY_GUIDE.md 和 PROJECT_PROGRESS.md，告訴我當前狀態。
```

### 2. Claude 會自動做這些事
- ✅ 讀取專案進度文檔
- ✅ 檢查 Git 狀態
- ✅ 列出最近的 commits
- ✅ 顯示未提交的變更
- ✅ 告訴你接下來可以做什麼

---

## 📊 當前專案狀態（快照）

### **最新進展**
- ✅ **Phase 16.1** - 教學品質追蹤系統基礎功能（完成）
- ✅ **Phase 16.1.5** - 全自動分析系統（完成）
- ✅ **UI/UX 優化** - 9 項用戶反饋改進（完成）
- ✅ **Bug 修復** - 4 個重大 Bug（完成）
- ✅ **優先級規則** - 已完成學生的優先級修正（完成）

### **最近 5 個 Commits**
```
016d0ee - fix: correct priority rules for completed students
9cfd586 - feat: refine priority rules and add explanation dialog
f5dd527 - feat: optimize student follow-up table for telemarketing team
2dc617b - feat: add resizable columns and loading states to database browser
04c822a - fix: database browser edit functionality issues
```

### **未提交的變更**（需要提交）
```
Modified:
  - .claude/settings.local.json
  - PROJECT_PROGRESS.md
  - SESSION_SUMMARY.md
  - client/src/App.tsx
  - client/src/components/trial-report/student-insights.tsx
  - client/src/config/sidebar-config.tsx
  - server/index.ts
  - server/routes.ts

Untracked:
  - 15 個新文檔（教學品質系統相關）
  - client/src/pages/teaching-quality/ (新資料夾)
  - server/services/teaching-quality-*.ts (3 個新服務)
  - supabase/migrations/027_*.sql (新 migration)
```

**總計**: 約 **1,251 行新增/修改**，領先 origin/main **11 commits**

---

## 🎯 接下來可以做的事（優先順序）

### 選項 A：提交當前工作（推薦）✅
**為什麼**: 保存所有改進，避免再次遺失
```bash
git add .
git commit -m "feat: complete Phase 16.1 UI/UX improvements and priority rules fix"
git push origin main
```

### 選項 B：測試新功能 🧪
**為什麼**: 驗證教學品質追蹤系統運作正常
```bash
npm run dev
# 然後訪問 http://localhost:5000
# 測試路徑: 側邊欄 → 教學品質追蹤
```

### 選項 C：繼續開發 Phase 16.2 🚀
**功能**: 建議執行追蹤（AI 追蹤教師是否執行建議）
**預計時間**: 4-6 小時

### 選項 D：其他緊急任務 ❓
如果有其他需求請說明

---

## 📚 關鍵文檔快速索引

| 文檔 | 用途 | 何時查看 |
|------|------|---------|
| [PROJECT_PROGRESS.md](PROJECT_PROGRESS.md) | 完整專案進度 | 想知道整體進度 |
| [SESSION_SUMMARY.md](SESSION_SUMMARY.md) | 歷史工作記錄 | 查看過去做了什麼 |
| [SESSION_SUMMARY_2025-10-13.md](SESSION_SUMMARY_2025-10-13.md) | 今天的工作 | 想知道今天做了什麼 |
| [CLAUDE.md](CLAUDE.md) | 專案架構指南 | Claude 的工作手冊 |
| [TEACHING_QUALITY_AUTO_SYSTEM_COMPLETE.md](TEACHING_QUALITY_AUTO_SYSTEM_COMPLETE.md) | 教學品質系統 | 了解教學品質功能 |

---

## 🔧 常見問題解決

### Q1: 伺服器無法啟動（Port 5000 被占用）
```bash
npm run dev:clean
# 或
pkill -f tsx
npm run dev
```

### Q2: 想知道當前開發到哪了？
```bash
# 查看最近的 commits
git log --oneline -10

# 查看未提交的變更
git status

# 查看詳細變更
git diff --stat
```

### Q3: 忘記 API 端點或服務在哪？
查看 [CLAUDE.md](CLAUDE.md) 的「Architecture」和「Directory Structure」章節

### Q4: 不確定要測試什麼？
查看 [SESSION_SUMMARY_2025-10-13.md](SESSION_SUMMARY_2025-10-13.md) 的「待辦事項」章節

---

## 🛠️ 快速命令備忘錄

### 開發
```bash
npm run dev              # 啟動開發伺服器
npm run dev:clean        # 清理並重啟
npm run build            # 建立生產版本
npm run check            # TypeScript 類型檢查
```

### Git
```bash
git status               # 查看狀態
git add .                # 暫存所有變更
git commit -m "message"  # 提交
git push origin main     # 推送到遠端
git log --oneline -10    # 查看最近 10 個 commits
```

### 測試
```bash
npx tsx tests/test-kpi-only.ts               # 測試 KPI 計算
npx tsx scripts/test-openai-connection.ts    # 測試 OpenAI 連線
npx tsx scripts/check-analysis-result.ts     # 檢查分析結果
```

### 資料庫
```bash
# 查詢教學品質分析記錄
psql $SUPABASE_DB_URL -c "SELECT COUNT(*) FROM teaching_quality_analysis;"

# 查詢待分析記錄
psql $SUPABASE_DB_URL -c "SELECT COUNT(*) FROM trial_class_attendance WHERE ai_analysis_id IS NULL AND class_transcript IS NOT NULL;"
```

---

## 📱 聯絡資訊（如需協助）

- **GitHub Issues**: [專案 Issues 頁面](https://github.com/yourusername/yourrepo/issues)
- **文檔問題**: 更新 [QUICK_RECOVERY_GUIDE.md](QUICK_RECOVERY_GUIDE.md)

---

## 🎉 最佳實踐（避免再次遺失進度）

### ✅ DO（建議做）
1. **定期提交代碼**（每完成一個功能就 commit）
2. **詳細的 commit message**（讓未來的你知道做了什麼）
3. **保持文檔更新**（PROJECT_PROGRESS.md 和 SESSION_SUMMARY.md）
4. **使用這份指南**（每次 reload 後第一件事）

### ❌ DON'T（避免做）
1. 不要長時間不提交（Replit 可能隨時重啟）
2. 不要依賴對話記錄（它會消失）
3. 不要忘記更新文檔（文檔是唯一的記憶）

---

## 🚨 緊急情況處理

### 情況 1: 代碼改壞了，想回到之前的版本
```bash
git log --oneline -10     # 找到想回到的 commit ID
git checkout [commit-id]  # 查看舊版本
git checkout main         # 回到最新版本
```

### 情況 2: 不小心刪除了重要檔案
```bash
git status                    # 確認刪除了什麼
git restore [file-path]       # 恢復單一檔案
git restore .                 # 恢復所有檔案
```

### 情況 3: 伺服器一直出錯
```bash
# 1. 檢查環境變數
npx tsx tests/test-env-check.ts

# 2. 清理並重啟
npm run dev:clean

# 3. 檢查日誌
# 查看 Replit Console 的錯誤訊息
```

---

**最後提醒**: 當你看到這份文件時，說明 Replit 剛剛重啟了。不用擔心，你的代碼都在，只是對話記錄消失了。跟 Claude 說一聲，它會幫你快速恢復狀態！🚀

---

**創建時間**: 2025-10-13
**維護者**: Claude + 你
**版本**: 1.0

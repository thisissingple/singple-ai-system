# 檔案管理指南

**建立日期**: 2025-10-17
**目的**: 建立清晰的檔案管理流程，避免根目錄混亂

---

## 🎯 核心原則

### ✅ 建立時就分類（推薦）

**原因**:
1. ✅ **即時清晰** - 不會累積混亂
2. ✅ **減少後續工作** - 不需要批次整理
3. ✅ **易於查找** - 檔案在正確位置
4. ✅ **養成習慣** - 長期維護更容易

**vs. 後續整理的問題**:
- ❌ 檔案累積到 66 個才整理（今天的狀況）
- ❌ 需要花時間批次處理
- ❌ 容易忘記哪些檔案還有用
- ❌ 增加認知負擔

**結論**: ⭐ **建立檔案時就放到正確位置**

---

## 📁 標準目錄結構

```
workspace/
├── 📄 核心文件（根目錄，最多 5 個）
│   ├── PROJECT_PROGRESS.md          ⭐ 專案進度（最重要）
│   ├── CLAUDE.md                    ⭐ AI 工作指南
│   ├── README.md                    ⭐ 專案說明
│   ├── PG_ARCHITECTURE_DECISION.md  ⭐ 技術決策
│   └── .gitignore, package.json...  （設定檔）
│
├── 📚 docs/                         當前技術文件
│   ├── DATABASE_SAFETY_GUIDE.md
│   ├── PROJECT_FILE_STRUCTURE.md
│   ├── FILE_MANAGEMENT_GUIDELINES.md  ⭐ 本檔案
│   ├── AI_KPI_MODIFICATION_GUIDE.md
│   ├── HR_SYSTEM_MIGRATION_GUIDE.md
│   └── COST_PROFIT_SOP.md
│
├── 📦 archive/                      歷史歸檔
│   ├── README.md                    歸檔索引
│   ├── sessions/                    每日工作總結
│   ├── phases/                      Phase 完成報告
│   ├── features/                    功能完成報告
│   ├── tests/                       舊測試檔案
│   ├── data/                        歷史資料
│   └── deprecated/                  已過時文件
│
├── 🔧 server/                       後端程式碼
├── 🎨 client/                       前端程式碼
├── 🗄️ supabase/                     資料庫 migrations
├── 📜 scripts/                      資料處理腳本
├── ✅ tests/                        測試檔案
└── ⚙️ configs/                      設定檔案
```

---

## 📋 檔案分類規則

### 1. Markdown 文件分類

| 檔案類型 | 放置位置 | 範例 | 時機 |
|---------|---------|------|------|
| **專案進度** | 根目錄 | `PROJECT_PROGRESS.md` | 永久保留 |
| **技術指南** | `docs/` | `DATABASE_SAFETY_GUIDE.md` | 建立時即放 |
| **每日總結** | `archive/sessions/` | `SESSION_SUMMARY_2025-10-17.md` | 建立時即放 |
| **Phase 報告** | `archive/phases/` | `PHASE_19_2_STEP1_COMPLETE.md` | 建立時即放 |
| **功能完成報告** | `archive/features/` | `FORM_SYSTEM_COMPLETE.md` | 建立時即放 |
| **過時文件** | `archive/deprecated/` | `BUGFIX_SUMMARY.md` | 發現時移動 |

---

### 2. 程式碼檔案分類

| 檔案類型 | 放置位置 | 範例 |
|---------|---------|------|
| **資料庫 Migration** | `supabase/migrations/` | `031_create_hr_management_system.sql` |
| **資料處理腳本** | `scripts/` | `migrate-historical-data.ts` |
| **測試檔案** | `tests/` | `test-kpi-only.ts` |
| **舊測試檔案** | `archive/tests/` | `test-supabase-connection.js` |
| **後端服務** | `server/services/` | `kpi-calculator.ts` |
| **前端頁面** | `client/src/pages/` | `dashboard.tsx` |

---

### 3. 資料檔案分類

| 檔案類型 | 放置位置 | 範例 |
|---------|---------|------|
| **CSV 資料** | `archive/data/` | `收支表單.csv` |
| **截圖** | `archive/data/` | `nav-verification.png` |
| **Google Sheets** | `archive/data/google-sheets/` | 各種 CSV 匯出 |

---

## 🔄 檔案生命週期

### 階段 1: 建立時
```
✨ 建立新檔案
    ↓
❓ 這是什麼類型的檔案？
    ↓
📂 直接放到對應目錄
```

**範例**:
```bash
# ❌ 錯誤：放在根目錄
echo "# Session Summary" > SESSION_SUMMARY_2025-10-18.md

# ✅ 正確：直接放到正確位置
echo "# Session Summary" > archive/sessions/SESSION_SUMMARY_2025-10-18.md
```

---

### 階段 2: 使用中
```
📝 使用中的文件
    ↓
📍 保持在 docs/ 或根目錄
    ↓
🔄 定期更新
```

**保留在根目錄/docs/ 的條件**:
- ✅ 經常參考（如 PROJECT_PROGRESS.md）
- ✅ 技術指南（如 DATABASE_SAFETY_GUIDE.md）
- ✅ 尚未完成（開發中的功能文件）

---

### 階段 3: 完成/過時
```
✅ 功能完成 / ❌ 文件過時
    ↓
📦 立即移到 archive/
    ↓
📋 更新 archive/README.md 索引
```

**範例**:
```bash
# Phase 完成後
mv PHASE_19_2_STEP2_COMPLETE.md archive/phases/

# 功能完成後
mv FORM_SYSTEM_COMPLETE.md archive/features/form-builder/
```

---

## ✍️ 檔案命名規範

### 1. 日期總結文件
```
格式: SESSION_SUMMARY_YYYY-MM-DD.md
範例: SESSION_SUMMARY_2025-10-17.md
位置: archive/sessions/
```

### 2. Phase 報告
```
格式: PHASE_XX_Y_STEPZ_COMPLETE.md
範例: PHASE_19_2_STEP1_COMPLETE.md
位置: archive/phases/
```

### 3. 功能完成報告
```
格式: FEATURE_NAME_COMPLETE.md
範例: FORM_SYSTEM_COMPLETE.md
位置: archive/features/[feature-category]/
```

### 4. 技術指南
```
格式: DESCRIPTIVE_NAME_GUIDE.md
範例: DATABASE_SAFETY_GUIDE.md
位置: docs/
```

### 5. 腳本檔案
```
格式: action-description.ts
範例: migrate-historical-data.ts
位置: scripts/
```

---

## 🤖 AI 助手（Claude）工作流程

### 建立新文件時的決策樹

```
建立文件前思考：
├─ 是每日總結？
│  └─ ✅ 建立到 archive/sessions/SESSION_SUMMARY_YYYY-MM-DD.md
│
├─ 是 Phase 完成報告？
│  └─ ✅ 建立到 archive/phases/PHASE_XX_COMPLETE.md
│
├─ 是功能完成報告？
│  └─ ✅ 建立到 archive/features/[category]/FEATURE_COMPLETE.md
│
├─ 是技術指南/SOP？
│  └─ ✅ 建立到 docs/GUIDE_NAME.md
│
├─ 是臨時測試檔案？
│  └─ ✅ 建立到 archive/tests/test-*.js
│
└─ 是重要技術決策？
   └─ ✅ 可以放根目錄（但要精簡，最多 5 個）
```

---

## 📊 實際案例

### ✅ 案例 1: 完成 Phase 19.2 後

**情境**: Phase 19.2 完成，需要建立報告

**❌ 錯誤做法**:
```bash
# 建立到根目錄
echo "# Phase 19.2 Complete" > PHASE_19_2_COMPLETE.md
```

**✅ 正確做法**:
```bash
# 直接建立到 archive/phases/
echo "# Phase 19.2 Complete" > archive/phases/PHASE_19_2_STEP2_COMPLETE.md

# 同時更新 PROJECT_PROGRESS.md
```

---

### ✅ 案例 2: 每日工作結束

**情境**: 一天工作結束，需要建立總結

**✅ 正確做法**:
```bash
# 直接建立到 archive/sessions/
claude-code create archive/sessions/SESSION_SUMMARY_2025-10-18.md

# 內容包含：
# - 完成的項目
# - 建立的檔案
# - 解決的問題
# - 下一步計畫
```

---

### ✅ 案例 3: 建立新的技術指南

**情境**: 發現新的技術決策需要記錄

**✅ 正確做法**:
```bash
# 建立到 docs/
echo "# API Design Guidelines" > docs/API_DESIGN_GUIDELINES.md

# 這是長期使用的技術文件，不是一次性報告
```

---

## 🧹 定期清理檢查清單

### 每日（工作結束時）
- [ ] 確認今天建立的檔案都在正確位置
- [ ] 檢查根目錄是否有新增的 .md 檔案
- [ ] 如果有，立即移到對應位置

### 每週
- [ ] 檢查 `docs/` 是否有過時文件
- [ ] 將完成的功能報告移到 `archive/features/`
- [ ] 更新 `archive/README.md` 索引

### 每月
- [ ] 審查 `archive/` 結構是否需要調整
- [ ] 刪除明確不需要的檔案
- [ ] 更新 `PROJECT_FILE_STRUCTURE.md`

---

## 🚨 警示訊號

當出現以下情況時，需要立即清理：

1. ❌ 根目錄超過 **10 個** .md 檔案
2. ❌ `docs/` 超過 **15 個** 檔案
3. ❌ 找不到某個檔案在哪裡
4. ❌ 同一類型檔案散落多處
5. ❌ 有 `.backup`, `.old`, `.temp` 等後綴檔案

---

## 📝 建立文件的標準流程

### Step 1: 確定檔案類型和位置
```bash
# 問自己：這個檔案是什麼？放哪裡？
TYPE="session_summary"  # or phase_report, tech_guide, etc.
```

### Step 2: 使用正確路徑建立
```bash
# ✅ 正確：直接建立到目標位置
Write tool → file_path: "archive/sessions/SESSION_SUMMARY_2025-10-18.md"
```

### Step 3: 更新索引（如需要）
```bash
# 如果是重要文件，更新 archive/README.md 或 docs/ 索引
```

### Step 4: 記錄到 PROJECT_PROGRESS.md
```bash
# 更新專案進度文件
```

---

## 🎓 學到的經驗（2025-10-17 大清理）

### 問題
- 根目錄累積 **66 個** markdown 檔案
- 花費時間批次整理
- 難以找到特定檔案

### 解決方案
- 建立 `archive/` 目錄結構
- 分類移動所有歷史檔案
- 根目錄只剩 **4 個核心檔案**

### 經驗教訓
1. ✅ **建立時就分類** - 不要等到累積很多才整理
2. ✅ **命名要一致** - 使用標準命名格式
3. ✅ **定期檢查** - 每週檢查一次檔案結構
4. ✅ **更新索引** - 保持 README.md 和 PROJECT_PROGRESS.md 最新

---

## 🔧 實用指令

### 檢查根目錄檔案數量
```bash
ls -1 *.md | wc -l
# 目標：≤ 5 個
```

### 找出最近建立的檔案
```bash
ls -lt *.md | head -10
```

### 批次移動同類型檔案
```bash
# Phase 報告
mv PHASE_*.md archive/phases/

# Session 總結
mv SESSION_SUMMARY_*.md archive/sessions/

# 功能完成報告
mv *_COMPLETE.md archive/features/
```

### 檢查檔案大小
```bash
du -sh archive/*
```

---

## 📖 快速參考表

| 我要建立... | 放置位置 | 命名格式 |
|-----------|---------|---------|
| 每日工作總結 | `archive/sessions/` | `SESSION_SUMMARY_YYYY-MM-DD.md` |
| Phase 報告 | `archive/phases/` | `PHASE_XX_Y_COMPLETE.md` |
| 功能完成報告 | `archive/features/[category]/` | `FEATURE_NAME_COMPLETE.md` |
| 技術指南 | `docs/` | `DESCRIPTIVE_NAME_GUIDE.md` |
| 資料處理腳本 | `scripts/` | `action-description.ts` |
| 測試檔案 | `tests/` (活躍) 或 `archive/tests/` (舊) | `test-*.ts` |
| 資料匯出 | `archive/data/` | 原檔名 |

---

## ✨ 最佳實踐總結

1. ✅ **建立時就分類** - 不要放根目錄再移動
2. ✅ **使用標準命名** - 遵循命名規範
3. ✅ **更新索引** - 保持 README.md 最新
4. ✅ **定期檢查** - 每週檢查一次
5. ✅ **根目錄精簡** - 最多 5 個 .md 檔案
6. ✅ **即時歸檔** - 完成的檔案立即移到 archive/

---

**維護者**: Claude (AI Assistant) + 專案團隊
**最後更新**: 2025-10-17
**版本**: 1.0

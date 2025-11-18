# 學員完整檔案查詢系統 - 使用說明

## 📋 功能總覽

學員完整檔案查詢系統是一個全新的功能模組，可讓教師、諮詢顧問和管理員透過學員 Email **一鍵查詢**該學員的所有互動記錄、AI 洞察與完整歷程。

## 🎯 主要功能

### 1. **學員檔案總覽卡片**
- 學員基本資訊 (姓名、Email)
- 轉換狀態 (已轉換、進行中、未轉換)
- 統計數據:
  - 總上課次數
  - 總諮詢次數
  - 總互動次數
  - 首次接觸日期
- 基本資訊 (年齡、職業、決策者、價格敏感度)

### 2. **互動歷程時間軸**
按時間排序顯示學員的所有互動記錄:
- 📚 上課記錄 (教師、日期、備註)
- 💬 諮詢記錄 (諮詢顧問、成交金額、狀態)
- 🛒 購買記錄 (課程、金額、付款方式)
- 📊 AI 品質分析 (評分、建議)

### 3. **學員洞察面板**
AI 累積的學員深度分析:
- 🔴 **痛點分析** - 學員反覆提及的痛點、提及次數
- 🎯 **學習目標** - 期望成果、預期用途、學習動機
- 🧠 **心理狀態** - 自信程度、情緒狀態、心理障礙
- ⚠️ **轉換障礙** - 影響學員轉換的關鍵因素
- 📈 **購買歷史** - 過往購買方案與金額

### 4. **AI 智能洞察**
AI 預生成的策略建議:
- 轉換機率預測 (百分比 + 進度條)
- 痛點深度分析 (Markdown 格式)
- 轉換策略建議
- 執行評估
- 下一步行動建議

---

## 🚀 使用方式

### **訪問頁面**
```
URL: /students/profile
路徑: 學員管理 > 學員檔案查詢
```

### **查詢流程**
1. 在搜尋框輸入學員 Email (例: `student@example.com`)
2. 按下「查詢」按鈕 (或按 Enter)
3. 系統自動載入學員完整資料
4. 在 3 個 Tab 之間切換:
   - **互動歷程** - 時間軸顯示所有事件
   - **學員洞察** - AI 累積的深度分析
   - **AI 分析** - AI 預生成的策略建議

---

## 📂 檔案結構

### **新建檔案列表**
```
client/src/
├── hooks/
│   └── use-student-profile.ts               ⭐ React Query Hook
├── components/student-profile/
│   ├── student-profile-card.tsx             ⭐ 學員檔案卡片
│   ├── student-timeline.tsx                 ⭐ 互動時間軸
│   ├── student-insights-panel.tsx           ⭐ 學員洞察面板
│   └── ai-insights-panel.tsx                ⭐ AI 洞察面板
└── pages/students/
    └── student-profile-page.tsx             ⭐ 主頁面
```

### **修改檔案**
```
client/src/App.tsx                           ✏️ 新增路由
```

---

## 🔌 API 端點

### **1. 取得學員完整檔案**
```http
GET /api/teaching-quality/student/:email/profile
```

**回應範例:**
```json
{
  "success": true,
  "data": {
    "kb": {
      "student_email": "test@example.com",
      "student_name": "張三",
      "total_classes": 5,
      "total_consultations": 2,
      "conversion_status": "in_progress",
      "profile_summary": { ... },
      "ai_pregenerated_insights": { ... }
    },
    "trialClasses": [...],
    "eodsRecords": [...],
    "aiAnalyses": [...],
    "purchases": [...]
  }
}
```

### **2. 其他相關 API**
- `POST /api/teaching-quality/student/:email/ask-preset` - AI 預設問題查詢
- `POST /api/teaching-quality/student/:email/ask-custom` - AI 自訂問題查詢
- `GET /api/teaching-quality/student/:email/conversations` - 對話歷史

---

## 💾 資料來源

### **資料表**
系統整合以下 5 個資料表:

#### 1. `student_knowledge_base` (學員知識庫)
- 學員彙總資訊
- AI 累積檔案 (JSONB)
- 統計數據 (上課次數、諮詢次數)

#### 2. `trial_class_attendance` (上課記錄)
- 上課日期、教師、備註
- 關聯: `student_email`

#### 3. `eods_for_closers` (諮詢成交記錄)
- 諮詢顧問、成交金額、方案
- 關聯: `student_email`

#### 4. `teaching_quality_analysis` (AI 品質分析)
- 教學評分、AI 建議
- 關聯: `attendance_id` → `trial_class_attendance`

#### 5. `trial_class_purchases` (購買記錄)
- 購買日期、課程、金額
- 關聯: `student_email`

---

## 🎨 UI 設計

### **配色方案**
- 🔵 **上課記錄** - 藍色 (Blue)
- 🟣 **諮詢記錄** - 紫色 (Purple)
- 🟢 **購買記錄** - 綠色 (Green)
- 🟠 **AI 分析** - 橘色 (Orange)

### **轉換狀態標籤**
- ✅ **已轉換** - 綠色 Badge
- ⏳ **進行中** - 黃色 Badge
- ⭕ **未轉換** - 灰色 Badge

### **響應式設計**
- Desktop: Grid 4 欄位
- Tablet: Grid 2 欄位
- Mobile: Grid 1 欄位

---

## 🔧 技術實作

### **React Query 快取策略**
```typescript
useQuery({
  queryKey: ['student-profile', email],
  queryFn: () => fetchStudentProfile(email),
  staleTime: 2 * 60 * 1000,  // 2 分鐘
  retry: 1,
});
```

### **自動統計同步**
每次查詢學員檔案時，系統會自動:
1. 檢查學員知識庫是否存在
2. 如不存在 → 自動建立新記錄
3. 自動同步統計數據 (`total_classes`, `total_consultations`)
4. 並行查詢 4 個資料來源 (優化效能)

### **時間軸排序邏輯**
```typescript
events.sort((a, b) =>
  new Date(b.date).getTime() - new Date(a.date).getTime()
);
```
最新事件在最上方，方便追蹤學員最近互動。

---

## ✅ 測試檢查清單

### **功能測試**
- [ ] 輸入 Email 查詢學員
- [ ] 顯示學員檔案卡片
- [ ] 顯示互動時間軸 (正確排序)
- [ ] 切換 3 個 Tab (互動歷程、學員洞察、AI 分析)
- [ ] 顯示資料統計摘要

### **邊界測試**
- [ ] 查詢不存在的學員 (顯示錯誤訊息)
- [ ] 學員無任何記錄 (顯示空狀態)
- [ ] 學員無 AI 洞察 (顯示提示訊息)
- [ ] Email 格式錯誤 (API 回傳錯誤)

### **效能測試**
- [ ] 查詢速度 < 2 秒
- [ ] 快取生效 (2 分鐘內重複查詢不重新請求)
- [ ] 大量資料 (>50 筆記錄) 載入正常

---

## 🚀 未來擴展建議

### **1. 搜尋自動完成**
- 輸入時顯示學員建議清單
- API: `GET /api/students/search?q=xxx`

### **2. 學員列表頁**
- 顯示所有學員
- 支援篩選、排序
- 點擊進入詳情頁

### **3. 即時 AI 對話**
- 在檔案頁面直接問 AI 問題
- 類似 FloatingAIChat 元件

### **4. 匯出 PDF 報告**
- 一鍵匯出學員完整檔案 PDF
- 包含圖表與 AI 建議

### **5. 對比功能**
- 同時比較多位學員的數據
- 找出高轉換率學員的共通特徵

---

## 📞 技術支援

### **常見問題**

**Q: 查詢失敗顯示 "查詢學員檔案失敗"?**
A: 檢查:
1. 學員 Email 是否正確
2. 後端 API 是否正常運行
3. 瀏覽器 Console 是否有錯誤訊息

**Q: 時間軸顯示資料不完整?**
A: 確認資料表中該學員的記錄是否正確關聯 (檢查 `student_email` 欄位)

**Q: AI 洞察面板是空的?**
A: 這是正常的，AI 洞察需要時間累積。可以透過 AI 對話手動生成洞察。

---

## 📚 相關文件

- [GITMIND_STRUCTURE.md](../GITMIND_STRUCTURE.md) - 系統整體架構
- [CLAUDE.md](../CLAUDE.md) - AI 協作指南
- [student-knowledge-service.ts](../server/services/student-knowledge-service.ts) - 後端服務

---

**建立日期:** 2025-11-17
**版本:** 1.0.0
**作者:** Claude AI + User

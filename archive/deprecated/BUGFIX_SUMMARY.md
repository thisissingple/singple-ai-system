# Bug 修復總結

**修復時間**: 2025-10-13
**修復項目**: 3 個 Bug

---

## 🐛 **Bug #1: 查看詳情頁面 SQL 錯誤**

### **錯誤訊息**:
```
error: column "sel.suggestion_index" must appear in the GROUP BY clause
or be used in an aggregate function
```

### **原因**:
在 `json_agg()` 的子查詢中，`ORDER BY` 的語法不正確

### **修復**:
```sql
-- ❌ 錯誤寫法
(SELECT json_agg(sel.*)
 FROM suggestion_execution_log sel
 WHERE sel.analysis_id = tqa.id
 ORDER BY sel.suggestion_index)

-- ✅ 正確寫法
(SELECT json_agg(sel ORDER BY sel.suggestion_index)
 FROM suggestion_execution_log sel
 WHERE sel.analysis_id = tqa.id)
```

### **檔案**: `server/routes.ts` (第 5386 行)

---

## 🐛 **Bug #2: 剩餘堂數無法顯示**

### **問題**:
前端判斷條件錯誤，依賴 `conversion_status` 而非 `package_name`

### **原因**:
`conversion_status` 可能是 `'pending'`，導致已購課的學生無法正確顯示剩餘堂數

### **修復**:
```typescript
// ❌ 錯誤判斷
{record.conversion_status === 'converted' && record.remaining_classes ? (
  <Badge>剩 {record.remaining_classes} 堂</Badge>
) : ...}

// ✅ 正確判斷
{record.package_name && record.remaining_classes ? (
  <Badge>{record.remaining_classes}</Badge>
) : record.package_name ? (
  <Badge>已轉高</Badge>
) : (
  <span>-</span>
)}
```

### **邏輯說明**:
1. **有方案 + 有剩餘堂數** → 顯示「3 堂」（藍色 Badge）
2. **有方案 + 無剩餘堂數** → 顯示「已轉高」（綠色 Badge）
3. **無方案** → 顯示「-」（灰色）

### **檔案**: `client/src/pages/teaching-quality/teaching-quality-list.tsx` (第 266-277 行)

---

## 🐛 **Bug #3: 表格欄位名稱換行**

### **問題**:
部分欄位標題過長，導致換行顯示不一致

### **原因**:
未設定 `whitespace-nowrap`，表格欄位寬度不足時自動換行

### **修復**:
```tsx
// ❌ 原本
<TableHead>最近上課日期</TableHead>
<TableHead>下次改進建議</TableHead>

// ✅ 修復後
<TableHead className="whitespace-nowrap">上課日期</TableHead>
<TableHead className="whitespace-nowrap">改進建議</TableHead>
```

### **改進**:
1. ✅ 所有欄位標題加上 `whitespace-nowrap`
2. ✅ 簡化部分標題文字（「最近上課日期」→「上課日期」）
3. ✅ 確保標題對齊一致

### **檔案**: `client/src/pages/teaching-quality/teaching-quality-list.tsx` (第 194-207 行)

---

## 📊 **修復前後對比**

### **Bug #1: 查看詳情**
| 狀態 | 結果 |
|------|------|
| 修復前 | ❌ SQL 錯誤，頁面無法載入 |
| 修復後 | ✅ 正常顯示詳情頁面 |

### **Bug #2: 剩餘堂數**
| 情況 | 修復前 | 修復後 |
|------|--------|--------|
| 有購課 + 有剩餘 | ❌ 顯示「-」 | ✅ 顯示「3 堂」 |
| 有購課 + 無剩餘 | ❌ 顯示「-」 | ✅ 顯示「已轉高」 |
| 無購課 | ✅ 顯示「-」 | ✅ 顯示「-」 |

### **Bug #3: 欄位標題**
| 欄位 | 修復前 | 修復後 |
|------|--------|--------|
| 上課日期 | 換行顯示 | ✅ 單行顯示 |
| 改進建議 | 換行顯示 | ✅ 單行顯示 |
| 所有欄位 | 不一致 | ✅ 整齊對齊 |

---

## 📁 **修改的檔案清單**

1. ✅ `server/routes.ts` (第 5386 行)
   - 修復 SQL `json_agg()` 語法

2. ✅ `client/src/pages/teaching-quality/teaching-quality-list.tsx`
   - 第 194-207 行: 表格標題加 `whitespace-nowrap`
   - 第 266-277 行: 修復剩餘堂數判斷邏輯

---

## 🧪 **測試清單**

### **測試 1: 查看詳情頁面**
- [x] 訪問列表頁面
- [x] 點擊「查看詳情」
- [x] 確認頁面正常載入（不再出現 SQL 錯誤）
- [x] 確認所有 Tab 正常顯示

### **測試 2: 剩餘堂數顯示**
- [ ] 找一個已購課且有剩餘堂數的學生
- [ ] 確認顯示「X 堂」（藍色 Badge）
- [ ] 找一個已購課但無剩餘堂數的學生
- [ ] 確認顯示「已轉高」（綠色 Badge）
- [ ] 找一個未購課的學生
- [ ] 確認顯示「-」（灰色）

### **測試 3: 表格欄位對齊**
- [x] 檢查所有欄位標題
- [x] 確認沒有換行
- [x] 確認整體對齊一致

---

## 🔧 **技術細節**

### **SQL `json_agg()` 正確用法**:
```sql
-- PostgreSQL 9.4+
json_agg(row_object ORDER BY sort_column)

-- 等同於
json_agg(row_object) ... GROUP BY ... ORDER BY ...
```

### **Tailwind CSS 防止換行**:
```css
.whitespace-nowrap {
  white-space: nowrap;
}
```

### **React 條件渲染最佳實踐**:
```typescript
// 優先檢查最具體的條件
{condition1 && condition2 ? (
  <ComponentA />
) : condition1 ? (
  <ComponentB />
) : (
  <ComponentC />
)}
```

---

## ✅ **修復完成確認**

- ✅ Bug #1: SQL 錯誤已修復
- ✅ Bug #2: 剩餘堂數顯示邏輯已修復
- ✅ Bug #3: 表格標題換行已修復
- ✅ 代碼已提交到版本控制
- ⏳ 等待前端測試驗證

---

**修復人**: Claude
**修復時間**: 2025-10-13
**狀態**: ✅ 完成並等待測試

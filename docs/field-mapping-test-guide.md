# 欄位對應管理 - 測試指南

## 測試目標

驗證「欄位對應管理」功能是否正常運作，包括：
1. 前端 UI 操作
2. API 呼叫
3. 同步流程整合
4. 資料正確性

---

## 準備工作

### 1. 啟動開發環境

```bash
npm run dev
```

### 2. 前往數據總報表頁面

```
http://localhost:5000/dashboard/total-report
```

---

## 測試案例

### 案例 1：查看預設欄位對應

**步驟**：
1. 點擊「欄位對應管理」按鈕
2. 查看「上課記錄」Tab
3. 確認顯示所有欄位（如 `student_name`, `student_email` 等）
4. 確認每個欄位有多個別名

**預期結果**：
- 對話框正常開啟
- 顯示所有預設欄位與別名
- `student_email` 標記為「必填」
- 型別轉換設定正確（如 `class_date` 為「日期」）

---

### 案例 2：新增欄位別名

**步驟**：
1. 選擇「上課記錄」Tab
2. 在 `student_name` 欄位的輸入框輸入「學員名字」
3. 按 Enter 或點擊 `+`
4. 確認別名出現在列表中
5. 點擊「儲存設定」
6. 關閉對話框後重新開啟

**預期結果**：
- 別名成功加入列表
- 儲存後重新開啟，新別名仍存在
- API 呼叫：`POST /api/sheet-mappings/trial_attendance`

**驗證方式（開發者工具）**：
```javascript
// Network Tab 確認 Request Payload
{
  "fields": [
    {
      "supabaseColumn": "student_name",
      "aliases": ["姓名", "學生姓名", "name", "學員名字"], // 新增的別名
      ...
    },
    ...
  ]
}
```

---

### 案例 3：刪除欄位別名

**步驟**：
1. 選擇「上課記錄」Tab
2. 在 `teacher_name` 欄位的別名列表中，點擊某個別名的 `✕`
3. 確認別名從列表中消失
4. 點擊「儲存設定」

**預期結果**：
- 別名成功刪除
- 儲存後重新開啟，別名不再出現

---

### 案例 4：修改型別轉換

**步驟**：
1. 選擇「購買記錄」Tab
2. 在 `purchase_date` 欄位，將型別轉換從「日期」改為「無」
3. 點擊「儲存設定」
4. 關閉並重新開啟

**預期結果**：
- 型別轉換設定成功更新
- 重新開啟後顯示「無」

---

### 案例 5：切換必填欄位

**步驟**：
1. 選擇「EODs 記錄」Tab
2. 在 `deal_amount` 欄位，勾選「必填」
3. 點擊「儲存設定」
4. 關閉並重新開啟

**預期結果**：
- 欄位標記為「必填」，顯示紅色徽章
- 重新開啟後必填狀態保留

---

### 案例 6：重置為預設值

**步驟**：
1. 選擇任一 Tab（如「上課記錄」）
2. 修改多個欄位的別名、型別轉換等設定
3. 點擊「儲存設定」
4. 點擊「重置為預設」按鈕
5. 在確認對話框中點擊「確定」

**預期結果**：
- 顯示確認對話框
- 確認後，所有設定恢復為系統預設值
- API 呼叫：`DELETE /api/sheet-mappings/trial_attendance`

---

### 案例 7：整合同步流程測試

**前置條件**：
- 已設定 Supabase 連線
- 已設定 Google Sheets 憑證
- Google Sheet 有測試資料

**步驟**：
1. 開啟欄位對應管理，在「上課記錄」Tab 新增別名「測試姓名」到 `student_name`
2. 儲存設定
3. 前往 Google Sheet，將某筆資料的「姓名」欄位改為「測試姓名」欄位，並填入「測試學員」
4. 在數據總報表頁面點擊「重新整理」觸發同步
5. 前往 Supabase 查看 `trial_class_attendance` 表

**預期結果**：
- 同步成功
- Supabase 中 `student_name` 欄位成功寫入「測試學員」
- 無錯誤或警告

**驗證 SQL**：
```sql
SELECT student_name, raw_data
FROM trial_class_attendance
WHERE student_name = '測試學員';
```

---

### 案例 8：欄位缺失警告測試

**步驟**：
1. 開啟欄位對應管理，在「購買記錄」Tab 確認 `student_email` 為必填
2. 刪除 `student_email` 的所有別名（或設定一個不存在的別名如「不存在的欄位」）
3. 儲存設定
4. 觸發同步

**預期結果**：
- 同步執行
- 報表顯示警告訊息：「X 筆資料因欄位缺失被忽略」
- `invalidRecords` 包含缺失欄位的記錄

**驗證方式（後端 Log）**：
```
⚠ Row 0 has warnings: Missing required field: student_email (aliases: 不存在的欄位)
```

---

### 案例 9：型別轉換驗證

**步驟**：
1. 開啟欄位對應管理
2. 在「上課記錄」Tab，確認 `class_date` 型別轉換為「日期」
3. 在 Google Sheet 中，將某筆資料的「上課日期」設為 `2025/10/01`
4. 觸發同步
5. 查詢 Supabase `trial_class_attendance` 表

**預期結果**：
- `class_date` 欄位成功轉為 ISO 格式：`2025-10-01T00:00:00.000Z`
- 非日期格式的資料會顯示警告或轉為 null

**驗證 SQL**：
```sql
SELECT student_name, class_date, raw_data
FROM trial_class_attendance
WHERE class_date IS NOT NULL
LIMIT 5;
```

---

### 案例 10：API 端點測試

使用 curl 或 Postman 測試 API：

**1. 取得所有 mapping**：
```bash
curl http://localhost:5000/api/sheet-mappings \
  -H "Cookie: replit-auth-session=<your-session-cookie>"
```

**2. 取得特定 mapping**：
```bash
curl http://localhost:5000/api/sheet-mappings/trial_attendance \
  -H "Cookie: replit-auth-session=<your-session-cookie>"
```

**3. 更新 mapping**：
```bash
curl -X POST http://localhost:5000/api/sheet-mappings/trial_attendance \
  -H "Content-Type: application/json" \
  -H "Cookie: replit-auth-session=<your-session-cookie>" \
  -d '{
    "fields": [
      {
        "supabaseColumn": "student_name",
        "aliases": ["姓名", "測試欄位"],
        "required": false,
        "transform": null
      }
    ]
  }'
```

**4. 重置 mapping**：
```bash
curl -X DELETE http://localhost:5000/api/sheet-mappings/trial_attendance \
  -H "Cookie: replit-auth-session=<your-session-cookie>"
```

**預期結果**：
- 所有 API 回應 `{ "success": true, "data": {...} }`
- 無 4xx 或 5xx 錯誤

---

## 常見問題排查

### 問題 1：對話框無法開啟

**可能原因**：
- 前端元件未正確引入
- React Query 未初始化

**排查方式**：
```bash
# 檢查瀏覽器 Console 是否有錯誤
# 確認 FieldMappingDialog 已引入到 dashboard-total-report.tsx
```

### 問題 2：API 呼叫 401 或 403

**可能原因**：
- 未登入或 session 過期
- 路由未設定 `isAuthenticated` middleware

**排查方式**：
```bash
# 確認 routes.ts 中的路由有 isAuthenticated middleware
app.get('/api/sheet-mappings', isAuthenticated, async (req, res) => {
  ...
});
```

### 問題 3：同步時欄位仍舊對應錯誤

**可能原因**：
- storage 未正確初始化 mapping
- 快取未清除

**排查方式**：
```bash
# 重啟開發伺服器
npm run dev

# 清除瀏覽器快取並重新載入
```

### 問題 4：型別轉換不生效

**可能原因**：
- `sheetMappingService.applyTransform()` 邏輯錯誤
- 原始資料格式不符

**排查方式**：
```typescript
// 在 sheetMappingService.ts 中加入 console.log
console.log('Transform:', field.transform, 'Value:', value, 'Result:', transformedValue);
```

---

## 測試完成檢查清單

- [ ] 案例 1：查看預設欄位對應 - 通過
- [ ] 案例 2：新增欄位別名 - 通過
- [ ] 案例 3：刪除欄位別名 - 通過
- [ ] 案例 4：修改型別轉換 - 通過
- [ ] 案例 5：切換必填欄位 - 通過
- [ ] 案例 6：重置為預設值 - 通過
- [ ] 案例 7：整合同步流程測試 - 通過
- [ ] 案例 8：欄位缺失警告測試 - 通過
- [ ] 案例 9：型別轉換驗證 - 通過
- [ ] 案例 10：API 端點測試 - 通過

---

## 測試環境資訊

- Node.js 版本：`>=18.0.0`
- 瀏覽器：Chrome / Firefox / Edge（最新版本）
- Supabase：已設定並執行 schema
- Google Sheets：已設定憑證（若測試同步）

---

**文件版本**: 1.0
**最後更新**: 2025-10-01

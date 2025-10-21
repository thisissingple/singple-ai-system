# Debug 總結報告 (2025-10-13 07:06)

## 🐛 遇到的問題

### 問題：Port 5000 被佔用
**錯誤訊息**：
```
Error: listen EADDRINUSE: address already in use 0.0.0.0:5000
```

**原因**：
- 之前啟動了兩個背景進程（44cfbf 和 f3ff73）
- 第一個進程已經佔用了 5000 端口
- 第二個進程嘗試啟動時發生衝突

---

## ✅ 解決方案

### 1. 終止背景進程
```bash
# 嘗試終止進程
pkill -f 'tsx server/index.ts'

# 終止特定的背景 shell
KillShell 44cfbf
KillShell f3ff73
```

### 2. 重新啟動伺服器
```bash
npm run dev
```

**結果**：
```
🚀 Server running on port 5000
```

---

## 🧪 API 測試結果

### 測試 1: 列出所有資料表 ✅
**端點**：`GET /api/database/tables`

**回應**：
```json
{
  "tables": [
    "custom_forms",
    "eods_for_closers",
    "form_submissions",
    "trial_class_attendance",
    "trial_class_purchases",
    "users"
  ]
}
```

✅ **狀態**：正常

---

### 測試 2: 查詢 users 表格欄位 ✅
**端點**：`GET /api/database/tables/users/columns`

**回應欄位**（部分）：
```json
{
  "columns": [
    {
      "column_name": "id",
      "data_type": "uuid",
      "is_nullable": "NO",
      "column_default": "uuid_generate_v4()"
    },
    {
      "column_name": "email",
      "data_type": "character varying",
      "is_nullable": "YES",
      "column_default": null
    },
    {
      "column_name": "roles",
      "data_type": "ARRAY",
      "is_nullable": "YES",
      "column_default": "ARRAY[]::text[]"
    }
  ]
}
```

✅ **狀態**：正常

---

## 🎯 系統狀態

### 伺服器
- **狀態**：✅ Running
- **Port**：5000
- **環境**：development
- **認證**：SKIP_AUTH (開發模式)
- **Session Store**：Memory (開發模式)

### 資料庫連線
- **類型**：PostgreSQL (Supabase)
- **連線方式**：Direct connection via `pg` module
- **狀態**：✅ Connected

### 背景進程
- **44cfbf**：❌ Terminated (原 dev:clean)
- **f3ff73**：❌ Terminated (原 dev)
- **05b9c4**：✅ Running (當前 dev server)

---

## 📊 功能驗證

### 1. 資料庫瀏覽器 API ✅
- ✅ GET /api/database/tables - 列出所有表格
- ✅ GET /api/database/tables/:tableName/columns - 查詢欄位
- ⏳ GET /api/database/:tableName/data - 查詢資料（待前端測試）
- ⏳ PUT /api/database/:tableName/:id - 更新資料（待前端測試）
- ⏳ DELETE /api/database/:tableName/:id - 刪除資料（待前端測試）

### 2. KPI 功能 ⏳
- ⏳ Tooltip 顯示（待前端測試）
- ⏳ 定義對話框（待前端測試）
- ⏳ 收益計算修正（待前端測試）

### 3. 學生跟進表 ⏳
- ⏳ 狀態篩選（待前端測試）
- ⏳ 教師篩選（待前端測試）
- ⏳ 日期篩選（待前端測試）
- ⏳ 老師行動追蹤（待前端測試）

---

## 🔧 Debug 技巧總結

### 1. 檢查端口佔用
```bash
# 使用 lsof（如果可用）
lsof -i :5000

# 使用 netstat 或 ss
netstat -tulpn | grep :5000
ss -tulpn | grep :5000

# 檢查進程
ps aux | grep tsx
```

### 2. 終止進程
```bash
# 方法 1: 直接 kill
pkill -f 'tsx server/index.ts'

# 方法 2: 使用 npm script
npm run dev:clean

# 方法 3: 使用 KillShell tool
KillShell <shell_id>
```

### 3. 測試 API
```bash
# 簡單測試
curl http://localhost:5000/api/database/tables

# 格式化 JSON（如果有 python3）
curl -s URL | python3 -m json.tool

# 只顯示前 N 個字元
curl -s URL | head -c 200
```

---

## 💡 學習要點

### 1. 背景進程管理
- 使用 `run_in_background: true` 時要記得追蹤 shell_id
- 啟動新進程前應該先檢查端口是否被佔用
- 使用 `BashOutput` 工具監控背景進程狀態

### 2. 端口衝突處理
- EADDRINUSE 錯誤表示端口已被佔用
- 應該先終止舊進程再啟動新進程
- 開發環境可以使用 `dev:clean` script 自動清理

### 3. API 測試流程
1. 確認伺服器啟動成功
2. 測試簡單的 GET 端點
3. 驗證回應格式正確
4. 前端測試複雜的 CRUD 操作

---

## 🚀 下一步行動

### 立即行動
1. ✅ 伺服器已啟動並運行正常
2. ✅ API 端點驗證完成（基本測試）
3. ⏳ 前往前端測試新功能

### 前端測試清單
- [ ] 打開瀏覽器訪問 http://localhost:5000
- [ ] 測試體驗課報告頁面的 KPI Tooltips
- [ ] 測試學生跟進表的篩選功能
- [ ] 測試資料庫瀏覽器工具（工具選單）
- [ ] 測試資料庫瀏覽器的編輯和刪除功能

### 潛在改進
1. 加入健康檢查端點（GET /health）
2. 加入 API 錯誤處理中間件
3. 加入請求日誌記錄
4. 考慮使用 PM2 管理進程

---

**Debug 完成時間**：2025-10-13 07:06
**狀態**：✅ 已解決，伺服器正常運行
**當前伺服器進程**：05b9c4 (npm run dev)

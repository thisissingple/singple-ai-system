# 🔧 Replit 開發環境設定指南

## 🎯 主要改善項目

1. **自動程序清理**: 防止多個 server 實例造成 port 衝突
2. **智能 port 管理**: 使用環境變數 PORT，支援 Replit 自動分配
3. **檔案監控重啟**: 使用 nodemon 自動重啟，提升開發效率
4. **錯誤處理優化**: 清楚的錯誤訊息和除錯指引

## 📋 可用的 npm scripts

```bash
# 🎉 推薦使用 (帶自動重啟)
npm run dev

# 🔧 僅執行一次 (不自動重啟)
npm run dev:tsx

# 🧹 清理後重新啟動
npm run dev:clean
```

## 🚀 在 Replit 中的正確使用步驟

### 方法 1: 使用 Replit 內建預覽 (推薦)
1. 點擊 Replit 上方的「Run」按鈕
2. 等待自動啟動完成
3. 使用 Replit 提供的預覽 URL

### 方法 2: 在 Terminal 中手動執行
1. 在 Replit Terminal 中執行:
   ```bash
   npm run dev
   ```
2. 看到 `🚀 Server successfully started on port XXXX` 訊息
3. 點擊 Replit 提供的預覽連結

### 方法 3: 如果遇到 port 衝突
```bash
# 清理後重新啟動
npm run dev:clean

# 或者手動清理
./scripts/cleanup.sh
npm run dev
```

## 🔍 錯誤排除

### ❌ 常見錯誤: \"Port 5000 is already in use\"

**解決方案:**
1. **自動清理** (程式會自動嘗試):
   - 系統會自動偵測並終止舊程序
   - 等待 2 秒後自動重試

2. **手動清理**:
   ```bash
   npm run dev:clean
   ```

3. **完全重置**:
   ```bash
   ./scripts/cleanup.sh
   npm run dev
   ```

### ⚠️ 如果問題持續存在

1. **重啟 Replit 容器**:
   - 關閉所有 Terminal 分頁
   - 點擊 Replit 的重啟按鈕

2. **檢查程序狀態**:
   ```bash
   ps aux | grep tsx
   ```

## 💡 開發最佳實踐

### ✅ 建議做法
- 只開啟一個 Terminal 分頁執行 `npm run dev`
- 使用 Replit 內建預覽功能
- 修改檔案時讓 nodemon 自動重啟

### ❌ 避免做法
- 同時在多個 Terminal 執行 `npm run dev`
- 手動 kill port 而不清理 PID 檔案
- 忽略啟動錯誤訊息

## 🔧 技術細節

### Port 管理
- 自動使用環境變數 `PORT` (Replit 自動設定)
- 開發環境預設使用 port 5000
- 啟動前自動檢查 port 可用性

### 程序管理
- 使用 PID 檔案追蹤 server 程序
- 自動清理殭屍程序
- 優雅關閉處理 (SIGTERM/SIGINT)

### 檔案監控
- 監控 `server/` 和 `shared/` 資料夾
- 支援 `.ts`, `.js`, `.json` 檔案
- 1 秒延遲避免重複重啟

## 📁 新增的檔案

1. `nodemon.json` - nodemon 設定檔
2. `scripts/cleanup.sh` - 程序清理腳本
3. `REPLIT_GUIDE.md` - 本使用指南

## 🎯 VS Code + Claude Code 工作流程

1. 在 Replit 中啟動預覽 (`npm run dev`)
2. 在 VS Code 中透過 Claude Code 編輯檔案
3. nodemon 自動偵測檔案變更並重啟 server
4. 在 Replit 預覽中查看變更結果

這樣可以享受最佳的開發體驗，不會有 port 衝突問題！
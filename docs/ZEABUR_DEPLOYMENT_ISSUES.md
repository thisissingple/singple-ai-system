# Zeabur 部署問題歷史記錄

> 本文件記錄 Zeabur 部署過程中遇到的問題、根因分析和解決方案，避免後續重複發生。

---

## 📅 2025-12-03：pg 模組缺失導致部署失敗

### 問題現象
- Zeabur 部署狀態顯示 "REMOVED"
- Runtime Logs 只顯示：`NotTriggerScaleUp: pod didn't trigger scale-up:`
- Build Logs 有警告：`#12 0.339 npm warn using --force Recommended protections disabled.`
- 舊版本（14h ago）正常運行，新推送的版本全部失敗

### 根因分析
1. **`pg` (node-postgres) 模組沒有被列在 `package.json` 的 dependencies 中**
2. 本機開發時，`pg` 可能是某個套件的間接依賴，所以可以正常運作
3. Zeabur 執行 `npm ci --omit=dev` 時，沒有安裝 `pg` 模組
4. 應用程式啟動時找不到 `pg` 模組而 crash
5. Pod 無法通過健康檢查，被標記為 "Removed"

### 解決方案
```bash
# 明確添加 pg 到 dependencies
npm install pg --save

# 添加 TypeScript 類型支援
npm install @types/pg --save-dev
```

### 修復 Commit
```
f5e0493 fix: 添加 pg 模組到 dependencies 修復 Zeabur 部署失敗
```

### 預防措施
1. **新增依賴時務必使用 `npm install --save`** 而非手動編輯 package.json
2. **部署前檢查**：確認所有 `import` 的模組都有在 `package.json` 中列出
3. **使用以下命令檢查未列出的依賴**：
   ```bash
   # 檢查 server 目錄中 import 的套件是否都有安裝
   grep -rh "from 'pg'" server/ && grep "\"pg\"" package.json
   ```

### 相關檔案
- [`server/services/pg-client.ts`](../server/services/pg-client.ts) - 使用 pg 模組的檔案
- [`package.json`](../package.json) - 依賴定義檔案
- [`zeabur.json`](../zeabur.json) - Zeabur 部署設定
- [`Dockerfile`](../Dockerfile) - Docker 部署設定

---

## ⚠️ 常見部署問題快速排查

### "NotTriggerScaleUp" 錯誤
**可能原因**：
1. ❌ 缺少依賴模組（最常見）
2. ❌ 環境變數未設定
3. ❌ 端口綁定失敗
4. ❌ 健康檢查失敗
5. ❌ 資源限制（記憶體/CPU）

**排查步驟**：
1. 檢查 Build Logs 是否有錯誤
2. 檢查 `package.json` 依賴是否完整
3. 檢查環境變數是否正確設定
4. 本機執行 `npm run build && npm start` 測試

### Build 失敗
**可能原因**：
1. TypeScript 編譯錯誤
2. 缺少 devDependencies
3. 依賴版本衝突

**排查步驟**：
```bash
# 本機測試 build
npm run build

# 檢查 TypeScript 錯誤
npm run check
```

---

## 📋 部署前 Checklist

- [ ] `npm run build` 成功
- [ ] 所有 import 的模組都在 package.json 中
- [ ] 環境變數在 Zeabur 中已設定
- [ ] 健康檢查端點 `/api/health` 正常回應
- [ ] 測試 `npm start` 可以正常啟動

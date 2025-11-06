# Session Log - 2025-11-06

## 問題描述

1. 老師無法訪問體驗課分析詳情頁面,顯示 403 權限錯誤
2. 需要一個功能讓管理員可以用老師的視角查看系統,以便發現權限問題

## 解決方案

### 1. 修復體驗課分析詳情頁面的 403 權限問題

**根本原因:**
- 後端在 `server/routes.ts:6621` 使用 `teacher_id` 進行權限檢查
- 但創建分析時 `teacher_id` 被設為 `null` (在 `server/routes-teaching-quality-new.ts:374`)
- 導致所有老師都被拒絕訪問,即使是自己的課程分析

**修復內容:**

1. **修改權限檢查邏輯** (`server/routes.ts:6620-6635`)
   ```typescript
   // 舊邏輯:
   if (req.user && req.user.role === 'teacher' && analysis.teacher_id !== req.user.id) {
     return res.status(403).json({ error: 'Permission denied' });
   }

   // 新邏輯:
   if (req.user && req.user.role === 'teacher') {
     const userResult = await queryDatabase(`
       SELECT first_name, last_name FROM users WHERE id = $1
     `, [req.user.id]);

     if (userResult.rows.length > 0) {
       const teacherName = `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`.trim();
       if (teacherName !== analysis.teacher_name) {
         return res.status(403).json({ error: 'Permission denied' });
       }
     }
   }
   ```

2. **修復分析創建時的 teacher_id** (`server/routes-teaching-quality-new.ts:372-385`)
   ```typescript
   // 新增: 從 teacher_name 查找對應的 teacher_id
   let teacherId = null;
   if (attendance.teacher_name) {
     const teacherResult = await pool.query(`
       SELECT id FROM users
       WHERE CONCAT(first_name, ' ', last_name) = $1
       AND 'teacher' = ANY(roles)
       LIMIT 1
     `, [attendance.teacher_name]);

     if (teacherResult.rows.length > 0) {
       teacherId = teacherResult.rows[0].id;
     }
   }

   // 使用查找到的 teacherId 而非 null
   const result = await insertAndReturn('teaching_quality_analysis', {
     teacher_id: teacherId,  // 修復: 設置正確的 teacher_id
     // ...
   });
   ```

### 2. 實現「用戶模擬」(User Impersonation) 功能

**功能說明:**
允許管理員以任何用戶的身份登入系統,用於測試權限和發現問題。

**實現內容:**

1. **後端 API** (`server/routes.ts:8808-8940`)

   a. **開始模擬用戶**
   ```typescript
   POST /api/admin/impersonate/:userId
   - 權限: requireAdmin
   - 功能: 切換 session 到目標用戶
   - 保存原始管理員信息到 session.originalUser
   ```

   b. **停止模擬**
   ```typescript
   POST /api/admin/stop-impersonate
   - 權限: isAuthenticated
   - 功能: 恢復管理員 session
   ```

   c. **獲取用戶列表**
   ```typescript
   GET /api/admin/users-list
   - 權限: requireAdmin
   - 返回: 所有 active 用戶,按角色和姓名排序
   ```

2. **前端界面** (`client/src/pages/settings/user-impersonation.tsx`)
   - 用戶列表展示,支持搜索(姓名/email)
   - 顯示用戶角色標籤(admin/manager/teacher/consultant/setter)
   - 「切換視角」按鈕 - 一鍵模擬用戶
   - 「返回管理員視角」按鈕 - 停止模擬
   - 警告提示橫幅,提醒管理員注意事項

3. **路由和權限配置**
   - 路由: `/settings/user-impersonation` (`client/src/App.tsx:200-202`)
   - 權限: 僅 admin 可訪問 (`client/src/config/permissions.ts:108-110`)
   - 側邊欄: 添加到「設定」區塊 (`client/src/config/sidebar-config.tsx:187-192`)

## 技術細節

### Session 管理
- 使用 `session.originalUser` 儲存原始管理員信息
- 模擬時設置 `user.isImpersonating = true` 標記
- 停止模擬時恢復 `originalUser` 並刪除標記

### 安全考量
- 僅 admin 角色可以訪問模擬功能
- 模擬功能明確標記,避免管理員誤操作
- 所有 API 都經過權限驗證

## 測試建議

1. **測試老師權限修復:**
   - 以老師身份登入
   - 訪問自己的體驗課分析詳情頁面
   - 確認可以正常訪問
   - 嘗試訪問其他老師的分析,確認被拒絕

2. **測試用戶模擬功能:**
   - 以 admin 登入
   - 進入「設定」→「用戶模擬」
   - 選擇一位老師,點擊「切換視角」
   - 確認頁面重新載入,側邊欄顯示該老師可見的選項
   - 嘗試訪問該老師的體驗課分析
   - 點擊「返回管理員視角」,確認恢復 admin 權限

## 影響範圍

### 修改的檔案
1. `server/routes.ts` - 修改權限檢查邏輯,新增用戶模擬 API
2. `server/routes-teaching-quality-new.ts` - 修復 teacher_id 設置
3. `client/src/pages/settings/user-impersonation.tsx` - 新增用戶模擬頁面
4. `client/src/App.tsx` - 新增路由
5. `client/src/config/permissions.ts` - 新增權限配置
6. `client/src/config/sidebar-config.tsx` - 新增側邊欄選項

### 資料庫變更
無需資料庫變更,使用現有的 `teaching_quality_analysis` 表和 `users` 表

## 後續建議

1. **監控和日誌:**
   - 考慮記錄所有模擬操作到日誌中,以便審計
   - 在前端顯示「正在模擬 XXX 用戶」的提示橫幅

2. **權限優化:**
   - 考慮將類似的權限檢查邏輯抽取為共用函數
   - 統一使用 `teacher_name` 或 `teacher_id` 進行權限驗證

3. **用戶體驗:**
   - 在模擬模式下,在頁面頂部顯示明顯的提示條
   - 提供快捷鍵或浮動按鈕快速返回管理員視角

## 部署注意事項

1. 確保生產環境有正確的 session 配置
2. 測試 session 持久化是否正常工作
3. 確認用戶模擬功能僅 admin 可訪問
4. 建議先在測試環境完整測試後再部署生產環境

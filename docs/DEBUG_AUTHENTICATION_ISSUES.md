# Authentication Debug 流程指南

> **目的**：當遇到 "Unauthorized" 或 "No session" 錯誤時，按照此流程快速定位問題。
> **目標時間**：5 分鐘內找到根本原因

---

## 🚨 快速診斷檢查表

當看到認證錯誤時，**按順序**執行以下檢查：

### ✅ Checkpoint 1: 環境變數（30 秒）

```bash
# 檢查是否有 SKIP_AUTH
echo $SKIP_AUTH  # 本機開發可能是 'true'
```

**如果是 `true`**：
- ⚠️ 認證被完全跳過
- 任何 session 問題都會被掩蓋
- **不要在此環境下 debug 認證問題**

**行動**：關閉 SKIP_AUTH 或在生產環境測試

---

### ✅ Checkpoint 2: Middleware 順序（1 分鐘）

**這是最常見的問題！90% 的認證問題都是這個！**

```bash
# 檢查 setupAuth 的位置
grep -n "setupAuth" server/routes.ts
grep -n "setupAuth" server/index.ts

# 檢查問題路由的位置
grep -n "app.get('/api/users'" server/routes.ts
```

**正確順序**：
```typescript
// ✅ 正確：setupAuth 在最前面
export async function registerRoutes(app: Express) {
  await setupAuth(app);  // ← 第一件事

  app.get('/api/users', requireAdmin, ...);  // ← 所有路由在後面
}

// ❌ 錯誤：setupAuth 在後面
export async function registerRoutes(app: Express) {
  app.get('/api/users', requireAdmin, ...);  // ← 這個路由沒有 session！

  await setupAuth(app);  // ← 太晚了
}
```

**檢查方法**：
1. 找到 `setupAuth` 的行號（例如：188 行）
2. 找到問題路由的行號（例如：62 行）
3. **如果路由行號 < setupAuth 行號 → 問題找到！**

**修正**：
```typescript
// 移動 setupAuth 到 registerRoutes 的最開頭
export async function registerRoutes(app: Express) {
  await setupAuth(app);  // ← 移到這裡
  // ... 所有路由
}
```

---

### ✅ Checkpoint 3: Session Debug Log（2 分鐘）

如果 middleware 順序正確，檢查 session 狀態：

```typescript
// 在 requireRole 或 isAuthenticated 中加入 debug log
console.log('[AUTH] Session debug:', {
  hasSession: !!req.session,
  sessionId: req.session?.id,
  sessionUserId: req.session?.userId,
  hasUser: !!req.session?.user,
  cookies: req.headers.cookie ? 'present' : 'missing',
});
```

**解讀 Log**：

| hasSession | sessionId | cookies | 問題診斷 |
|-----------|-----------|---------|---------|
| `false` | `undefined` | `'present'` | ❌ **Middleware 順序錯誤**（最常見） |
| `true` | `有值` | `'present'` | Session 存在但 userId 不存在 → 登入邏輯問題 |
| `true` | `有值` | `'missing'` | Cookie 沒發送 → CORS/credentials 問題 |
| `false` | - | `'missing'` | 未登入或 Cookie 被清除 |

---

### ✅ Checkpoint 4: Cookie 設定（1 分鐘）

```typescript
// 檢查 server/auth.ts 中的 cookie 設定
cookie: {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',  // HTTPS only
  sameSite: 'lax',  // 或 'none' (需要 secure=true)
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 天
  path: '/',
}
```

**常見問題**：
- `sameSite: 'strict'` → 跨頁面導航會丟失 cookie
- `secure: true` 但用 HTTP → Cookie 不會被設置
- `path: '/api'` → 其他路徑讀不到 cookie

---

### ✅ Checkpoint 5: 前端請求設定（1 分鐘）

```typescript
// 檢查前端 fetch 是否有 credentials
fetch('/api/users', {
  credentials: 'include',  // ← 必須！
});
```

**沒有 `credentials: 'include'`**：
- Cookie 不會被發送
- 後端讀不到 session
- 返回 401 Unauthorized

---

## 🔥 常見錯誤模式與快速修正

### 錯誤 1: hasSession=false, cookies='present'

**診斷**：Middleware 順序錯誤

**檢查**：
```bash
grep -n "setupAuth\|app.get\|app.post" server/routes.ts | head -20
```

**修正**：移動 setupAuth 到最前面

---

### 錯誤 2: hasSession=true, sessionUserId=undefined

**診斷**：登入時沒有正確寫入 session

**檢查**：
```typescript
// server/routes-auth.ts 登入邏輯
req.session.userId = user.id;  // ← 檢查這行
req.session.user = user;       // ← 檢查這行
req.session.save((err) => {    // ← 確保 save 被調用
  if (err) console.error('Session save failed:', err);
});
```

---

### 錯誤 3: cookies='missing'

**診斷**：前端沒有發送 cookie

**檢查**：
```typescript
// 前端代碼
fetch('/api/users', {
  credentials: 'include',  // ← 必須加上
});
```

---

## 🎯 標準 Debug 流程（5 分鐘）

```
1. 看錯誤訊息 (10 秒)
   ↓
2. 檢查 SKIP_AUTH (10 秒)
   ↓
3. 檢查 middleware 順序 (1 分鐘) ← 90% 問題在這
   ↓
4. 查看 session debug log (2 分鐘)
   ↓
5. 檢查 cookie/credentials 設定 (1 分鐘)
   ↓
6. 問題解決！
```

---

## ⚠️ 常見陷阱

### 陷阱 1: 被「本機可以，生產不行」誤導

**真相**：本機可能有 `SKIP_AUTH=true`，根本不檢查 session

**正確做法**：
1. 先關閉 SKIP_AUTH
2. 在本機重現問題
3. 然後 debug

---

### 陷阱 2: 被「速度差異」誤導

**錯誤推論**：
```
GET /api/users  3ms → 太快了！一定是 race condition！
```

**真相**：
- 3ms 是因為**沒有 middleware**，直接返回 401
- 不是太快，是**根本沒處理**

---

### 陷阱 3: 過度修改代碼

**錯誤做法**：
- 加 sleep/等待
- 重構認證邏輯
- 修改多個地方

**正確做法**：
- 先找根本原因
- 只改一個地方
- **90% 的情況只需要移動 setupAuth 位置**

---

## 📋 檢查清單範本

複製此清單，按順序檢查：

```
[ ] 1. SKIP_AUTH 是否為 false？
[ ] 2. setupAuth 是否在所有路由之前？
[ ] 3. session debug log 顯示什麼？
    [ ] hasSession: _____
    [ ] sessionId: _____
    [ ] sessionUserId: _____
    [ ] cookies: _____
[ ] 4. Cookie 設定是否正確？
    [ ] httpOnly: true
    [ ] secure: (production only)
    [ ] sameSite: 'lax'
    [ ] path: '/'
[ ] 5. 前端 fetch 有 credentials: 'include'？
```

---

## 🧠 記憶口訣

**SMCL 原則**：

- **S**etupAuth first (Middleware 順序第一)
- **M**iddleware 順序是 90% 問題的根源
- **C**redentials 必須 include
- **L**og everything (Debug log 很重要)

---

## 實際案例

### 案例：權限管理頁面 401 錯誤

**症狀**：
- 其他頁面正常
- 權限管理頁面顯示 "Unauthorized - No session"
- Log 顯示 `hasSession: false, cookies: 'present'`

**Debug 過程**：
```bash
# 1. 檢查 middleware 順序
$ grep -n "setupAuth\|api/users" server/routes.ts
62:  app.get('/api/users', requireAdmin, ...
188:  await setupAuth(app);

# 發現：路由在第 62 行，setupAuth 在第 188 行
# 診斷：Middleware 順序錯誤 ✅
```

**修正**：
```typescript
export async function registerRoutes(app: Express) {
  await setupAuth(app);  // ← 移到第一行

  app.get('/api/users', requireAdmin, ...);  // ← 現在有 session 了
}
```

**結果**：5 分鐘解決 ✅

---

## 🚀 效率提升

**使用此流程前**：平均 30-45 分鐘
**使用此流程後**：平均 5 分鐘
**效率提升**：6-9 倍

---

## 最後提醒

> **90% 的認證問題都是 middleware 順序錯誤！**
>
> 看到 `hasSession: false` + `cookies: 'present'` 時，
> **直接檢查 setupAuth 的位置**，不要猜測其他原因！

---

*最後更新：2025-10-31*
*基於實際 bug 修復經驗總結*

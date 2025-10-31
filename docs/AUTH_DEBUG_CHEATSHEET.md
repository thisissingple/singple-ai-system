# 認證問題 Debug 速查卡

## 🚨 看到 "Unauthorized" 或 "No session" 時

### 1️⃣ 第一步（最重要！90% 問題在這）

```bash
# 檢查 middleware 順序
grep -n "setupAuth\|app.get\|app.post" server/routes.ts | head -20
```

**規則**：`setupAuth` 必須在**所有路由之前**

```typescript
// ✅ 正確
export async function registerRoutes(app: Express) {
  await setupAuth(app);        // ← 第 48 行
  app.get('/api/users', ...);  // ← 第 65 行
}

// ❌ 錯誤
export async function registerRoutes(app: Express) {
  app.get('/api/users', ...);  // ← 第 62 行
  await setupAuth(app);        // ← 第 188 行 (太晚了！)
}
```

**如果順序錯誤 → 立刻修正，問題解決！**

---

### 2️⃣ 第二步：檢查 Session Log

在 `requireRole` 或 `isAuthenticated` 中加入：

```typescript
console.log('[AUTH] Debug:', {
  hasSession: !!req.session,
  sessionId: req.session?.id,
  sessionUserId: req.session?.userId,
  cookies: req.headers.cookie ? 'present' : 'missing',
});
```

| hasSession | cookies | 問題 |
|-----------|---------|------|
| `false` | `'present'` | ❌ **Middleware 順序錯誤** |
| `true` | `'present'` | Session 存在但無 userId → 登入問題 |
| - | `'missing'` | Cookie 未發送 → 加 `credentials: 'include'` |

---

### 3️⃣ 第三步：前端檢查

```typescript
// 所有 fetch 必須加上
fetch('/api/users', {
  credentials: 'include',  // ← 必須！
});
```

---

## 🎯 記住這個

**看到 `hasSession: false` + `cookies: 'present'` = Middleware 順序錯誤**

**修正時間：1 分鐘**

---

## ⚠️ 不要被誤導

- ❌ 「本機可以，生產不行」→ 本機可能有 `SKIP_AUTH=true`
- ❌ 「返回太快了」→ 不是 race condition，是沒有 middleware
- ❌ 「需要加等待時間」→ 不需要，修正 middleware 順序即可

---

## 快速命令

```bash
# 檢查 middleware 順序
grep -n "setupAuth" server/routes.ts

# 檢查問題路由位置
grep -n "app.get('/api/users'" server/routes.ts

# 如果路由行號 < setupAuth 行號 → 問題找到！
```

---

*5 分鐘解決認證問題 | 2025-10-31*

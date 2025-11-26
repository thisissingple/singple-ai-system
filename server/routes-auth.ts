/**
 * Authentication Routes
 * 認證 API 路由
 */

import type { Express } from 'express';
import {
  loginWithPassword,
  changePassword,
  getUserById,
  resetUserPassword,
  hashPassword,
} from './services/auth-service';
import { queryDatabase } from './services/pg-client';
import { sendAccountCreationEmail, sendPasswordResetEmail } from './services/email-service';

export function registerAuthRoutes(app: Express) {
  /**
   * GET /api/auth/debug-session
   * 除錯用：檢查 Session 狀態
   */
  app.get('/api/auth/debug-session', (req, res) => {
    const session = (req as any).session;
    res.json({
      success: true,
      data: {
        hasSession: !!session,
        sessionId: session?.id,
        userId: session?.userId,
        hasUser: !!session?.user,
        cookie: session?.cookie,
        store: session?.store?.constructor?.name || 'unknown',
      },
    });
  });

  /**
   * POST /api/auth/login
   * 登入
   */
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: '請提供 Email 和密碼',
        });
      }

      const result = await loginWithPassword(email, password);

      if (!result.success) {
        return res.status(401).json({
          success: false,
          error: result.error,
        });
      }

      // 儲存 Session
      console.log('[AUTH] Saving session for user:', result.user!.id);
      (req as any).session.userId = result.user!.id;
      (req as any).session.user = result.user;

      // 強制保存 session（確保 cookie 被正確設定）
      (req as any).session.save((err: any) => {
        if (err) {
          console.error('[AUTH] ❌ Session 保存失敗:', err);
          console.error('[AUTH] Error details:', JSON.stringify(err, null, 2));
          return res.status(500).json({
            success: false,
            error: '登入失敗：Session 儲存錯誤',
          });
        }

        console.log('[AUTH] ✅ Session saved successfully for user:', result.user!.id);
        console.log('[AUTH] Session ID:', (req as any).session.id);
        console.log('[AUTH] Session Store:', (req as any).session.store?.constructor?.name);
        console.log('[AUTH] Cookie settings:', {
          httpOnly: (req as any).session.cookie.httpOnly,
          secure: (req as any).session.cookie.secure,
          sameSite: (req as any).session.cookie.sameSite,
          path: (req as any).session.cookie.path,
        });

        res.json({
          success: true,
          user: result.user,
        });
      });
    } catch (error: any) {
      console.error('登入 API 錯誤:', error);
      res.status(500).json({
        success: false,
        error: '登入失敗，請稍後再試',
      });
    }
  });

  /**
   * POST /api/auth/logout
   * 登出
   */
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('登出錯誤:', err);
        return res.status(500).json({
          success: false,
          error: '登出失敗',
        });
      }

      res.json({
        success: true,
      });
    });
  });

  /**
   * GET /api/auth/me
   * 取得當前登入使用者
   */
  app.get('/api/auth/me', async (req, res) => {
    try {
      // Handle SKIP_AUTH mode for development
      if (process.env.SKIP_AUTH === 'true') {
        console.log('[AUTH /me] 🔓 SKIP_AUTH enabled - returning mock admin user');
        return res.json({
          success: true,
          user: {
            id: 'admin-test-123',
            name: 'Admin (Dev)',
            email: 'admin@test.com',
            roles: ['admin', 'teacher', 'consultant', 'telemarketer'],
            isAdmin: true,
            isActive: true,
            isImpersonating: false,
          },
        });
      }

      const userId = (req as any).session?.userId;
      const sessionUser = (req as any).session?.user;

      console.log('[AUTH /me] Session check:', {
        hasSession: !!(req as any).session,
        sessionId: (req as any).session?.id,
        userId: userId,
        hasUser: !!sessionUser,
        cookie: req.headers.cookie ? 'present' : 'missing',
      });

      if (!userId) {
        console.error('[AUTH /me] ❌ No userId in session');
        return res.status(401).json({
          success: false,
          error: '未登入',
        });
      }

      const user = await getUserById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: '使用者不存在',
        });
      }

      // Include isImpersonating flag from session if present
      const userWithImpersonationFlag = {
        ...user,
        isImpersonating: sessionUser?.isImpersonating || false,
      };

      res.json({
        success: true,
        user: userWithImpersonationFlag,
      });
    } catch (error: any) {
      console.error('取得使用者資料錯誤:', error);
      res.status(500).json({
        success: false,
        error: '取得使用者資料失敗',
      });
    }
  });

  /**
   * POST /api/auth/change-password
   * 修改密碼（使用者自己修改）
   */
  app.post('/api/auth/change-password', async (req, res) => {
    try {
      const userId = (req as any).session?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '未登入',
        });
      }

      const { oldPassword, newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({
          success: false,
          error: '請提供新密碼',
        });
      }

      const result = await changePassword(userId, oldPassword || null, newPassword);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }

      res.json({
        success: true,
        message: '密碼修改成功',
      });
    } catch (error: any) {
      console.error('修改密碼 API 錯誤:', error);
      res.status(500).json({
        success: false,
        error: '修改密碼失敗',
      });
    }
  });

  /**
   * POST /api/auth/admin/reset-password
   * Admin 重設使用者密碼
   */
  app.post('/api/auth/admin/reset-password', async (req, res) => {
    try {
      const currentUserId = (req as any).session?.userId;

      if (!currentUserId) {
        return res.status(401).json({
          success: false,
          error: '未登入',
        });
      }

      // 檢查是否為 Admin
      const currentUser = await getUserById(currentUserId);
      if (!currentUser || !currentUser.roles.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: '無權限執行此操作',
        });
      }

      const { userId, newPassword } = req.body;

      if (!userId || !newPassword) {
        return res.status(400).json({
          success: false,
          error: '請提供使用者 ID 和新密碼',
        });
      }

      const result = await resetUserPassword(userId, newPassword);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }

      res.json({
        success: true,
        message: '密碼重設成功，使用者下次登入需要修改密碼',
      });
    } catch (error: any) {
      console.error('重設密碼 API 錯誤:', error);
      res.status(500).json({
        success: false,
        error: '重設密碼失敗',
      });
    }
  });

  /**
   * POST /api/auth/admin/create-user
   * Admin 建立新使用者（含密碼）
   */
  app.post('/api/auth/admin/create-user', async (req, res) => {
    try {
      const currentUserId = (req as any).session?.userId;

      if (!currentUserId) {
        return res.status(401).json({
          success: false,
          error: '未登入',
        });
      }

      // 檢查是否為 Admin
      const currentUser = await getUserById(currentUserId);
      if (!currentUser || !currentUser.roles.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: '無權限執行此操作',
        });
      }

      const { email, firstName, lastName, password, department, roles, sendEmail } = req.body;

      if (!email || !firstName || !password) {
        return res.status(400).json({
          success: false,
          error: '請提供 Email、姓名和密碼',
        });
      }

      // 檢查 Email 是否已存在
      const checkQuery = `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`;
      const existing = await queryDatabase(checkQuery, [email]);

      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Email 已被使用',
        });
      }

      // 加密密碼
      const passwordHash = await hashPassword(password);

      // 建立使用者
      const insertQuery = `
        INSERT INTO users (
          id,
          email,
          first_name,
          last_name,
          password_hash,
          must_change_password,
          department,
          role,
          roles,
          status,
          created_at,
          updated_at
        )
        VALUES (
          gen_random_uuid(),
          $1, $2, $3, $4, true, $5, $6, $7, 'active', NOW(), NOW()
        )
        RETURNING id, email, first_name, last_name, department, role, roles, status
      `;

      const userRoles = roles || ['user'];
      const userRole = userRoles.includes('admin') ? 'admin' : 'user';

      const result = await queryDatabase(insertQuery, [
        email,
        firstName,
        lastName || '',
        passwordHash,
        department || null,
        userRole,
        userRoles,
      ]);

      const createdUser = result.rows[0];

      // 建立員工 profile（包含自動生成員工編號）
      try {
        await queryDatabase(`
          INSERT INTO employee_profiles (user_id)
          VALUES ($1)
        `, [createdUser.id]);
        console.log('[建立使用者] 已建立員工 profile，員工編號將自動生成');
      } catch (profileError: any) {
        console.error('[建立使用者] 建立員工 profile 失敗:', profileError.message);
        // 不影響主流程，繼續執行
      }

      // 如果勾選發送 Email，則發送帳號建立通知
      let emailSent = false;
      let emailError = null;

      if (sendEmail === true || sendEmail === 'true') {
        console.log('[建立使用者] 準備發送 Email 到:', email);
        const emailResult = await sendAccountCreationEmail(
          email,
          firstName,
          password // 發送原始密碼（未加密）
        );

        emailSent = emailResult.success;
        if (!emailResult.success) {
          emailError = emailResult.error;
          console.error('[建立使用者] Email 發送失敗:', emailError);
        }
      }

      res.json({
        success: true,
        user: createdUser,
        message: '使用者建立成功，首次登入需要修改密碼',
        emailSent,
        emailError,
      });
    } catch (error: any) {
      console.error('建立使用者 API 錯誤:', error);
      res.status(500).json({
        success: false,
        error: '建立使用者失敗',
      });
    }
  });

  /**
   * POST /api/auth/request-password-reset
   * 請求重設密碼（不需登入）
   */
  app.post('/api/auth/request-password-reset', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: '請提供 Email',
        });
      }

      // 檢查使用者是否存在
      const checkQuery = `SELECT id, first_name, last_name FROM users WHERE LOWER(email) = LOWER($1)`;
      const result = await queryDatabase(checkQuery, [email]);

      if (result.rows.length === 0) {
        // 安全考量：即使找不到使用者也回傳成功（避免暴露使用者是否存在）
        console.log(`[密碼重設請求] 使用者不存在: ${email}`);
        return res.json({
          success: true,
          message: '若該帳號存在，管理員會協助處理您的請求',
        });
      }

      const user = result.rows[0];

      // 記錄重設請求到 password_reset_requests 表
      const insertQuery = `
        INSERT INTO password_reset_requests (
          id,
          user_id,
          email,
          status,
          requested_at,
          created_at
        )
        VALUES (
          gen_random_uuid(),
          $1, $2, 'pending', NOW(), NOW()
        )
      `;

      await queryDatabase(insertQuery, [user.id, email]);

      console.log(`[密碼重設請求] 已記錄請求：${email} (User ID: ${user.id})`);

      res.json({
        success: true,
        message: '您的請求已提交，管理員會盡快處理',
      });
    } catch (error: any) {
      console.error('密碼重設請求 API 錯誤:', error);

      // 檢查是否是因為表不存在
      if (error.message && error.message.includes('password_reset_requests')) {
        console.error('⚠️ password_reset_requests 表不存在，請執行資料庫遷移');
      }

      res.status(500).json({
        success: false,
        error: '提交請求失敗，請稍後再試',
      });
    }
  });

  /**
   * GET /api/auth/admin/password-reset-requests
   * Admin 取得所有密碼重設請求
   */
  app.get('/api/auth/admin/password-reset-requests', async (req, res) => {
    try {
      const currentUserId = (req as any).session?.userId;

      if (!currentUserId) {
        return res.status(401).json({
          success: false,
          error: '未登入',
        });
      }

      // 檢查是否為 Admin
      const currentUser = await getUserById(currentUserId);
      if (!currentUser || !currentUser.roles.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: '無權限執行此操作',
        });
      }

      // 取得所有請求（加入使用者資訊）
      const query = `
        SELECT
          pr.id,
          pr.user_id,
          pr.email,
          pr.status,
          pr.requested_at,
          pr.processed_at,
          pr.processed_by,
          u.first_name,
          u.last_name
        FROM password_reset_requests pr
        LEFT JOIN users u ON pr.user_id = u.id
        ORDER BY pr.requested_at DESC
        LIMIT 100
      `;

      const result = await queryDatabase(query);

      res.json({
        success: true,
        requests: result.rows,
      });
    } catch (error: any) {
      console.error('取得密碼重設請求錯誤:', error);
      res.status(500).json({
        success: false,
        error: '取得請求失敗',
      });
    }
  });
}

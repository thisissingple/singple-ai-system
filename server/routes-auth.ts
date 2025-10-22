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

export function registerAuthRoutes(app: Express) {
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
      const userId = (req as any).session?.userId;

      if (!userId) {
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

      res.json({
        success: true,
        user,
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

      const { email, firstName, lastName, password, department, roles } = req.body;

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

      res.json({
        success: true,
        user: result.rows[0],
        message: '使用者建立成功，首次登入需要修改密碼',
      });
    } catch (error: any) {
      console.error('建立使用者 API 錯誤:', error);
      res.status(500).json({
        success: false,
        error: '建立使用者失敗',
      });
    }
  });
}

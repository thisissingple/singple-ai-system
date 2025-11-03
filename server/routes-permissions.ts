/**
 * Permission Management Routes
 *
 * Handles all permission-related API endpoints:
 * - Module management (CRUD)
 * - User permission assignment
 * - Permission checks
 */

import type { Express } from 'express';
import { isAuthenticated, requireAdmin } from './auth';
import * as permissionService from './services/permission-service';

export function registerPermissionRoutes(app: Express): void {

  // =====================================================
  // Permission Module Management
  // =====================================================

  /**
   * GET /api/permissions/modules
   * Get all permission modules
   * Auth: Public (no auth required for listing modules)
   */
  app.get('/api/permissions/modules', async (req, res) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const modules = await permissionService.getAllModules(includeInactive);

      res.json({
        success: true,
        data: modules
      });
    } catch (error: any) {
      console.error('[Permission Routes] Error getting modules:', error);
      res.status(500).json({
        success: false,
        error: '取得權限模組列表失敗',
        message: error.message
      });
    }
  });

  /**
   * GET /api/permissions/modules/:moduleId
   * Get a specific module by ID
   * Auth: Authenticated users
   */
  app.get('/api/permissions/modules/:moduleId', isAuthenticated, async (req, res) => {
    try {
      const { moduleId } = req.params;
      const module = await permissionService.getModuleById(moduleId);

      if (!module) {
        return res.status(404).json({
          success: false,
          error: '找不到此權限模組'
        });
      }

      res.json({
        success: true,
        data: module
      });
    } catch (error: any) {
      console.error('[Permission Routes] Error getting module:', error);
      res.status(500).json({
        success: false,
        error: '取得權限模組失敗',
        message: error.message
      });
    }
  });

  /**
   * GET /api/permissions/modules/category/:category
   * Get modules by category
   * Auth: Authenticated users
   */
  app.get('/api/permissions/modules/category/:category', isAuthenticated, async (req, res) => {
    try {
      const { category } = req.params;
      const modules = await permissionService.getModulesByCategory(category);

      res.json({
        success: true,
        data: modules
      });
    } catch (error: any) {
      console.error('[Permission Routes] Error getting modules by category:', error);
      res.status(500).json({
        success: false,
        error: '取得分類模組失敗',
        message: error.message
      });
    }
  });

  /**
   * POST /api/permissions/modules
   * Create a new permission module
   * Auth: Admin only
   */
  app.post('/api/permissions/modules', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const moduleData = req.body;

      // Validation
      if (!moduleData.module_id || !moduleData.module_name || !moduleData.module_category) {
        return res.status(400).json({
          success: false,
          error: '缺少必要欄位：module_id, module_name, module_category'
        });
      }

      const newModule = await permissionService.createModule(moduleData);

      res.status(201).json({
        success: true,
        data: newModule,
        message: '權限模組建立成功'
      });
    } catch (error: any) {
      console.error('[Permission Routes] Error creating module:', error);

      // Handle unique constraint violation
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          error: '模組 ID 已存在'
        });
      }

      res.status(500).json({
        success: false,
        error: '建立權限模組失敗',
        message: error.message
      });
    }
  });

  /**
   * PUT /api/permissions/modules/:moduleId
   * Update an existing permission module
   * Auth: Admin only
   */
  app.put('/api/permissions/modules/:moduleId', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { moduleId } = req.params;
      const updates = req.body;

      const updatedModule = await permissionService.updateModule(moduleId, updates);

      if (!updatedModule) {
        return res.status(404).json({
          success: false,
          error: '找不到此權限模組'
        });
      }

      res.json({
        success: true,
        data: updatedModule,
        message: '權限模組更新成功'
      });
    } catch (error: any) {
      console.error('[Permission Routes] Error updating module:', error);
      res.status(500).json({
        success: false,
        error: '更新權限模組失敗',
        message: error.message
      });
    }
  });

  /**
   * DELETE /api/permissions/modules/:moduleId
   * Deactivate a permission module (soft delete)
   * Auth: Admin only
   */
  app.delete('/api/permissions/modules/:moduleId', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { moduleId } = req.params;

      await permissionService.deactivateModule(moduleId);

      res.json({
        success: true,
        message: '權限模組已停用'
      });
    } catch (error: any) {
      console.error('[Permission Routes] Error deactivating module:', error);
      res.status(500).json({
        success: false,
        error: '停用權限模組失敗',
        message: error.message
      });
    }
  });

  // =====================================================
  // User Permission Management
  // =====================================================

  /**
   * GET /api/permissions/user/:userId
   * Get all permissions for a specific user
   * Auth: Admin only
   */
  app.get('/api/permissions/user/:userId', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const withModules = req.query.withModules === 'true';

      const permissions = withModules
        ? await permissionService.getUserPermissionsWithModules(userId)
        : await permissionService.getUserPermissions(userId);

      res.json({
        success: true,
        data: permissions
      });
    } catch (error: any) {
      console.error('[Permission Routes] Error getting user permissions:', error);
      res.status(500).json({
        success: false,
        error: '取得使用者權限失敗',
        message: error.message
      });
    }
  });

  /**
   * POST /api/permissions/user/:userId
   * Set permissions for a user (batch update - replaces all existing)
   * Auth: Admin only
   *
   * Body: {
   *   permissions: [
   *     { module_id: 'trial_class_report', scope: 'all' },
   *     { module_id: 'teaching_quality', scope: 'own_only' }
   *   ]
   * }
   */
  app.post('/api/permissions/user/:userId', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { permissions } = req.body;

      if (!Array.isArray(permissions)) {
        return res.status(400).json({
          success: false,
          error: 'permissions 必須是陣列'
        });
      }

      // Validate each permission
      for (const permission of permissions) {
        if (!permission.module_id || !permission.scope) {
          return res.status(400).json({
            success: false,
            error: '每個權限必須包含 module_id 和 scope'
          });
        }
        if (!['all', 'own_only'].includes(permission.scope)) {
          return res.status(400).json({
            success: false,
            error: 'scope 必須是 "all" 或 "own_only"'
          });
        }
      }

      const grantedBy = req.user.id;
      await permissionService.setUserPermissions(userId, permissions, grantedBy);

      res.json({
        success: true,
        message: '使用者權限設定成功'
      });
    } catch (error: any) {
      console.error('[Permission Routes] Error setting user permissions:', error);

      // Handle foreign key violation (invalid module_id or user_id)
      if (error.code === '23503') {
        return res.status(400).json({
          success: false,
          error: '無效的模組 ID 或使用者 ID'
        });
      }

      res.status(500).json({
        success: false,
        error: '設定使用者權限失敗',
        message: error.message
      });
    }
  });

  /**
   * POST /api/permissions/user/:userId/add
   * Add a single permission to a user (without removing existing ones)
   * Auth: Admin only
   *
   * Body: {
   *   module_id: 'trial_class_report',
   *   scope: 'all'
   * }
   */
  app.post('/api/permissions/user/:userId/add', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { module_id, scope } = req.body;

      if (!module_id || !scope) {
        return res.status(400).json({
          success: false,
          error: '缺少必要欄位：module_id, scope'
        });
      }

      if (!['all', 'own_only'].includes(scope)) {
        return res.status(400).json({
          success: false,
          error: 'scope 必須是 "all" 或 "own_only"'
        });
      }

      const grantedBy = req.user.id;
      const permission = await permissionService.addUserPermission(userId, module_id, scope, grantedBy);

      res.json({
        success: true,
        data: permission,
        message: '權限新增成功'
      });
    } catch (error: any) {
      console.error('[Permission Routes] Error adding user permission:', error);

      if (error.code === '23503') {
        return res.status(400).json({
          success: false,
          error: '無效的模組 ID 或使用者 ID'
        });
      }

      res.status(500).json({
        success: false,
        error: '新增權限失敗',
        message: error.message
      });
    }
  });

  /**
   * DELETE /api/permissions/user/:userId/module/:moduleId
   * Remove a specific permission from a user
   * Auth: Admin only
   */
  app.delete('/api/permissions/user/:userId/module/:moduleId', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { userId, moduleId } = req.params;

      await permissionService.removeUserPermission(userId, moduleId);

      res.json({
        success: true,
        message: '權限移除成功'
      });
    } catch (error: any) {
      console.error('[Permission Routes] Error removing user permission:', error);
      res.status(500).json({
        success: false,
        error: '移除權限失敗',
        message: error.message
      });
    }
  });

  // =====================================================
  // Permission Check Endpoints
  // =====================================================

  /**
   * GET /api/permissions/check/:moduleId
   * Check if current user has permission to access a module
   * Auth: Authenticated users
   */
  app.get('/api/permissions/check/:moduleId', isAuthenticated, async (req: any, res) => {
    try {
      const { moduleId } = req.params;
      const userId = req.user.id;

      const permission = await permissionService.hasModulePermission(userId, moduleId);

      res.json({
        success: true,
        data: permission
      });
    } catch (error: any) {
      console.error('[Permission Routes] Error checking permission:', error);
      res.status(500).json({
        success: false,
        error: '檢查權限失敗',
        message: error.message
      });
    }
  });

  /**
   * GET /api/permissions/my-modules
   * Get all modules that the current user can access
   * Auth: Authenticated users
   */
  app.get('/api/permissions/my-modules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const moduleIds = await permissionService.getUserAccessibleModules(userId);

      // Get full module details
      const allModules = await permissionService.getAllModules();
      const accessibleModules = allModules.filter(module => moduleIds.includes(module.module_id));

      res.json({
        success: true,
        data: accessibleModules
      });
    } catch (error: any) {
      console.error('[Permission Routes] Error getting my modules:', error);
      res.status(500).json({
        success: false,
        error: '取得可存取模組失敗',
        message: error.message
      });
    }
  });

  // =====================================================
  // Admin Dashboard Endpoints
  // =====================================================

  /**
   * GET /api/permissions/summary
   * Get summary of all users and their permission counts
   * Auth: Admin only
   */
  app.get('/api/permissions/summary', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const summary = await permissionService.getUserPermissionsSummary();

      res.json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      console.error('[Permission Routes] Error getting permissions summary:', error);
      res.status(500).json({
        success: false,
        error: '取得權限摘要失敗',
        message: error.message
      });
    }
  });

  console.log('[Permission Routes] Permission management routes registered');
}

// =====================================================
// Middleware for protecting routes with module permissions
// =====================================================

/**
 * Middleware factory: Require module permission to access endpoint
 *
 * Usage:
 * app.get('/api/reports/trial-class', isAuthenticated, requireModulePermission('trial_class_report'), (req, res) => { ... });
 */
export function requireModulePermission(moduleId: string) {
  return async (req: any, res: any, next: any) => {
    try {
      // 🔓 在開發模式下跳過權限檢查
      if (process.env.SKIP_AUTH === 'true') {
        console.log(`[DEV MODE] 🔓 Skipping module permission check for ${moduleId}`);
        req.permissionScope = 'all'; // 給予完整權限
        return next();
      }

      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '未登入'
        });
      }

      const permission = await permissionService.hasModulePermission(userId, moduleId);

      if (!permission.allowed) {
        return res.status(403).json({
          success: false,
          error: '您沒有權限存取此功能',
          moduleId: moduleId,
          reason: permission.reason
        });
      }

      // Attach permission scope to request for later use (e.g., data filtering)
      req.permissionScope = permission.scope;

      next();
    } catch (error: any) {
      console.error('[requireModulePermission] Error checking permission:', error);
      res.status(500).json({
        success: false,
        error: '權限檢查失敗',
        message: error.message
      });
    }
  };
}

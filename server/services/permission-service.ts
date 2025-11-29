/**
 * Permission Service
 *
 * Handles feature-level permission checks for the manual permission assignment system.
 * Integrates with the existing permission-filter-service for data-level filtering.
 *
 * Key Features:
 * - Check if user has access to specific modules
 * - Manage user permissions (CRUD operations)
 * - Dynamic module management
 * - Admin/super_admin bypass (always have full access)
 */

import { getSharedPool, queryDatabase, insertAndReturn } from './pg-client';
import type { Pool } from 'pg';

// 不再使用 createPool，改用 getSharedPool
const createPool = () => getSharedPool();

// =====================================================
// Type Definitions
// =====================================================

export interface PermissionModule {
  id: string;
  module_id: string;
  module_name: string;
  module_category: 'teacher_system' | 'telemarketing_system' | 'consultant_system' | 'management_system';
  description: string | null;
  supports_scope: boolean;
  related_table: string | null;
  related_apis: string[];
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserPermission {
  id: string;
  user_id: string;
  module_id: string;
  scope: 'all' | 'own_only';
  is_active: boolean;
  granted_by: string | null;
  granted_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PermissionCheckResult {
  allowed: boolean;
  scope?: 'all' | 'own_only';
  reason?: string;
}

export interface UserPermissionInput {
  module_id: string;
  scope: 'all' | 'own_only';
  is_active?: boolean;
}

// =====================================================
// Core Permission Check Functions
// =====================================================

/**
 * Check if a user has permission to access a specific module
 *
 * @param userId - User ID to check
 * @param moduleId - Module ID (e.g., 'trial_class_report')
 * @returns Object with allowed status and scope (if allowed)
 */
export async function hasModulePermission(
  userId: string,
  moduleId: string
): Promise<PermissionCheckResult> {
  // 🔓 在開發模式下跳過所有權限檢查
  if (process.env.SKIP_AUTH === 'true') {
    console.log(`[DEV MODE] 🔓 Skipping permission check for user ${userId} on module ${moduleId}`);
    return { allowed: true, scope: 'all', reason: 'SKIP_AUTH mode' };
  }

  const pool = createPool();

  try {
    // First, check if user is admin or super_admin (bypass all checks)
    const userQuery = `
      SELECT roles, role
      FROM users
      WHERE id = $1 AND status = 'active'
    `;
    const userResult = await pool.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      return { allowed: false, reason: 'User not found or inactive' };
    }

    const user = userResult.rows[0];
    const roles = user.roles || [user.role]; // Support both roles array and single role

    // Admin and super_admin have full access to everything
    if (roles.includes('admin') || roles.includes('super_admin')) {
      return { allowed: true, scope: 'all', reason: 'Admin/super_admin bypass' };
    }

    // Check user_permissions table
    const permissionQuery = `
      SELECT up.scope, up.is_active, pm.is_active as module_active
      FROM user_permissions up
      JOIN permission_modules pm ON up.module_id = pm.module_id
      WHERE up.user_id = $1
        AND up.module_id = $2
        AND up.is_active = true
        AND pm.is_active = true
    `;
    const permissionResult = await pool.query(permissionQuery, [userId, moduleId]);

    if (permissionResult.rows.length === 0) {
      return { allowed: false, reason: 'No permission granted for this module' };
    }

    const permission = permissionResult.rows[0];
    return {
      allowed: true,
      scope: permission.scope,
      reason: 'Permission granted'
    };

  } catch (error) {
    console.error('[Permission Service] Error checking module permission:', error);
    throw error;
  }
  // 注意：使用共享連線池，不需要 pool.end()
}

/**
 * Check if a user has permission to access any of the given modules
 * Useful for checking multiple related modules at once
 */
export async function hasAnyModulePermission(
  userId: string,
  moduleIds: string[]
): Promise<PermissionCheckResult> {
  const pool = createPool();

  try {
    // Check admin bypass first
    const userQuery = `SELECT roles, role FROM users WHERE id = $1 AND status = 'active'`;
    const userResult = await pool.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      return { allowed: false, reason: 'User not found or inactive' };
    }

    const user = userResult.rows[0];
    const roles = user.roles || [user.role];

    if (roles.includes('admin') || roles.includes('super_admin')) {
      return { allowed: true, scope: 'all', reason: 'Admin/super_admin bypass' };
    }

    // Check if user has permission to any of the modules
    const permissionQuery = `
      SELECT up.scope, up.module_id
      FROM user_permissions up
      JOIN permission_modules pm ON up.module_id = pm.module_id
      WHERE up.user_id = $1
        AND up.module_id = ANY($2::text[])
        AND up.is_active = true
        AND pm.is_active = true
      LIMIT 1
    `;
    const permissionResult = await pool.query(permissionQuery, [userId, moduleIds]);

    if (permissionResult.rows.length === 0) {
      return { allowed: false, reason: 'No permission granted for any of these modules' };
    }

    const permission = permissionResult.rows[0];
    return { allowed: true, scope: permission.scope };

  } catch (error) {
    console.error('[Permission Service] Error checking any module permission:', error);
    throw error;
  }
}

// =====================================================
// User Permission Management
// =====================================================

/**
 * Get all permissions for a specific user
 */
export async function getUserPermissions(userId: string): Promise<UserPermission[]> {
  const pool = createPool();

  try {
    const query = `
      SELECT up.*
      FROM user_permissions up
      WHERE up.user_id = $1
      ORDER BY up.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;

  } catch (error) {
    console.error('[Permission Service] Error getting user permissions:', error);
    throw error;
  }
}

/**
 * Get all permissions for a user with module details
 */
export async function getUserPermissionsWithModules(userId: string) {
  const pool = createPool();

  try {
    const query = `
      SELECT
        up.id,
        up.user_id,
        up.module_id,
        up.scope,
        up.is_active,
        up.granted_by,
        up.granted_at,
        pm.module_name,
        pm.module_category,
        pm.description,
        pm.supports_scope
      FROM user_permissions up
      JOIN permission_modules pm ON up.module_id = pm.module_id
      WHERE up.user_id = $1 AND up.is_active = true AND pm.is_active = true
      ORDER BY pm.module_category, pm.display_order
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;

  } catch (error) {
    console.error('[Permission Service] Error getting user permissions with modules:', error);
    throw error;
  }
}

/**
 * Set permissions for a user (batch update)
 * This replaces all existing permissions with the new set
 *
 * @param userId - User to set permissions for
 * @param permissions - Array of permissions to grant
 * @param grantedBy - User ID of the admin granting these permissions
 */
export async function setUserPermissions(
  userId: string,
  permissions: UserPermissionInput[],
  grantedBy: string
): Promise<void> {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Delete all existing permissions for this user
    await client.query(
      'DELETE FROM user_permissions WHERE user_id = $1',
      [userId]
    );

    // Insert new permissions
    if (permissions.length > 0) {
      const values: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      permissions.forEach((permission) => {
        values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4})`);
        params.push(
          userId,
          permission.module_id,
          permission.scope,
          permission.is_active !== false, // Default to true if not specified
          grantedBy
        );
        paramIndex += 5;
      });

      const insertQuery = `
        INSERT INTO user_permissions (user_id, module_id, scope, is_active, granted_by)
        VALUES ${values.join(', ')}
      `;
      await client.query(insertQuery, params);
    }

    await client.query('COMMIT');
    console.log(`[Permission Service] Set ${permissions.length} permissions for user ${userId}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Permission Service] Error setting user permissions:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Add a single permission to a user (without removing existing ones)
 */
export async function addUserPermission(
  userId: string,
  moduleId: string,
  scope: 'all' | 'own_only',
  grantedBy: string
): Promise<UserPermission> {
  const pool = createPool();

  try {
    const query = `
      INSERT INTO user_permissions (user_id, module_id, scope, granted_by, is_active)
      VALUES ($1, $2, $3, $4, true)
      ON CONFLICT (user_id, module_id)
      DO UPDATE SET
        scope = EXCLUDED.scope,
        granted_by = EXCLUDED.granted_by,
        granted_at = NOW(),
        is_active = true
      RETURNING *
    `;
    const result = await pool.query(query, [userId, moduleId, scope, grantedBy]);
    return result.rows[0];

  } catch (error) {
    console.error('[Permission Service] Error adding user permission:', error);
    throw error;
  }
}

/**
 * Remove a permission from a user
 */
export async function removeUserPermission(
  userId: string,
  moduleId: string
): Promise<void> {
  const pool = createPool();

  try {
    await pool.query(
      'DELETE FROM user_permissions WHERE user_id = $1 AND module_id = $2',
      [userId, moduleId]
    );

  } catch (error) {
    console.error('[Permission Service] Error removing user permission:', error);
    throw error;
  }
}

// =====================================================
// Module Management
// =====================================================

/**
 * Get all permission modules
 */
export async function getAllModules(includeInactive = false): Promise<PermissionModule[]> {
  const pool = createPool();

  try {
    const whereClause = includeInactive ? '' : 'WHERE is_active = true';
    const query = `
      SELECT * FROM permission_modules
      ${whereClause}
      ORDER BY module_category, display_order
    `;
    const result = await pool.query(query, []);
    return result.rows;

  } catch (error) {
    console.error('[Permission Service] Error getting all modules:', error);
    throw error;
  }
}

/**
 * Get modules by category
 */
export async function getModulesByCategory(category: string): Promise<PermissionModule[]> {
  const pool = createPool();

  try {
    const query = `
      SELECT * FROM permission_modules
      WHERE module_category = $1 AND is_active = true
      ORDER BY display_order
    `;
    const result = await pool.query(query, [category]);
    return result.rows;

  } catch (error) {
    console.error('[Permission Service] Error getting modules by category:', error);
    throw error;
  }
}

/**
 * Get a single module by ID
 */
export async function getModuleById(moduleId: string): Promise<PermissionModule | null> {
  const pool = createPool();

  try {
    const query = 'SELECT * FROM permission_modules WHERE module_id = $1';
    const result = await pool.query(query, [moduleId]);
    return result.rows[0] || null;

  } catch (error) {
    console.error('[Permission Service] Error getting module by ID:', error);
    throw error;
  }
}

/**
 * Create a new permission module
 */
export async function createModule(moduleData: Partial<PermissionModule>): Promise<PermissionModule> {
  const pool = createPool();

  try {
    const query = `
      INSERT INTO permission_modules (
        module_id, module_name, module_category, description,
        supports_scope, related_table, related_apis, display_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const result = await pool.query(query, [
      moduleData.module_id,
      moduleData.module_name,
      moduleData.module_category,
      moduleData.description || null,
      moduleData.supports_scope !== false,
      moduleData.related_table || null,
      moduleData.related_apis || [],
      moduleData.display_order || 0
    ]);
    return result.rows[0];

  } catch (error) {
    console.error('[Permission Service] Error creating module:', error);
    throw error;
  }
}

/**
 * Update an existing permission module
 */
export async function updateModule(
  moduleId: string,
  updates: Partial<PermissionModule>
): Promise<PermissionModule> {
  const pool = createPool();

  try {
    const query = `
      UPDATE permission_modules
      SET
        module_name = COALESCE($2, module_name),
        module_category = COALESCE($3, module_category),
        description = COALESCE($4, description),
        supports_scope = COALESCE($5, supports_scope),
        related_table = COALESCE($6, related_table),
        related_apis = COALESCE($7, related_apis),
        display_order = COALESCE($8, display_order),
        is_active = COALESCE($9, is_active),
        updated_at = NOW()
      WHERE module_id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [
      moduleId,
      updates.module_name,
      updates.module_category,
      updates.description,
      updates.supports_scope,
      updates.related_table,
      updates.related_apis,
      updates.display_order,
      updates.is_active
    ]);
    return result.rows[0];

  } catch (error) {
    console.error('[Permission Service] Error updating module:', error);
    throw error;
  }
}

/**
 * Deactivate a module (soft delete)
 */
export async function deactivateModule(moduleId: string): Promise<void> {
  const pool = createPool();

  try {
    await pool.query(
      'UPDATE permission_modules SET is_active = false, updated_at = NOW() WHERE module_id = $1',
      [moduleId]
    );

  } catch (error) {
    console.error('[Permission Service] Error deactivating module:', error);
    throw error;
  }
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Get summary of all users and their permission counts
 * Useful for admin dashboard
 */
export async function getUserPermissionsSummary() {
  const pool = createPool();

  try {
    const query = `
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.roles,
        COUNT(up.id) as permission_count,
        MAX(up.granted_at) as last_permission_granted
      FROM users u
      LEFT JOIN user_permissions up ON u.id = up.user_id AND up.is_active = true
      WHERE u.status = 'active'
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.roles
      ORDER BY u.email
    `;
    const result = await pool.query(query, []);
    return result.rows;

  } catch (error) {
    console.error('[Permission Service] Error getting user permissions summary:', error);
    throw error;
  }
}

/**
 * Check which modules a user can access (returns list of module IDs)
 */
export async function getUserAccessibleModules(userId: string): Promise<string[]> {
  // 🔓 在開發模式下返回所有模組
  if (process.env.SKIP_AUTH === 'true') {
    console.log(`[DEV MODE] 🔓 Returning all modules for user ${userId}`);
    const pool = createPool();
    const allModulesQuery = 'SELECT module_id FROM permission_modules WHERE is_active = true';
    const result = await pool.query(allModulesQuery, []);
    return result.rows.map(row => row.module_id);
  }

  const pool = createPool();

  try {
    // Check admin bypass
    const userQuery = `SELECT roles, role FROM users WHERE id = $1 AND status = 'active'`;
    const userResult = await pool.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      return [];
    }

    const user = userResult.rows[0];
    const roles = user.roles || [user.role];

    // Admin/super_admin can access all modules
    if (roles.includes('admin') || roles.includes('super_admin')) {
      const allModulesQuery = 'SELECT module_id FROM permission_modules WHERE is_active = true';
      const result = await pool.query(allModulesQuery, []);
      return result.rows.map(row => row.module_id);
    }

    // Get user's permitted modules
    const query = `
      SELECT up.module_id
      FROM user_permissions up
      JOIN permission_modules pm ON up.module_id = pm.module_id
      WHERE up.user_id = $1 AND up.is_active = true AND pm.is_active = true
    `;
    const result = await pool.query(query, [userId]);
    return result.rows.map(row => row.module_id);

  } catch (error) {
    console.error('[Permission Service] Error getting user accessible modules:', error);
    throw error;
  }
}

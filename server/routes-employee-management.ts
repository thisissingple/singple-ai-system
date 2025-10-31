/**
 * Employee Management Routes
 * 員工管理 API 路由
 */

import type { Express } from 'express';
import { isAuthenticated, requireAdmin } from './auth';
import { createClient } from '@supabase/supabase-js';
import { queryDatabase } from './services/pg-client';

// Supabase Client
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * 同步 business_identities → users.roles
 *
 * 核心邏輯：
 * - business_identities 是主表（有業務編號、歷史記錄）
 * - users.roles 是副表（供 API 查詢、權限控制使用）
 * - 當修改 business_identities 時，自動更新 users.roles
 *
 * @param userId - 使用者 ID
 */
async function syncRolesToUser(userId: string): Promise<void> {
  try {
    // 1. 查詢該使用者所有 active 的 business_identities
    const result = await queryDatabase(
      `SELECT DISTINCT identity_type
       FROM business_identities
       WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    // 2. 轉換為 roles 陣列
    const roles = ['user']; // 基本角色

    // 檢查是否為 admin（保留原有 admin 角色）
    const adminCheck = await queryDatabase(
      `SELECT roles FROM users WHERE id = $1`,
      [userId]
    );

    if (adminCheck.rows[0]?.roles?.includes('admin')) {
      roles.push('admin');
    }

    // 根據 business_identities 新增角色
    result.rows.forEach(row => {
      const identityType = row.identity_type;

      // identity_type → role 的對應
      if (identityType === 'teacher' && !roles.includes('teacher')) {
        roles.push('teacher');
      }
      if (identityType === 'consultant' && !roles.includes('consultant')) {
        roles.push('consultant');
      }
      if (identityType === 'setter' && !roles.includes('setter')) {
        roles.push('setter');
      }
      if (identityType === 'employee' && !roles.includes('employee')) {
        roles.push('employee');
      }
      if (identityType === 'sales' && !roles.includes('sales')) {
        roles.push('sales');
      }
      if (identityType === 'telemarketing' && !roles.includes('telemarketing')) {
        roles.push('telemarketing');
      }
    });

    // 3. 更新 users.roles
    await queryDatabase(
      `UPDATE users
       SET roles = $1, updated_at = NOW()
       WHERE id = $2`,
      [roles, userId]
    );

    console.log(`✅ 已同步角色: userId=${userId}, roles=${JSON.stringify(roles)}`);
  } catch (error: any) {
    console.error(`❌ 同步角色失敗: userId=${userId}`, error);
    throw new Error(`Failed to sync roles: ${error.message}`);
  }
}

export function registerEmployeeManagementRoutes(app: Express) {
  /**
   * GET /api/employees
   * 取得員工列表（包含所有相關資料）
   * Admin 可以看到所有員工，一般使用者只能看到自己
   */
  app.get('/api/employees', isAuthenticated, async (req, res) => {
    try {
      const supabase = getSupabaseClient();
      const userId = (req as any).user?.id;
      const isAdmin = (req as any).user?.roles?.includes('admin');

      // 1. 查詢使用者列表（根據權限過濾）
      // 排序：在職優先 (active)，然後按名字排序
      let usersQuery = supabase
        .from('users')
        .select('id, email, first_name, last_name, profile_image_url, role, roles, department, status, last_login_at, created_at, updated_at')
        .order('status', { ascending: true })  // 'active' 在前 (字母順序 a < i)
        .order('first_name', { ascending: true });

      // 非 admin 只能看到自己
      if (!isAdmin && userId) {
        usersQuery = usersQuery.eq('id', userId);
      }

      const { data: users, error: usersError } = await usersQuery;

      if (usersError) {
        throw usersError;
      }

      if (!users || users.length === 0) {
        return res.json({
          success: true,
          data: [],
          total: 0,
        });
      }

      const userIds = users.map(u => u.id);

      // 2. 查詢員工檔案
      const { data: profiles } = await supabase
        .from('employee_profiles')
        .select('*')
        .in('user_id', userIds);

      // 3. 查詢業務身份
      const { data: identities } = await supabase
        .from('business_identities')
        .select('*')
        .in('user_id', userIds)
        .order('created_at', { ascending: false });

      // 4. 查詢薪資記錄（最新的 active 記錄）
      const { data: compensations } = await supabase
        .from('employee_compensation')
        .select('*')
        .in('user_id', userIds)
        .eq('is_active', true)
        .order('effective_from', { ascending: false });

      // 5. 查詢勞健保記錄（最新的 active 記錄）
      const { data: insurances } = await supabase
        .from('employee_insurance')
        .select('*')
        .in('user_id', userIds)
        .eq('is_active', true)
        .order('effective_from', { ascending: false });

      // 6. 組合資料
      const employees = users.map(user => {
        const profile = profiles?.find(p => p.user_id === user.id) || null;
        const userIdentities = identities?.filter(i => i.user_id === user.id) || [];
        const latestCompensation = compensations?.find(c => c.user_id === user.id) || null;
        const latestInsurance = insurances?.find(i => i.user_id === user.id) || null;

        return {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            profile_image_url: user.profile_image_url,
            role: user.role,
            roles: user.roles,
            department: user.department,
            status: user.status,
            last_login_at: user.last_login_at,
            created_at: user.created_at,
            updated_at: user.updated_at,
          },
          profile,
          identities: userIdentities,
          latest_compensation: latestCompensation,
          latest_insurance: latestInsurance,
        };
      });

      res.json({
        success: true,
        data: employees,
        total: employees.length,
      });
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch employees',
        error: error.message,
      });
    }
  });

  /**
   * GET /api/employees/:userId
   * 取得特定員工的完整資料（包含所有歷史記錄）
   */
  app.get('/api/employees/:userId', isAuthenticated, async (req, res) => {
    try {
      const supabase = getSupabaseClient();
      const { userId } = req.params;
      const currentUserId = (req as any).user?.id;
      const isAdmin = (req as any).user?.roles?.includes('admin');

      // 權限檢查：Admin 或本人才能查看（開發模式跳過）
      if (process.env.SKIP_AUTH !== 'true' && !isAdmin && currentUserId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only view your own data',
        });
      }

      // 並行查詢所有資料（效能優化）
      const [userResult, profileResult, identitiesResult, compensationResult, insuranceResult] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase.from('employee_profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('business_identities').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('employee_compensation').select('*').eq('user_id', userId).order('effective_from', { ascending: false }),
        supabase.from('employee_insurance').select('*').eq('user_id', userId).order('effective_from', { ascending: false }),
      ]);

      if (userResult.error) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          error: userResult.error.message,
        });
      }

      res.json({
        success: true,
        data: {
          user: userResult.data,
          profile: profileResult.data || null,
          identities: identitiesResult.data || [],
          compensation: compensationResult.data || [],
          insurance: insuranceResult.data || [],
        },
      });
    } catch (error: any) {
      console.error('Error fetching employee detail:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch employee detail',
        error: error.message,
      });
    }
  });

  /**
   * POST /api/employees/:userId/business-identity
   * 新增業務身份
   * 需要 Admin 權限
   */
  app.post('/api/employees/:userId/business-identity', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { identity_type, display_name, effective_from, effective_to, notes } = req.body;
      const createdBy = (req as any).user?.id;

      // Validate required fields
      if (!identity_type || !effective_from) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: identity_type, effective_from',
        });
      }

      const supabase = getSupabaseClient();

      // Get next identity code
      const codePrefix = identity_type === 'teacher' ? 'T'
                       : identity_type === 'consultant' ? 'C'
                       : identity_type === 'setter' ? 'S'
                       : 'E';

      // Use Supabase to get max identity code
      const { data: existingCodes, error: codeError } = await supabase
        .from('business_identities')
        .select('identity_code')
        .eq('identity_type', identity_type)
        .order('identity_code', { ascending: false })
        .limit(1);

      if (codeError) throw codeError;

      let nextNum = 1;
      if (existingCodes && existingCodes.length > 0) {
        const lastCode = existingCodes[0].identity_code;
        const lastNum = parseInt(lastCode.substring(1), 10);
        nextNum = lastNum + 1;
      }

      const identity_code = `${codePrefix}${String(nextNum).padStart(3, '0')}`;

      // Insert business identity using Supabase Client
      const { data, error } = await supabase
        .from('business_identities')
        .insert({
          user_id: userId,
          identity_type,
          identity_code,
          display_name: display_name || null,
          effective_from,
          effective_to: effective_to || null,
          is_active: true,
          notes: notes || null,
          created_by: createdBy,
        })
        .select()
        .single();

      if (error) throw error;

      // ✅ 同步 users.roles
      await syncRolesToUser(userId);

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('Error creating business identity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create business identity',
        error: error.message,
      });
    }
  });

  /**
   * PUT /api/employees/:userId/business-identity/:identityId/deactivate
   * 停用業務身份
   * 需要 Admin 權限
   */
  app.put('/api/employees/:userId/business-identity/:identityId/deactivate', requireAdmin, async (req, res) => {
    try {
      const { identityId } = req.params;
      const { effective_to } = req.body;

      const supabase = getSupabaseClient();

      // 使用 Supabase Client 更新業務身份
      const { data, error } = await supabase
        .from('business_identities')
        .update({
          is_active: false,
          effective_to: effective_to || new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', identityId)
        .select()
        .single();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Business identity not found',
        });
      }

      // ✅ 同步 users.roles（停用後重新計算角色）
      await syncRolesToUser(data.user_id);

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('Error deactivating business identity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to deactivate business identity',
        error: error.message,
      });
    }
  });

  /**
   * POST /api/employees/:userId/compensation
   * 新增薪資設定
   * 需要 Admin 權限
   */
  app.post('/api/employees/:userId/compensation', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const {
        base_salary,
        commission_type,
        commission_config,
        allowances,
        effective_from,
        effective_to,
        adjustment_reason,
      } = req.body;
      const createdBy = (req as any).user?.id;

      if (!effective_from) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: effective_from',
        });
      }

      // Deactivate previous active compensation
      await queryDatabase(`
        UPDATE employee_compensation
        SET is_active = false, effective_to = $2, updated_at = NOW()
        WHERE user_id = $1 AND is_active = true
      `, [userId, effective_from]);

      // Insert new compensation
      const insertQuery = `
        INSERT INTO employee_compensation (
          id, user_id, base_salary, commission_type, commission_config,
          allowances, effective_from, effective_to, adjustment_reason,
          is_active, created_by
        )
        VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, true, $9
        )
        RETURNING *
      `;

      const result = await queryDatabase(insertQuery, [
        userId,
        base_salary || null,
        commission_type || null,
        commission_config ? JSON.stringify(commission_config) : null,
        allowances ? JSON.stringify(allowances) : null,
        effective_from,
        effective_to || null,
        adjustment_reason || null,
        createdBy,
      ]);

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error creating compensation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create compensation',
        error: error.message,
      });
    }
  });

  /**
   * POST /api/employees/:userId/insurance
   * 新增勞健保設定
   * 需要 Admin 權限
   */
  app.post('/api/employees/:userId/insurance', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const {
        labor_insurance_grade,
        labor_insurance_amount,
        labor_insurance_employer_amount,
        health_insurance_grade,
        health_insurance_amount,
        health_insurance_employer_amount,
        pension_salary_base,
        pension_employer_rate,
        pension_employee_rate,
        pension_employer_amount,
        pension_employee_amount,
        effective_from,
        effective_to,
        notes,
      } = req.body;
      const createdBy = (req as any).user?.id;

      if (!effective_from) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: effective_from',
        });
      }

      // Deactivate previous active insurance
      await queryDatabase(`
        UPDATE employee_insurance
        SET is_active = false, effective_to = $2, updated_at = NOW()
        WHERE user_id = $1 AND is_active = true
      `, [userId, effective_from]);

      // Insert new insurance
      const insertQuery = `
        INSERT INTO employee_insurance (
          id, user_id,
          labor_insurance_grade, labor_insurance_amount, labor_insurance_employer_amount,
          health_insurance_grade, health_insurance_amount, health_insurance_employer_amount,
          pension_salary_base, pension_employer_rate, pension_employee_rate,
          pension_employer_amount, pension_employee_amount,
          effective_from, effective_to, notes, is_active, created_by
        )
        VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, $16
        )
        RETURNING *
      `;

      const result = await queryDatabase(insertQuery, [
        userId,
        labor_insurance_grade || null,
        labor_insurance_amount || null,
        labor_insurance_employer_amount || null,
        health_insurance_grade || null,
        health_insurance_amount || null,
        health_insurance_employer_amount || null,
        pension_salary_base || null,
        pension_employer_rate || null,
        pension_employee_rate || null,
        pension_employer_amount || null,
        pension_employee_amount || null,
        effective_from,
        effective_to || null,
        notes || null,
        createdBy,
      ]);

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error creating insurance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create insurance',
        error: error.message,
      });
    }
  });

  /**
   * PUT /api/employees/:userId/profile
   * 更新員工基本資料
   * Admin 或本人可以更新
   */
  app.put('/api/employees/:userId/profile', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).user?.id;
      const isAdmin = (req as any).user?.roles?.includes('admin');

      // 權限檢查（開發模式跳過）
      if (process.env.SKIP_AUTH !== 'true' && !isAdmin && currentUserId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only update your own profile',
        });
      }

      const {
        // Users table fields
        first_name,
        last_name,
        email,
        department,
        status,
        // Employee profiles table fields
        national_id,
        residential_address,
        mailing_address,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship,
        hire_date,
        resign_date,
        employment_type,
        bank_name,
        bank_account_number,
        bank_branch,
        hr_notes,
      } = req.body;

      const supabase = getSupabaseClient();

      // Update users table if any user fields are provided
      if (first_name !== undefined || last_name !== undefined || email !== undefined ||
          department !== undefined || status !== undefined) {
        const userUpdateData: any = { updated_at: new Date().toISOString() };
        if (first_name !== undefined) userUpdateData.first_name = first_name;
        if (last_name !== undefined) userUpdateData.last_name = last_name;
        if (email !== undefined) userUpdateData.email = email;
        if (department !== undefined) userUpdateData.department = department;
        if (status !== undefined) userUpdateData.status = status;

        // 使用 Supabase Client 更新員工資料
        const { data: updatedData, error: userError } = await supabase
          .from('users')
          .update(userUpdateData)
          .eq('id', userId)
          .select();

        if (userError) throw userError;
      }

      // Check if any profile fields are provided
      const hasProfileFields = national_id !== undefined || residential_address !== undefined ||
        mailing_address !== undefined || emergency_contact_name !== undefined ||
        emergency_contact_phone !== undefined || emergency_contact_relationship !== undefined ||
        hire_date !== undefined || resign_date !== undefined || employment_type !== undefined ||
        bank_name !== undefined || bank_account_number !== undefined || bank_branch !== undefined ||
        hr_notes !== undefined;

      let result = null;

      // Only update/create profile if profile fields are provided
      if (hasProfileFields) {
        // Check if profile exists
        const { data: existingProfile } = await supabase
          .from('employee_profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (existingProfile) {
          // Update existing profile
          const profileUpdateData: any = { updated_at: new Date().toISOString() };
          if (national_id !== undefined) profileUpdateData.national_id = national_id;
          if (residential_address !== undefined) profileUpdateData.residential_address = residential_address;
          if (mailing_address !== undefined) profileUpdateData.mailing_address = mailing_address;
          if (emergency_contact_name !== undefined) profileUpdateData.emergency_contact_name = emergency_contact_name;
          if (emergency_contact_phone !== undefined) profileUpdateData.emergency_contact_phone = emergency_contact_phone;
          if (emergency_contact_relationship !== undefined) profileUpdateData.emergency_contact_relationship = emergency_contact_relationship;
          if (hire_date !== undefined) profileUpdateData.hire_date = hire_date;
          if (resign_date !== undefined) profileUpdateData.resign_date = resign_date;
          if (employment_type !== undefined) profileUpdateData.employment_type = employment_type;
          if (bank_name !== undefined) profileUpdateData.bank_name = bank_name;
          if (bank_account_number !== undefined) profileUpdateData.bank_account_number = bank_account_number;
          if (bank_branch !== undefined) profileUpdateData.bank_branch = bank_branch;
          if (hr_notes !== undefined) profileUpdateData.hr_notes = hr_notes;

          const { data, error } = await supabase
            .from('employee_profiles')
            .update(profileUpdateData)
            .eq('user_id', userId)
            .select()
            .single();

          if (error) throw error;
          result = data;
        } else {
          // Create new profile only if currentUserId is valid
          if (!currentUserId) {
            throw new Error('Cannot create employee profile: user not authenticated');
          }

          const profileInsertData: any = {
            user_id: userId,
            created_by: currentUserId,
          };
          if (national_id !== undefined) profileInsertData.national_id = national_id;
          if (residential_address !== undefined) profileInsertData.residential_address = residential_address;
          if (mailing_address !== undefined) profileInsertData.mailing_address = mailing_address;
          if (emergency_contact_name !== undefined) profileInsertData.emergency_contact_name = emergency_contact_name;
          if (emergency_contact_phone !== undefined) profileInsertData.emergency_contact_phone = emergency_contact_phone;
          if (emergency_contact_relationship !== undefined) profileInsertData.emergency_contact_relationship = emergency_contact_relationship;
          if (hire_date !== undefined) profileInsertData.hire_date = hire_date;
          if (resign_date !== undefined) profileInsertData.resign_date = resign_date;
          if (employment_type !== undefined) profileInsertData.employment_type = employment_type;
          if (bank_name !== undefined) profileInsertData.bank_name = bank_name;
          if (bank_account_number !== undefined) profileInsertData.bank_account_number = bank_account_number;
          if (bank_branch !== undefined) profileInsertData.bank_branch = bank_branch;
          if (hr_notes !== undefined) profileInsertData.hr_notes = hr_notes;

          const { data, error } = await supabase
            .from('employee_profiles')
            .insert(profileInsertData)
            .select()
            .single();

          if (error) throw error;
          result = data;
        }
      }

      res.json({
        success: true,
        data: result,
        message: 'Employee profile updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating employee profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update employee profile',
        error: error.message,
      });
    }
  });

  /**
   * PUT /api/employees/:userId/business-identity/:identityId
   * 編輯角色身份資料
   */
  app.put('/api/employees/:userId/business-identity/:identityId', requireAdmin, async (req, res) => {
    try {
      const supabase = getSupabaseClient();
      const { userId, identityId } = req.params;
      const { display_name, effective_from, effective_to } = req.body;

      // 準備更新資料
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (display_name !== undefined) updateData.display_name = display_name;
      if (effective_from !== undefined) updateData.effective_from = effective_from;
      if (effective_to !== undefined) updateData.effective_to = effective_to;

      const { data, error } = await supabase
        .from('business_identities')
        .update(updateData)
        .eq('id', identityId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Business identity not found',
        });
      }

      res.json({
        success: true,
        data: data,
        message: '角色身份已更新',
      });
    } catch (error: any) {
      console.error('Error updating business identity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update business identity',
        error: error.message,
      });
    }
  });

  /**
   * DELETE /api/employees/:userId/business-identity/:identityId
   * 刪除角色身份
   */
  app.delete('/api/employees/:userId/business-identity/:identityId', requireAdmin, async (req, res) => {
    try {
      const supabase = getSupabaseClient();
      const { userId, identityId } = req.params;

      const { error } = await supabase
        .from('business_identities')
        .delete()
        .eq('id', identityId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      // ✅ 同步 users.roles（刪除後重新計算角色）
      await syncRolesToUser(userId);

      res.json({
        success: true,
        message: '角色身份已刪除',
      });
    } catch (error: any) {
      console.error('Error deleting business identity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete business identity',
        error: error.message,
      });
    }
  });

  /**
   * PUT /api/employees/:userId/compensation/:compensationId
   * 編輯薪資記錄
   */
  app.put('/api/employees/:userId/compensation/:compensationId', requireAdmin, async (req, res) => {
    try {
      const { userId, compensationId } = req.params;
      const { base_salary, commission_type, commission_rate, effective_from, adjustment_reason } = req.body;

      const query = `
        UPDATE employee_compensation
        SET
          base_salary = COALESCE($1, base_salary),
          commission_type = COALESCE($2, commission_type),
          commission_rate = COALESCE($3, commission_rate),
          effective_from = COALESCE($4, effective_from),
          adjustment_reason = COALESCE($5, adjustment_reason),
          updated_at = NOW()
        WHERE id = $6 AND user_id = $7
        RETURNING *
      `;

      const result = await queryDatabase(query, [
        base_salary,
        commission_type,
        commission_rate,
        effective_from,
        adjustment_reason,
        compensationId,
        userId,
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Compensation record not found',
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: '薪資記錄已更新',
      });
    } catch (error: any) {
      console.error('Error updating compensation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update compensation',
        error: error.message,
      });
    }
  });

  /**
   * PUT /api/employees/:userId/insurance/:insuranceId
   * 編輯勞健保記錄
   */
  app.put('/api/employees/:userId/insurance/:insuranceId', requireAdmin, async (req, res) => {
    try {
      const { userId, insuranceId } = req.params;
      const {
        labor_insurance_grade,
        labor_insurance_amount,
        health_insurance_grade,
        health_insurance_amount,
        pension_employer_rate,
        pension_employee_rate,
        effective_from,
        notes,
      } = req.body;

      const query = `
        UPDATE employee_insurance
        SET
          labor_insurance_grade = COALESCE($1, labor_insurance_grade),
          labor_insurance_amount = COALESCE($2, labor_insurance_amount),
          health_insurance_grade = COALESCE($3, health_insurance_grade),
          health_insurance_amount = COALESCE($4, health_insurance_amount),
          pension_employer_rate = COALESCE($5, pension_employer_rate),
          pension_employee_rate = COALESCE($6, pension_employee_rate),
          effective_from = COALESCE($7, effective_from),
          notes = COALESCE($8, notes),
          updated_at = NOW()
        WHERE id = $9 AND user_id = $10
        RETURNING *
      `;

      const result = await queryDatabase(query, [
        labor_insurance_grade,
        labor_insurance_amount,
        health_insurance_grade,
        health_insurance_amount,
        pension_employer_rate,
        pension_employee_rate,
        effective_from,
        notes,
        insuranceId,
        userId,
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Insurance record not found',
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: '勞健保記錄已更新',
      });
    } catch (error: any) {
      console.error('Error updating insurance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update insurance',
        error: error.message,
      });
    }
  });

  /**
   * DELETE /api/employees/:userId
   * 刪除員工（完全移除）
   *
   * 重要：此操作會刪除以下所有相關資料：
   * - users 記錄
   * - employee_profiles 記錄
   * - business_identities 記錄
   * - salary_records 記錄
   * - insurance_records 記錄
   * - 所有相關的業務資料
   *
   * 此操作無法復原，請謹慎使用
   */
  app.delete('/api/employees/:userId', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: '缺少使用者 ID',
        });
      }

      console.log(`[刪除員工] 開始刪除員工: ${userId}`);

      // 1. 檢查員工是否存在
      const userCheck = await queryDatabase(
        `SELECT id, email, first_name, last_name FROM users WHERE id = $1`,
        [userId]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '找不到該員工',
        });
      }

      const user = userCheck.rows[0];
      console.log(`[刪除員工] 找到員工: ${user.first_name} ${user.last_name || ''} (${user.email})`);

      // 2. 刪除相關資料（按照外鍵依賴順序）

      // 2.1 刪除勞健保記錄
      const insuranceResult = await queryDatabase(
        `DELETE FROM insurance_records WHERE user_id = $1`,
        [userId]
      );
      console.log(`[刪除員工] 已刪除 ${insuranceResult.rowCount || 0} 筆勞健保記錄`);

      // 2.2 刪除薪資記錄
      const salaryResult = await queryDatabase(
        `DELETE FROM salary_records WHERE user_id = $1`,
        [userId]
      );
      console.log(`[刪除員工] 已刪除 ${salaryResult.rowCount || 0} 筆薪資記錄`);

      // 2.3 刪除業務身份
      const identitiesResult = await queryDatabase(
        `DELETE FROM business_identities WHERE user_id = $1`,
        [userId]
      );
      console.log(`[刪除員工] 已刪除 ${identitiesResult.rowCount || 0} 筆業務身份`);

      // 2.4 刪除員工 profile
      const profileResult = await queryDatabase(
        `DELETE FROM employee_profiles WHERE user_id = $1`,
        [userId]
      );
      console.log(`[刪除員工] 已刪除 ${profileResult.rowCount || 0} 筆員工 profile`);

      // 2.5 最後刪除使用者本身
      const userResult = await queryDatabase(
        `DELETE FROM users WHERE id = $1`,
        [userId]
      );
      console.log(`[刪除員工] 已刪除使用者記錄`);

      console.log(`[刪除員工] ✅ 員工刪除完成: ${user.first_name} ${user.last_name || ''}`);

      res.json({
        success: true,
        message: `員工 ${user.first_name} ${user.last_name || ''} 已完全移除`,
      });
    } catch (error: any) {
      console.error('[刪除員工] ❌ 錯誤:', error);
      res.status(500).json({
        success: false,
        message: '刪除員工失敗',
        error: error.message,
      });
    }
  });
}

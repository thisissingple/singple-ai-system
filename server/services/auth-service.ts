/**
 * Authentication Service
 * 認證服務：處理登入、登出、密碼管理
 */

import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const SALT_ROUNDS = 10;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

// 建立 Supabase Client helper
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  roles: string[];
  department: string | null;
  status: string;
  must_change_password: boolean;
  profile_image_url: string | null;
  business_identities?: {
    identity_type: string;
    identity_code: string;
    display_name: string;
  }[];
}

/**
 * 密碼加密
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 驗證密碼
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * 檢查帳號是否鎖定
 */
async function isAccountLocked(userId: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('users')
    .select('locked_until')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return false;
  }

  const lockedUntil = data.locked_until;
  if (!lockedUntil) {
    return false;
  }

  return new Date(lockedUntil) > new Date();
}

/**
 * 重置登入失敗次數
 */
async function resetLoginAttempts(userId: string): Promise<void> {
  const supabase = getSupabaseClient();

  await supabase
    .from('users')
    .update({
      failed_login_attempts: 0,
      locked_until: null,
    })
    .eq('id', userId);
}

/**
 * 增加登入失敗次數
 */
async function incrementLoginAttempts(userId: string): Promise<void> {
  const supabase = getSupabaseClient();

  // 先取得當前失敗次數
  const { data: user } = await supabase
    .from('users')
    .select('failed_login_attempts')
    .eq('id', userId)
    .single();

  const newAttempts = (user?.failed_login_attempts || 0) + 1;
  const shouldLock = newAttempts >= MAX_LOGIN_ATTEMPTS;

  const updateData: any = {
    failed_login_attempts: newAttempts,
  };

  if (shouldLock) {
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + LOCK_DURATION_MINUTES);
    updateData.locked_until = lockUntil.toISOString();
  }

  await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId);
}

/**
 * 使用帳號密碼登入
 */
export async function loginWithPassword(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const supabase = getSupabaseClient();

    // 查詢使用者
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, roles, department, status, password_hash, must_change_password, profile_image_url, failed_login_attempts')
      .ilike('email', email)
      .limit(1);

    if (error) {
      console.error('查詢使用者失敗:', error);
      return {
        success: false,
        error: '登入失敗，請稍後再試',
      };
    }

    if (!users || users.length === 0) {
      return {
        success: false,
        error: '帳號或密碼錯誤',
      };
    }

    const user = users[0];

    // 轉換 password_hash（如果是 Buffer 則轉成字串）
    if (user.password_hash && Buffer.isBuffer(user.password_hash)) {
      user.password_hash = user.password_hash.toString('utf8');
    }

    // 檢查帳號狀態
    if (user.status !== 'active') {
      return {
        success: false,
        error: '帳號已停用或待審核，請聯絡管理員',
      };
    }

    // 檢查是否鎖定
    const locked = await isAccountLocked(user.id);
    if (locked) {
      return {
        success: false,
        error: `帳號已鎖定 ${LOCK_DURATION_MINUTES} 分鐘，請稍後再試`,
      };
    }

    // 檢查是否有設定密碼
    if (!user.password_hash) {
      return {
        success: false,
        error: '此帳號尚未設定密碼，請聯絡管理員',
      };
    }

    // 驗證密碼
    const passwordValid = await verifyPassword(password, user.password_hash);

    if (!passwordValid) {
      // 增加失敗次數
      await incrementLoginAttempts(user.id);

      const newAttempts = user.failed_login_attempts + 1;
      const remainingAttempts = MAX_LOGIN_ATTEMPTS - newAttempts;

      if (remainingAttempts > 0) {
        return {
          success: false,
          error: `帳號或密碼錯誤（剩餘 ${remainingAttempts} 次嘗試機會）`,
        };
      } else {
        return {
          success: false,
          error: `登入失敗次數過多，帳號已鎖定 ${LOCK_DURATION_MINUTES} 分鐘`,
        };
      }
    }

    // 登入成功，重置失敗次數
    await resetLoginAttempts(user.id);

    // 更新最後登入時間
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // 返回使用者資料
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        roles: user.roles || [],
        department: user.department,
        status: user.status,
        must_change_password: user.must_change_password || false,
        profile_image_url: user.profile_image_url,
      },
    };
  } catch (error: any) {
    console.error('登入錯誤:', error);
    return {
      success: false,
      error: '登入失敗，請稍後再試',
    };
  }
}

/**
 * 修改密碼
 */
export async function changePassword(
  userId: string,
  oldPassword: string | null,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 驗證新密碼強度
    if (newPassword.length < 6) {
      return {
        success: false,
        error: '密碼長度至少 6 個字元',
      };
    }

    // 如果提供舊密碼，需要驗證
    if (oldPassword !== null) {
      const query = `SELECT password_hash FROM users WHERE id = $1`;
      const result = await queryDatabase(query, [userId]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: '使用者不存在',
        };
      }

      const currentHash = result.rows[0].password_hash;
      if (currentHash) {
        const valid = await verifyPassword(oldPassword, currentHash);
        if (!valid) {
          return {
            success: false,
            error: '舊密碼錯誤',
          };
        }
      }
    }

    // 加密新密碼
    const newHash = await hashPassword(newPassword);

    // 更新密碼
    const updateQuery = `
      UPDATE users
      SET password_hash = $2,
          must_change_password = false,
          last_password_change_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
    `;

    await queryDatabase(updateQuery, [userId, newHash]);

    return { success: true };
  } catch (error: any) {
    console.error('修改密碼錯誤:', error);
    return {
      success: false,
      error: '修改密碼失敗，請稍後再試',
    };
  }
}

/**
 * 取得使用者資料（不含密碼）
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const supabase = getSupabaseClient();

    // 查詢使用者
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, roles, department, status, must_change_password, profile_image_url')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return null;
    }

    // 查詢業務身份
    const { data: identities } = await supabase
      .from('business_identities')
      .select('identity_type, identity_code, display_name')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('identity_type')
      .order('identity_code');

    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      roles: user.roles || [],
      department: user.department,
      status: user.status,
      must_change_password: user.must_change_password || false,
      profile_image_url: user.profile_image_url,
      business_identities: identities || [],
    };
  } catch (error: any) {
    console.error('取得使用者資料錯誤:', error);
    return null;
  }
}

/**
 * Admin 重設使用者密碼
 */
export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 驗證密碼強度
    if (newPassword.length < 6) {
      return {
        success: false,
        error: '密碼長度至少 6 個字元',
      };
    }

    // 加密密碼
    const passwordHash = await hashPassword(newPassword);

    // 更新密碼並標記需要修改
    const query = `
      UPDATE users
      SET password_hash = $2,
          must_change_password = true,
          failed_login_attempts = 0,
          locked_until = NULL,
          updated_at = NOW()
      WHERE id = $1
    `;

    await queryDatabase(query, [userId, passwordHash]);

    return { success: true };
  } catch (error: any) {
    console.error('重設密碼錯誤:', error);
    return {
      success: false,
      error: '重設密碼失敗，請稍後再試',
    };
  }
}

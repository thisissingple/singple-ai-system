/**
 * 權限過濾服務
 *
 * 功能：根據使用者角色和業務身份，自動建立資料查詢的過濾條件
 *
 * 使用情境：
 * - super_admin/admin → 看所有資料（不過濾）
 * - manager → 看部門資料
 * - teacher/consultant/sales → 只看自己相關的資料
 *
 * 範例：
 * const filter = await buildPermissionFilter(userId, 'trial_class_attendance');
 * const query = `SELECT * FROM trial_class_attendance WHERE ${filter}`;
 */

import { createPool, queryDatabase } from './pg-client';

// 使用者完整資訊（包含業務身份）
interface UserWithIdentities {
  id: string;
  roles: string[];
  department: string | null;
  identities: {
    teacher?: string[];    // 教師編號 ['T001']
    consultant?: string[]; // 諮詢師編號 ['C001']
    sales?: string[];      // 銷售編號 ['S001']
    telemarketing?: string[]; // 電訪編號 ['TM001']
  };
}

// 過濾選項
interface FilterOptions {
  userId: string;
  tableName: string;
  additionalConditions?: string; // 額外的過濾條件（如日期範圍）
}

/**
 * 取得使用者完整資訊（包含業務身份）
 */
async function getUserWithIdentities(userId: string): Promise<UserWithIdentities> {
  // 查詢使用者資訊
  const userResult = await queryDatabase(`
    SELECT
      id,
      roles,
      department
    FROM users
    WHERE id = $1
  `, [userId]);

  if (userResult.rows.length === 0) {
    throw new Error(`User not found: ${userId}`);
  }

  const user = userResult.rows[0];

  // 查詢所有業務身份
  const identitiesResult = await queryDatabase(`
    SELECT
      identity_type,
      identity_code
    FROM business_identities
    WHERE user_id = $1
      AND is_active = true
  `, [userId]);

  // 整理業務身份
  const identities: UserWithIdentities['identities'] = {};

  identitiesResult.rows.forEach((row: any) => {
    const type = row.identity_type as keyof UserWithIdentities['identities'];
    if (!identities[type]) {
      identities[type] = [];
    }
    identities[type]!.push(row.identity_code);
  });

  return {
    id: user.id,
    roles: user.roles || [],
    department: user.department,
    identities,
  };
}

/**
 * 建立權限過濾條件
 *
 * @param options - 過濾選項
 * @returns SQL WHERE 子句（不包含 WHERE 關鍵字）
 */
export async function buildPermissionFilter(options: FilterOptions): Promise<string> {
  const { userId, tableName, additionalConditions } = options;

  // 取得使用者完整資訊
  const user = await getUserWithIdentities(userId);

  // 1. super_admin 或 admin → 不過濾，看所有資料
  if (user.roles.includes('super_admin') || user.roles.includes('admin')) {
    return additionalConditions || '1=1';
  }

  // 2. 根據資料表類型建立過濾條件
  const filters: string[] = [];

  switch (tableName) {
    case 'trial_class_attendance':
      filters.push(...buildTrialClassAttendanceFilter(user));
      break;

    case 'income_expense_records':
      filters.push(...buildIncomeExpenseFilter(user));
      break;

    case 'cost_profit':
      filters.push(...buildCostProfitFilter(user));
      break;

    case 'teaching_quality_records':
    case 'teaching_quality_analysis':
      filters.push(...buildTeachingQualityFilter(user));
      break;

    default:
      // 預設：只看自己創建的資料
      filters.push(`created_by = '${user.id}'`);
  }

  // 3. 組合過濾條件
  let baseFilter = filters.length > 0 ? `(${filters.join(' OR ')})` : '1=0'; // 1=0 表示沒權限

  // 4. 加上額外條件
  if (additionalConditions) {
    baseFilter = `${baseFilter} AND (${additionalConditions})`;
  }

  return baseFilter;
}

/**
 * 建立體驗課出席記錄的過濾條件
 */
function buildTrialClassAttendanceFilter(user: UserWithIdentities): string[] {
  const filters: string[] = [];

  // manager → 看部門資料（如果有 department 欄位）
  if (user.roles.includes('manager') && user.department) {
    filters.push(`department = '${user.department}'`);
  }

  // teacher → 看自己的課程
  if (user.identities.teacher && user.identities.teacher.length > 0) {
    const teacherCodes = user.identities.teacher.map(code => `'${code}'`).join(',');
    filters.push(`teacher_code IN (${teacherCodes})`);
    // 也支援舊的 teacher_name 欄位
    // filters.push(`teacher_name = '${user.first_name}'`); // 需要取得 first_name
  }

  // consultant/sales → 看相關的資料
  if (user.identities.consultant && user.identities.consultant.length > 0) {
    const consultantCodes = user.identities.consultant.map(code => `'${code}'`).join(',');
    filters.push(`consultant_code IN (${consultantCodes})`);
  }

  if (user.identities.sales && user.identities.sales.length > 0) {
    const salesCodes = user.identities.sales.map(code => `'${code}'`).join(',');
    filters.push(`sales_code IN (${salesCodes})`);
  }

  return filters;
}

/**
 * 建立收支記錄的過濾條件
 */
function buildIncomeExpenseFilter(user: UserWithIdentities): string[] {
  const filters: string[] = [];

  // manager → 看部門資料
  if (user.roles.includes('manager') && user.department) {
    filters.push(`department = '${user.department}'`);
  }

  // teacher → 看自己相關的收支
  if (user.roles.includes('teacher')) {
    filters.push(`teacher_id = '${user.id}'`);
  }

  // consultant → 看自己相關的收支
  if (user.roles.includes('consultant')) {
    filters.push(`consultant_id = '${user.id}'`);
  }

  // sales → 看自己相關的收支
  if (user.roles.includes('sales')) {
    filters.push(`setter_id = '${user.id}'`);
  }

  // 創建人可以看自己創建的記錄
  filters.push(`created_by = '${user.id}'`);

  return filters;
}

/**
 * 建立成本獲利的過濾條件
 */
function buildCostProfitFilter(user: UserWithIdentities): string[] {
  const filters: string[] = [];

  // manager → 看部門資料
  if (user.roles.includes('manager') && user.department) {
    filters.push(`department = '${user.department}'`);
  }

  // teacher/consultant/sales → 看自己相關的資料
  // 注意：需要確認 cost_profit 表有哪些人員欄位
  if (user.roles.includes('teacher')) {
    filters.push(`teacher_id = '${user.id}'`);
  }

  if (user.roles.includes('consultant')) {
    filters.push(`consultant_id = '${user.id}'`);
  }

  // 創建人可以看自己創建的記錄
  filters.push(`created_by = '${user.id}'`);

  return filters;
}

/**
 * 建立教學品質記錄的過濾條件
 * 注意：teaching_quality_analysis 表只有 teacher_id，沒有 teacher_code
 */
function buildTeachingQualityFilter(user: UserWithIdentities): string[] {
  const filters: string[] = [];

  // manager → 看部門資料
  if (user.roles.includes('manager') && user.department) {
    filters.push(`department = '${user.department}'`);
  }

  // teacher → 只看自己的教學評鑑
  // teaching_quality_analysis 使用 teacher_id (UUID)，不是 teacher_code
  if (user.identities.teacher && user.identities.teacher.length > 0) {
    filters.push(`teacher_id = '${user.id}'`);
  }

  return filters;
}

/**
 * 快速檢查使用者是否有權限查看特定資料
 *
 * @param userId - 使用者 ID
 * @param roles - 必要的角色（OR 邏輯）
 * @returns true = 有權限
 */
export async function hasPermission(userId: string, roles: string[]): Promise<boolean> {
  const user = await getUserWithIdentities(userId);

  // super_admin 有所有權限
  if (user.roles.includes('super_admin')) {
    return true;
  }

  // 檢查是否有任一必要角色
  return roles.some(role => user.roles.includes(role));
}

/**
 * 檢查使用者是否可以編輯特定記錄
 *
 * @param userId - 使用者 ID
 * @param recordCreatedBy - 記錄的創建人 ID
 * @returns true = 可以編輯
 */
export async function canEditRecord(userId: string, recordCreatedBy: string): Promise<boolean> {
  const user = await getUserWithIdentities(userId);

  // super_admin/admin 可以編輯所有記錄
  if (user.roles.includes('super_admin') || user.roles.includes('admin')) {
    return true;
  }

  // manager 可以編輯部門內的記錄（需要進一步檢查）
  if (user.roles.includes('manager')) {
    // TODO: 檢查 recordCreatedBy 是否在同部門
    return true;
  }

  // 只能編輯自己創建的記錄
  return userId === recordCreatedBy;
}

/**
 * 取得使用者的業務編號（用於填寫表單時自動帶入）
 *
 * @param userId - 使用者 ID
 * @param identityType - 身份類型（teacher/consultant/sales）
 * @returns 業務編號陣列
 */
export async function getUserIdentityCodes(
  userId: string,
  identityType?: 'teacher' | 'consultant' | 'sales' | 'telemarketing'
): Promise<string[]> {
  const user = await getUserWithIdentities(userId);

  if (identityType) {
    return user.identities[identityType] || [];
  }

  // 回傳所有業務編號
  return Object.values(user.identities).flat();
}

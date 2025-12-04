/**
 * Teacher Name Service
 *
 * 動態從員工管理系統查詢教師名稱對應關係
 * 將 first_name（如：凱明、微書、詩容）轉換為 display_name（如：Karen、Vicky、Elena）
 */

import { queryDatabase } from './pg-client';

// 快取教師名稱對照表（避免每次都查資料庫）
let teacherNameCache: Map<string, string> | null = null;
let cacheLoadedAt: Date | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 分鐘快取

/**
 * 從資料庫載入教師名稱對照表
 * 查詢 users 和 business_identities 表，建立 first_name → display_name 的對應
 */
async function loadTeacherNameMap(): Promise<Map<string, string>> {
  const nameMap = new Map<string, string>();

  try {
    // 查詢所有教師的 first_name 和 display_name
    const result = await queryDatabase(`
      SELECT
        u.first_name,
        u.last_name,
        bi.display_name
      FROM users u
      INNER JOIN business_identities bi ON u.id = bi.user_id
      WHERE bi.identity_type = 'teacher'
        AND bi.is_active = true
        AND bi.display_name IS NOT NULL
        AND u.first_name IS NOT NULL
    `);

    for (const row of result.rows) {
      const firstName = row.first_name?.trim();
      const displayName = row.display_name?.trim();

      if (firstName && displayName && firstName !== displayName) {
        // first_name → display_name
        nameMap.set(firstName, displayName);

        // 如果有 last_name，也加入 last_name + first_name 的組合
        if (row.last_name) {
          const fullName = `${row.last_name}${firstName}`.trim();
          nameMap.set(fullName, displayName);
        }
      }
    }

    console.log(`✅ 教師名稱對照表已載入: ${nameMap.size} 個對應`);
    if (nameMap.size > 0) {
      const entries = Array.from(nameMap.entries()).map(([k, v]) => `${k}→${v}`).join(', ');
      console.log(`   對應: ${entries}`);
    }

  } catch (error) {
    console.error('❌ 載入教師名稱對照表失敗:', error);
  }

  return nameMap;
}

/**
 * 取得教師名稱對照表（帶快取）
 */
async function getTeacherNameMap(): Promise<Map<string, string>> {
  const now = new Date();

  // 檢查快取是否有效
  if (teacherNameCache && cacheLoadedAt) {
    const age = now.getTime() - cacheLoadedAt.getTime();
    if (age < CACHE_TTL_MS) {
      return teacherNameCache;
    }
  }

  // 重新載入
  teacherNameCache = await loadTeacherNameMap();
  cacheLoadedAt = now;

  return teacherNameCache;
}

/**
 * 正規化教師名稱
 * 將中文名稱（如：凱明）轉換為系統使用的顯示名稱（如：Karen）
 *
 * @param name 原始教師名稱
 * @param defaultValue 找不到對應時的預設值
 * @returns 正規化後的教師名稱
 */
export async function normalizeTeacherName(
  name: string | null | undefined,
  defaultValue: string = '未分配'
): Promise<string> {
  if (!name) return defaultValue;

  const trimmed = name.trim();
  if (!trimmed) return defaultValue;

  const nameMap = await getTeacherNameMap();

  // 直接查找
  if (nameMap.has(trimmed)) {
    return nameMap.get(trimmed)!;
  }

  // 如果找不到對應，返回原始名稱
  return trimmed;
}

/**
 * 同步版本的正規化教師名稱（使用快取）
 * 適合在已經載入快取後的批次處理
 *
 * ⚠️ 注意：首次使用前需要先呼叫 ensureTeacherNameCacheLoaded()
 */
export function normalizeTeacherNameSync(
  name: string | null | undefined,
  defaultValue: string = '未分配'
): string {
  if (!name) return defaultValue;

  const trimmed = name.trim();
  if (!trimmed) return defaultValue;

  // 使用快取（可能為空）
  if (teacherNameCache && teacherNameCache.has(trimmed)) {
    return teacherNameCache.get(trimmed)!;
  }

  return trimmed;
}

/**
 * 確保教師名稱快取已載入
 * 在批次處理前呼叫，避免每筆資料都查詢資料庫
 */
export async function ensureTeacherNameCacheLoaded(): Promise<void> {
  await getTeacherNameMap();
}

/**
 * 清除快取（強制下次重新載入）
 */
export function clearTeacherNameCache(): void {
  teacherNameCache = null;
  cacheLoadedAt = null;
  console.log('🔄 教師名稱快取已清除');
}

/**
 * 取得快取狀態（除錯用）
 */
export function getTeacherNameCacheStatus(): {
  isLoaded: boolean;
  size: number;
  loadedAt: Date | null;
  entries: [string, string][];
} {
  return {
    isLoaded: teacherNameCache !== null,
    size: teacherNameCache?.size ?? 0,
    loadedAt: cacheLoadedAt,
    entries: teacherNameCache ? Array.from(teacherNameCache.entries()) : [],
  };
}

export default {
  normalizeTeacherName,
  normalizeTeacherNameSync,
  ensureTeacherNameCacheLoaded,
  clearTeacherNameCache,
  getTeacherNameCacheStatus,
};

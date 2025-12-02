/**
 * PostgreSQL Direct Connection Service
 *
 * 使用直接 PostgreSQL 連線，繞過 Supabase PostgREST Schema Cache 問題
 *
 * 適用場景：
 * - 表單系統（頻繁寫入）
 * - Schema 結構頻繁變動的表
 * - 需要複雜 SQL 查詢的場景
 *
 * 使用方式：
 * ```typescript
 * import { queryDatabase, createPool } from './services/pg-client';
 *
 * // 方式 1: 單次查詢（自動管理連線）
 * const result = await queryDatabase(
 *   'SELECT * FROM users WHERE role = $1',
 *   ['teacher']
 * );
 *
 * // 方式 2: 多次查詢（手動管理連線）
 * const pool = createPool();
 * const result1 = await pool.query('SELECT ...');
 * const result2 = await pool.query('INSERT ...');
 * await pool.end();
 * ```
 */

import pkg from 'pg';
const { Pool } = pkg;

// 共享連線池（避免頻繁創建/關閉連線導致 Supabase pooler 超時）
let sharedTransactionPool: ReturnType<typeof Pool.prototype.constructor> | null = null;
let sharedSessionPool: ReturnType<typeof Pool.prototype.constructor> | null = null;

/**
 * 設置連線池錯誤處理
 */
function setupPoolErrorHandler(pool: ReturnType<typeof Pool.prototype.constructor>, mode: string) {
  pool.on('error', (err: any) => {
    console.error(`❌ [${mode}] Unexpected database connection error:`, err.message);
    console.error('   Error code:', err.code);
    console.error('   This error has been caught and will not crash the server.');

    if (err.message?.includes('termination') || err.message?.includes('shutdown')) {
      console.error('⚠️  This appears to be a Supabase pooler timeout.');
      console.error('   Consider using Session Pooler (port 6543) instead of Transaction Pooler (port 5432)');
      console.error('   Or optimize queries to complete faster.');
    }
  });
}

/**
 * 獲取或創建共享連線池
 * @param mode - 'transaction' for simple queries, 'session' for complex operations
 */
export function getSharedPool(mode: 'transaction' | 'session' = 'transaction') {
  if (mode === 'session') {
    if (!sharedSessionPool) {
      let dbUrl = process.env.SUPABASE_SESSION_DB_URL || process.env.SESSION_DB_URL || process.env.SUPABASE_DB_URL;
      if (!dbUrl) {
        throw new Error('資料庫 URL 未配置 (SUPABASE_DB_URL)');
      }
      // 自動將端口 5432 (Transaction Pooler) 轉換為 6543 (Session Pooler)
      // Session mode 需要長連線支持，Transaction Pooler 會強制斷線
      if (dbUrl.includes('pooler.supabase.com:5432')) {
        dbUrl = dbUrl.replace(':5432', ':6543');
        console.log('🔄 [Session Pool] Auto-switched to Session Pooler (port 6543)');
      }
      sharedSessionPool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,
        query_timeout: 60000,
      });
      setupPoolErrorHandler(sharedSessionPool, 'session');
    }
    return sharedSessionPool;
  } else {
    if (!sharedTransactionPool) {
      const dbUrl = process.env.SUPABASE_DB_URL;
      if (!dbUrl) {
        throw new Error('資料庫 URL 未配置 (SUPABASE_DB_URL)');
      }
      sharedTransactionPool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: 10000,
        query_timeout: 30000,
      });
      setupPoolErrorHandler(sharedTransactionPool, 'transaction');
    }
    return sharedTransactionPool;
  }
}

/**
 * 建立 PostgreSQL 連線池（向後兼容，但現在返回共享池）
 * @param mode - 'transaction' for simple queries, 'session' for complex operations
 * @deprecated 使用 getSharedPool() 代替
 */
export function createPool(mode: 'transaction' | 'session' = 'transaction') {
  return getSharedPool(mode);
}

/**
 * 單次查詢（使用共享連線池）
 *
 * @param query SQL 查詢語句
 * @param params 查詢參數
 * @param mode - 'transaction' 用於讀取, 'session' 用於寫入
 * @returns 查詢結果
 */
export async function queryDatabase(query: string, params?: any[], mode: 'transaction' | 'session' = 'transaction') {
  const pool = getSharedPool(mode);
  const result = await pool.query(query, params);
  return result;
  // 注意：不再關閉 pool，使用共享連線池
}

/**
 * 執行 INSERT 並回傳插入的資料
 */
export async function insertAndReturn(
  table: string,
  data: Record<string, any>,
  returnColumns: string[] = ['*']
) {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

  const query = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${placeholders})
    RETURNING ${returnColumns.join(', ')}
  `;

  // ✅ 使用 'session' mode 執行 INSERT（寫入操作）
  const result = await queryDatabase(query, values, 'session');
  return result.rows[0];
}

/**
 * 執行 UPDATE 並回傳更新的資料
 * 使用 direct SQL (不使用 prepared statements，避免 Transaction Mode 限制)
 */
export async function updateAndReturn(
  table: string,
  data: Record<string, any>,
  whereClause: string,
  whereParams: any[],
  returnColumns: string[] = ['*']
) {
  const pool = getSharedPool('session');

  // 使用 parameterized query 避免 SQL injection
  const columns = Object.keys(data);
  const values = Object.values(data);

  // 建立參數索引
  const setClause = columns.map((col, i) => `"${col}" = $${i + 1}`).join(', ');
  const allParams = [...values, ...whereParams];

  // 更新 WHERE 子句中的參數索引
  let paramIndex = values.length + 1;
  const adjustedWhereClause = whereClause.replace(/\$(\d+)/g, () => `$${paramIndex++}`);

  const query = `
    UPDATE "${table}"
    SET ${setClause}
    WHERE ${adjustedWhereClause}
    RETURNING ${returnColumns.join(', ')}
  `;

  const result = await pool.query(query, allParams);
  return result.rows;
  // 注意：不再關閉 pool，使用共享連線池
}

/**
 * 檢查資料庫連線
 */
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await queryDatabase('SELECT NOW() as current_time');
    return {
      success: true,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

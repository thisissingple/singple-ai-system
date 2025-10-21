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

/**
 * 建立 PostgreSQL 連線池
 * @param mode - 'transaction' for simple queries, 'session' for complex operations
 */
export function createPool(mode: 'transaction' | 'session' = 'transaction') {
  // Transaction Mode: 適用於簡單讀取查詢
  // Session Mode: 適用於複雜操作、Prepared Statements、Transactions
  const dbUrl = mode === 'session'
    ? (process.env.SUPABASE_SESSION_DB_URL || process.env.SUPABASE_DB_URL)
    : process.env.SUPABASE_DB_URL;

  if (!dbUrl) {
    throw new Error('資料庫 URL 未配置 (SUPABASE_DB_URL)');
  }

  return new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    // 連線池設定
    max: 20,
    idleTimeoutMillis: 30000, // 閒置連線逾時（30秒）
    connectionTimeoutMillis: 10000, // 連線逾時（10秒）
    query_timeout: 30000, // 查詢逾時（30秒）
  });
}

/**
 * 單次查詢（自動管理連線）
 *
 * @param query SQL 查詢語句
 * @param params 查詢參數
 * @param mode - 'transaction' 用於讀取, 'session' 用於寫入
 * @returns 查詢結果
 */
export async function queryDatabase(query: string, params?: any[], mode: 'transaction' | 'session' = 'transaction') {
  const pool = createPool(mode);

  try {
    const result = await pool.query(query, params);
    return result;
  } finally {
    await pool.end();
  }
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

  const result = await queryDatabase(query, values);
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
  const pool = createPool();

  try {
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
  } finally {
    await pool.end();
  }
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

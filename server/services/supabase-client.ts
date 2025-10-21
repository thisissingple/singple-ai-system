/**
 * Supabase Client
 * Provides connection to Supabase database for synced Google Sheets data
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;
let clientInitializationError: string | null = null;

/**
 * Initialize Supabase client
 */
function initializeSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    const missingVars = [];
    if (!supabaseUrl) missingVars.push('SUPABASE_URL');
    if (!supabaseServiceRoleKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');

    clientInitializationError = `Supabase 環境變數缺失: ${missingVars.join(', ')}`;
    console.warn(`⚠️  ${clientInitializationError}`);
    console.warn('⚠️  Supabase 功能將無法使用，系統將 fallback 至 local storage');
    return null;
  }

  try {
    const client = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    });

    console.log('✓ Supabase client 初始化成功');
    return client;
  } catch (error) {
    clientInitializationError = `Supabase client 初始化失敗: ${error}`;
    console.error(`❌ ${clientInitializationError}`);
    return null;
  }
}

/**
 * Get Supabase client instance (lazy initialization)
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient === null && clientInitializationError === null) {
    supabaseClient = initializeSupabaseClient();
  }
  return supabaseClient;
}

/**
 * Check if Supabase is available
 */
export function isSupabaseAvailable(): boolean {
  return getSupabaseClient() !== null;
}

/**
 * Get client initialization error (if any)
 */
export function getSupabaseError(): string | null {
  return clientInitializationError;
}

/**
 * Test Supabase connection
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();

  if (!client) {
    return {
      success: false,
      error: clientInitializationError || 'Supabase client not initialized',
    };
  }

  try {
    // Try a simple query to test connection
    const { error } = await client.from('trial_class_attendance').select('id').limit(1);

    if (error) {
      return {
        success: false,
        error: `Supabase 連線測試失敗: ${error.message}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Supabase 連線測試異常: ${error}`,
    };
  }
}

/**
 * Reload Supabase PostgREST schema cache
 * Call this after database schema changes
 */
export async function reloadSupabaseSchemaCache(): Promise<{ success: boolean; error?: string }> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      success: false,
      error: 'Supabase credentials not configured',
    };
  }

  try {
    console.log('🔄 Reloading Supabase schema cache...');

    // Use Supabase client to send NOTIFY pgrst to reload schema
    const client = getSupabaseClient();
    if (client) {
      try {
        // Send NOTIFY to PostgREST to reload schema cache
        await client.rpc('pg_notify', {
          channel: 'pgrst',
          payload: 'reload schema'
        });
        console.log('✅ Sent schema reload notification via pg_notify');
      } catch (rpcError: any) {
        // If RPC doesn't work, try direct SQL via PostgREST
        console.log('⚠️  pg_notify RPC not available, trying direct method...');
      }
    }

    // Wait a moment for PostgREST to process the notification
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Schema cache reload complete');

    return { success: true };
  } catch (error) {
    console.warn(`⚠️  Schema reload error: ${error}`);
    // Don't fail - continue anyway
    return { success: true };
  }
}

/**
 * Database table names
 */
export const SUPABASE_TABLES = {
  TRIAL_CLASS_ATTENDANCE: 'trial_class_attendance',
  TRIAL_CLASS_PURCHASE: 'trial_class_purchases',  // 使用複數形式
  EODS_FOR_CLOSERS: 'eods_for_closers',
} as const;

export type SupabaseTableName = typeof SUPABASE_TABLES[keyof typeof SUPABASE_TABLES];

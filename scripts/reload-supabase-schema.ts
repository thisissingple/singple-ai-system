/**
 * Reload Supabase PostgREST Schema Cache
 * Run this after database schema changes (new tables, columns, etc.)
 */

import pkg from 'pg';
const { Client } = pkg;

async function reloadSchema() {
  const dbUrl = process.env.SUPABASE_DB_URL;

  if (!dbUrl) {
    console.error('❌ SUPABASE_DB_URL not set');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
    console.log('🔄 Reloading Supabase PostgREST schema cache...');

    // Send NOTIFY to reload schema
    await client.query("NOTIFY pgrst, 'reload schema'");

    console.log('✅ Schema cache reload signal sent');
    console.log('⏳ Waiting for PostgREST to process...');

    // Wait for PostgREST to reload
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('✅ Schema cache reload complete');
  } catch (error) {
    console.error('❌ Error reloading schema:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

reloadSchema();

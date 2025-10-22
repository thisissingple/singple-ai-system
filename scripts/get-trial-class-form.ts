/**
 * Get Trial Class Form Configuration
 * 取得體驗課表單配置
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error('❌ Missing SUPABASE_DB_URL');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: dbUrl });

async function main() {
  try {
    console.log('🔍 Searching for trial class form...\n');

    // 查詢體驗課表單
    const result = await pool.query(`
      SELECT
        id,
        name,
        description,
        fields,
        storage_type,
        target_table,
        display_locations,
        status
      FROM custom_forms
      WHERE name ILIKE '%體驗課%' OR name ILIKE '%trial%'
      ORDER BY created_at DESC
    `);

    if (result.rows.length === 0) {
      console.log('❌ No trial class form found!');
      console.log('ℹ️  You may need to create one first.');
      await pool.end();
      return;
    }

    console.log(`✅ Found ${result.rows.length} form(s):\n`);

    result.rows.forEach((form, index) => {
      console.log(`${index + 1}. ${form.name}`);
      console.log(`   ID: ${form.id}`);
      console.log(`   Description: ${form.description || 'N/A'}`);
      console.log(`   Storage Type: ${form.storage_type}`);
      console.log(`   Target Table: ${form.target_table || 'N/A'}`);
      console.log(`   Status: ${form.status}`);
      console.log(`   Display Locations: ${JSON.stringify(form.display_locations)}`);
      console.log(`   Fields: ${form.fields.length} fields`);
      console.log('');

      form.fields.forEach((field: any, i: number) => {
        console.log(`      ${i + 1}. ${field.label} (${field.type})`);
        console.log(`         - ID: ${field.id}`);
        console.log(`         - Required: ${field.required ? 'Yes' : 'No'}`);
        if (field.options) {
          console.log(`         - Options: ${JSON.stringify(field.options)}`);
        }
        if (field.dataSource) {
          console.log(`         - Data Source: ${field.dataSource}`);
        }
      });
      console.log('');
    });

    // 提供使用說明
    const firstForm = result.rows[0];
    console.log('━'.repeat(80));
    console.log('\n📋 Usage:\n');
    console.log(`Public form URL (to be created):`);
    console.log(`https://singple-ai-system.zeabur.app/forms/public/${firstForm.id}\n`);
    console.log(`API endpoint for submission:`);
    console.log(`POST /api/forms/custom/${firstForm.id}/submit\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

main();

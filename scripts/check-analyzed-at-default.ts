import { createPool } from '../server/services/pg-client.ts';
import * as dotenv from 'dotenv';

dotenv.config({ override: true });

async function checkAnalyzedAtDefault() {
  const pool = createPool('session');

  try {
    const result = await pool.query(`
      SELECT column_name, column_default, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'consultation_quality_analysis'
      AND column_name IN ('analyzed_at', 'created_at', 'generated_at')
      ORDER BY ordinal_position
    `);

    console.log('consultation_quality_analysis timestamp columns:\n');
    result.rows.forEach(row => {
      console.log(`Column: ${row.column_name}`);
      console.log(`  Type: ${row.data_type}`);
      console.log(`  Default: ${row.column_default || 'NULL'}`);
      console.log(`  Nullable: ${row.is_nullable}`);
      console.log('');
    });

    // Also check consultation_chat_recaps
    const recapResult = await pool.query(`
      SELECT column_name, column_default, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'consultation_chat_recaps'
      AND column_name IN ('analyzed_at', 'created_at', 'generated_at')
      ORDER BY ordinal_position
    `);

    console.log('consultation_chat_recaps timestamp columns:\n');
    recapResult.rows.forEach(row => {
      console.log(`Column: ${row.column_name}`);
      console.log(`  Type: ${row.data_type}`);
      console.log(`  Default: ${row.column_default || 'NULL'}`);
      console.log(`  Nullable: ${row.is_nullable}`);
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAnalyzedAtDefault().catch(console.error);

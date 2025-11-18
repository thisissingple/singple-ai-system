import dotenv from 'dotenv';
import { createPool } from '../server/services/pg-client';

dotenv.config({ override: true });

async function checkColumns() {
  const pool = createPool('session');

  try {
    console.log('🔍 Checking teaching_quality_analysis table columns...\n');

    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'teaching_quality_analysis'
      ORDER BY ordinal_position
    `);

    console.log('📋 All columns in teaching_quality_analysis:');
    console.table(result.rows);

    console.log('\n🔍 Looking for cost/token related columns:');
    const costColumns = result.rows.filter(row =>
      row.column_name.includes('cost') ||
      row.column_name.includes('token') ||
      row.column_name.includes('api')
    );

    if (costColumns.length > 0) {
      console.log('✅ Found cost/token columns:');
      console.table(costColumns);
    } else {
      console.log('❌ No cost/token columns found in teaching_quality_analysis table');
      console.log('💡 This means we need to add api_cost_usd column to track AI analysis costs');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkColumns();

import dotenv from 'dotenv';
import { createPool } from '../server/services/pg-client';

dotenv.config({ override: true });

async function rollback() {
  const pool = createPool('session');

  try {
    console.log('🔄 Rolling back migration 057...\n');

    // Step 1: Drop the Chinese constraint first
    await pool.query(`
      ALTER TABLE student_knowledge_base
      DROP CONSTRAINT IF EXISTS student_knowledge_base_conversion_status_check;
    `);

    // Step 2: Update Chinese values back to English (if any exist)
    await pool.query(`
      UPDATE student_knowledge_base
      SET conversion_status = CASE conversion_status
        WHEN '已轉高' THEN 'purchased_high'
        WHEN '未轉高' THEN 'not_purchased'
        WHEN '體驗中' THEN 'purchased_trial'
        WHEN '未開始' THEN 'not_purchased'
        ELSE conversion_status
      END
      WHERE conversion_status IN ('已轉高', '未轉高', '體驗中', '未開始');
    `);

    // Step 3: Restore the original English constraint
    await pool.query(`
      ALTER TABLE student_knowledge_base
      ADD CONSTRAINT student_knowledge_base_conversion_status_check
      CHECK (conversion_status = ANY (ARRAY['not_purchased'::text, 'purchased_trial'::text, 'purchased_high'::text, 'renewed_high'::text]));
    `);

    console.log('✅ Migration 057 rolled back successfully!\n');

    // Verify
    const result = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'student_knowledge_base'::regclass
      AND contype = 'c'
      AND conname = 'student_knowledge_base_conversion_status_check'
    `);

    console.table(result.rows);

  } catch (error: any) {
    console.error('❌ Rollback failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

rollback();

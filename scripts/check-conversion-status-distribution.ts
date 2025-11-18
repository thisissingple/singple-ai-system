import dotenv from 'dotenv';
import { createPool } from '../server/services/pg-client';

dotenv.config({ override: true });

async function checkDistribution() {
  const pool = createPool('session');

  try {
    console.log('🔍 Checking conversion status distribution...\n');

    const result = await pool.query(`
      SELECT
        conversion_status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
      FROM student_knowledge_base
      WHERE is_deleted = false
      GROUP BY conversion_status
      ORDER BY count DESC
    `);

    console.log('=== Conversion Status Distribution ===');
    console.table(result.rows);

    // Show a few sample students for each status
    console.log('\n=== Sample Students by Status ===\n');

    const statuses = ['已轉高', '未轉高', '體驗中', '未開始'];

    for (const status of statuses) {
      const samples = await pool.query(`
        SELECT
          student_name,
          student_email,
          total_classes,
          total_consultations,
          conversion_status
        FROM student_knowledge_base
        WHERE conversion_status = $1
        AND is_deleted = false
        LIMIT 3
      `, [status]);

      if (samples.rows.length > 0) {
        console.log(`--- ${status} (${samples.rows.length} samples) ---`);
        console.table(samples.rows);
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDistribution();

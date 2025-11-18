import dotenv from 'dotenv';
import { createPool } from '../server/services/pg-client';

dotenv.config({ override: true });

async function testCountQuery() {
  const pool = createPool('session');

  try {
    console.log('🧪 Testing count query with LEFT JOIN...\n');

    // This is the exact count query from routes.ts:8910-8922
    const result = await pool.query(`
      SELECT COUNT(*) as total
      FROM (
        SELECT skb.student_email
        FROM student_knowledge_base skb
        LEFT JOIN trial_class_attendance tca ON skb.student_email = tca.student_email
        LEFT JOIN eods_for_closers eods ON skb.student_email = eods.student_email
        LEFT JOIN trial_class_purchases tcp ON skb.student_email = tcp.student_email
        WHERE (skb.is_deleted = false OR skb.is_deleted IS NULL)
        GROUP BY skb.student_email
      ) AS filtered_students
    `);

    console.log(`✅ Count query executed successfully`);
    console.log(`📊 Total: ${result.rows[0].total}`);

  } catch (error: any) {
    console.error('❌ Count query failed:', error.message);
    console.error('\n🔍 Full error:');
    console.error(error);
  } finally {
    await pool.end();
  }
}

testCountQuery();

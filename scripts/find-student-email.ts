import { createPool } from '../server/services/pg-client.ts';
import * as dotenv from 'dotenv';

dotenv.config({ override: true });

async function findStudent() {
  const pool = createPool('session');

  const result = await pool.query(`
    SELECT student_email, student_name
    FROM student_knowledge_base
    WHERE student_name LIKE '%童%'
    LIMIT 5
  `);

  console.log('學員列表:');
  result.rows.forEach(r => console.log(`  ${r.student_name} (${r.student_email})`));

  await pool.end();
}

findStudent().catch(console.error);

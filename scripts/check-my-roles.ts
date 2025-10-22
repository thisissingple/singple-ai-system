/**
 * Check user roles
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });

async function main() {
  const result = await pool.query(`
    SELECT first_name, email, role, roles
    FROM users
    WHERE email = 'xk4xk4563022@gmail.com'
  `);

  console.log('Your account:');
  console.log(result.rows[0]);

  console.log('\n\nAll teachers:');
  const teachers = await pool.query(`
    SELECT first_name, roles
    FROM users
    WHERE 'teacher' = ANY(roles)
    AND status = 'active'
    AND first_name IS NOT NULL
    ORDER BY first_name ASC
  `);

  teachers.rows.forEach(t => {
    console.log(`- ${t.first_name}: ${JSON.stringify(t.roles)}`);
  });

  await pool.end();
}

main();

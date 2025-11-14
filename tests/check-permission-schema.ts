import { createPool } from '../server/services/pg-client';

async function checkSchema() {
  const pool = createPool();

  try {
    // 查看 permission_modules 表結構
    console.log('📋 permission_modules 表結構:');
    const modulesSchema = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'permission_modules'
      ORDER BY ordinal_position
    `);
    modulesSchema.rows.forEach(r => {
      console.log(`  - ${r.column_name} (${r.data_type})`);
    });

    // 查看 user_permissions 表結構
    console.log('\n📋 user_permissions 表結構:');
    const permsSchema = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'user_permissions'
      ORDER BY ordinal_position
    `);
    permsSchema.rows.forEach(r => {
      console.log(`  - ${r.column_name} (${r.data_type})`);
    });

    // 查看外鍵約束
    console.log('\n📋 user_permissions 外鍵約束:');
    const fkResult = await pool.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'user_permissions'
    `);
    fkResult.rows.forEach(r => {
      console.log(`  ${r.column_name} -> ${r.foreign_table_name}.${r.foreign_column_name}`);
    });

    // 查看模組樣本
    console.log('\n📋 permission_modules 樣本資料:');
    const sample = await pool.query(`SELECT * FROM permission_modules LIMIT 3`);
    sample.rows.forEach((row, idx) => {
      console.log(`\n[${idx + 1}]`, JSON.stringify(row, null, 2));
    });

  } finally {
    await pool.end();
  }
}

checkSchema();

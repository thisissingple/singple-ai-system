/**
 * Run Migration 074: Performance Bonus System
 */
import { queryDatabase } from '../server/services/pg-client';

async function runMigration() {
  console.log('🚀 Running Migration 074: Performance Bonus System...\n');

  const statements = [
    // 1. Add has_performance_bonus to employee_salary_settings
    `ALTER TABLE employee_salary_settings
     ADD COLUMN IF NOT EXISTS has_performance_bonus BOOLEAN DEFAULT false`,

    // 2. Add performance tracking columns to salary_calculations
    `ALTER TABLE salary_calculations
     ADD COLUMN IF NOT EXISTS performance_score INTEGER DEFAULT 10`,

    `ALTER TABLE salary_calculations
     ADD COLUMN IF NOT EXISTS consecutive_full_score_count INTEGER DEFAULT 0`,

    `ALTER TABLE salary_calculations
     ADD COLUMN IF NOT EXISTS consecutive_bonus DECIMAL(15,2) DEFAULT 0`,

    `ALTER TABLE salary_calculations
     ADD COLUMN IF NOT EXISTS commission_deduction_rate DECIMAL(5,2) DEFAULT 0`,

    // 3. Set default employees with performance bonus eligibility
    `UPDATE employee_salary_settings
     SET has_performance_bonus = true
     WHERE commission_rate > 0 OR role_type IN ('closer', 'teacher')`,
  ];

  for (const stmt of statements) {
    try {
      await queryDatabase(stmt, [], 'session');
      console.log('✅ Executed:', stmt.substring(0, 60).replace(/\n/g, ' ') + '...');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('⏭️  Skipped (already exists):', stmt.substring(0, 60).replace(/\n/g, ' ') + '...');
      } else {
        console.error('❌ Error:', e.message);
      }
    }
  }

  // Verify the changes
  console.log('\n📊 Verifying changes...');

  const result1 = await queryDatabase(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'employee_salary_settings'
    AND column_name = 'has_performance_bonus'
  `);
  console.log('employee_salary_settings.has_performance_bonus:', result1.rows.length > 0 ? '✅ Added' : '❌ Missing');

  const result2 = await queryDatabase(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'salary_calculations'
    AND column_name IN ('performance_score', 'consecutive_full_score_count', 'consecutive_bonus', 'commission_deduction_rate')
  `);
  console.log('salary_calculations performance columns:', result2.rows.length === 4 ? '✅ All added' : `⚠️ ${result2.rows.length}/4 added`);

  const result3 = await queryDatabase(`
    SELECT employee_name, has_performance_bonus
    FROM employee_salary_settings
    WHERE has_performance_bonus = true
  `);
  console.log('Employees with performance bonus eligibility:', result3.rows.length);

  console.log('\n🎉 Migration 074 complete!');
  process.exit(0);
}

runMigration().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});

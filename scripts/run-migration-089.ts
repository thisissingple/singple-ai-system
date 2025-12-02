/**
 * 執行 Migration 089: 按角色區分的抽成設定
 */
import { createPool } from '../server/services/pg-client';

async function runMigration089() {
  const pool = createPool();

  try {
    console.log('🚀 執行 Migration 089...');

    // Step 1: 建立 employee_role_commission 表
    console.log('📋 Step 1: 建立 employee_role_commission 表...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee_role_commission (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_type VARCHAR(50) NOT NULL,
        commission_type VARCHAR(50) NOT NULL DEFAULT 'fixed_rate',
        commission_rate DECIMAL(5,2),
        other_revenue_rate DECIMAL(5,2) DEFAULT 8.00,
        tier1_max_revenue DECIMAL(15,2),
        tier1_commission_amount DECIMAL(15,2),
        tier2_max_revenue DECIMAL(15,2),
        tier2_commission_amount DECIMAL(15,2),
        notes TEXT,
        effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
        effective_to DATE,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by UUID REFERENCES users(id)
      )
    `);
    console.log('   ✅ 表已建立');

    // Step 2: 建立索引
    console.log('📋 Step 2: 建立索引...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_role_commission_user_id ON employee_role_commission(user_id);
      CREATE INDEX IF NOT EXISTS idx_role_commission_role_type ON employee_role_commission(role_type);
      CREATE INDEX IF NOT EXISTS idx_role_commission_active ON employee_role_commission(is_active);
    `);
    console.log('   ✅ 索引已建立');

    // Step 3: 更新 employee_compensation 表
    console.log('📋 Step 3: 更新 employee_compensation 表...');
    try {
      await pool.query(`ALTER TABLE employee_compensation ALTER COLUMN commission_rate TYPE DECIMAL(5,2)`);
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        console.log('   ⚠️ commission_rate 欄位類型已正確');
      }
    }
    try {
      await pool.query(`ALTER TABLE employee_compensation ADD COLUMN IF NOT EXISTS other_revenue_rate DECIMAL(5,2) DEFAULT 8.00`);
    } catch (e: any) {
      console.log('   ⚠️ other_revenue_rate 欄位已存在');
    }
    console.log('   ✅ employee_compensation 已更新');

    // Step 4: 初始化教師角色抽成
    console.log('📋 Step 4: 初始化教師角色抽成...');
    const teacherResult = await pool.query(`
      INSERT INTO employee_role_commission (user_id, role_type, commission_type, commission_rate, other_revenue_rate,
        tier1_max_revenue, tier1_commission_amount, tier2_max_revenue, tier2_commission_amount, effective_from)
      SELECT DISTINCT
        bi.user_id,
        'teacher' as role_type,
        COALESCE(ess.commission_type, 'fixed_rate') as commission_type,
        COALESCE(ess.commission_rate, 18.00) as commission_rate,
        COALESCE(ess.other_revenue_rate, 8.00) as other_revenue_rate,
        ess.tier1_max_revenue,
        ess.tier1_commission_amount,
        ess.tier2_max_revenue,
        ess.tier2_commission_amount,
        COALESCE(bi.effective_from, CURRENT_DATE) as effective_from
      FROM business_identities bi
      LEFT JOIN users u ON bi.user_id = u.id
      LEFT JOIN employee_salary_settings ess ON (
        ess.employee_name = CONCAT(u.first_name, ' ', u.last_name)
        OR ess.employee_name ILIKE '%' || bi.display_name || '%'
      )
      WHERE bi.identity_type = 'teacher' AND bi.is_active = true
      ON CONFLICT DO NOTHING
    `);
    console.log(`   ✅ 教師角色抽成已初始化: ${teacherResult.rowCount} 筆`);

    // Step 5: 初始化諮詢師角色抽成
    console.log('📋 Step 5: 初始化諮詢師角色抽成...');
    const consultantResult = await pool.query(`
      INSERT INTO employee_role_commission (user_id, role_type, commission_type, commission_rate, other_revenue_rate, effective_from)
      SELECT DISTINCT
        bi.user_id,
        'consultant' as role_type,
        'fixed_rate' as commission_type,
        15.00 as commission_rate,
        8.00 as other_revenue_rate,
        COALESCE(bi.effective_from, CURRENT_DATE) as effective_from
      FROM business_identities bi
      WHERE bi.identity_type = 'consultant' AND bi.is_active = true
      ON CONFLICT DO NOTHING
    `);
    console.log(`   ✅ 諮詢師角色抽成已初始化: ${consultantResult.rowCount} 筆`);

    // Step 6: 初始化電訪人員角色抽成
    console.log('📋 Step 6: 初始化電訪人員角色抽成...');
    const setterResult = await pool.query(`
      INSERT INTO employee_role_commission (user_id, role_type, commission_type, commission_rate, other_revenue_rate, effective_from)
      SELECT DISTINCT
        bi.user_id,
        'setter' as role_type,
        'fixed_rate' as commission_type,
        10.00 as commission_rate,
        8.00 as other_revenue_rate,
        COALESCE(bi.effective_from, CURRENT_DATE) as effective_from
      FROM business_identities bi
      WHERE bi.identity_type = 'setter' AND bi.is_active = true
      ON CONFLICT DO NOTHING
    `);
    console.log(`   ✅ 電訪人員角色抽成已初始化: ${setterResult.rowCount} 筆`);

    // 驗證
    const countResult = await pool.query(`SELECT role_type, COUNT(*) FROM employee_role_commission GROUP BY role_type`);
    console.log('\n📊 角色抽成設定統計:');
    countResult.rows.forEach((row: any) => {
      console.log(`   - ${row.role_type}: ${row.count} 筆`);
    });

    console.log('\n✅ Migration 089 完成！');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration 執行失敗:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration089();

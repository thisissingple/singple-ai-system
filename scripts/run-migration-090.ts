/**
 * 執行 Migration 090: 老師課程進度追蹤表
 */
import { createPool } from '../server/services/pg-client';

async function runMigration090() {
  const pool = createPool();

  try {
    console.log('🚀 執行 Migration 090: 老師課程進度追蹤表...\n');

    // Step 1: 建立 teacher_course_progress 表
    console.log('📋 Step 1: 建立 teacher_course_progress 表...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teacher_course_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
        student_email TEXT NOT NULL,
        purchase_id UUID,
        course_type VARCHAR(50) DEFAULT 'full',
        purchase_amount DECIMAL(12,2),
        closer_id UUID REFERENCES users(id),
        is_self_closed BOOLEAN DEFAULT FALSE,
        total_cards INTEGER DEFAULT 37,
        cards_completed INTEGER DEFAULT 0,
        track_completed BOOLEAN DEFAULT FALSE,
        track_completed_at TIMESTAMP,
        pivot_completed BOOLEAN DEFAULT FALSE,
        pivot_completed_at TIMESTAMP,
        breath_completed BOOLEAN DEFAULT FALSE,
        breath_completed_at TIMESTAMP,
        trello_card_id TEXT,
        trello_list_id TEXT,
        trello_board_id TEXT,
        last_synced_at TIMESTAMP,
        teaching_commission_paid DECIMAL(12,2) DEFAULT 0,
        module_bonus_paid DECIMAL(12,2) DEFAULT 0,
        sales_bonus_paid DECIMAL(12,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('   ✅ teacher_course_progress 表已建立');

    // Step 2: 建立 teacher_card_completions 表
    console.log('📋 Step 2: 建立 teacher_card_completions 表...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teacher_card_completions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        progress_id UUID REFERENCES teacher_course_progress(id) ON DELETE CASCADE,
        teacher_id UUID REFERENCES users(id),
        student_email TEXT NOT NULL,
        card_number INTEGER NOT NULL,
        card_name TEXT,
        module_name VARCHAR(50),
        trello_card_id TEXT,
        trello_checklist_item_id TEXT,
        completed_at TIMESTAMP NOT NULL,
        completed_by UUID REFERENCES users(id),
        card_value DECIMAL(8,2),
        is_paid BOOLEAN DEFAULT FALSE,
        paid_at TIMESTAMP,
        paid_in_period TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('   ✅ teacher_card_completions 表已建立');

    // Step 3: 建立 trello_sync_config 表
    console.log('📋 Step 3: 建立 trello_sync_config 表...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trello_sync_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        board_id TEXT NOT NULL,
        board_name TEXT,
        list_mappings JSONB DEFAULT '{}',
        sync_enabled BOOLEAN DEFAULT TRUE,
        sync_interval_minutes INTEGER DEFAULT 30,
        last_sync_at TIMESTAMP,
        last_sync_status VARCHAR(50),
        last_sync_error TEXT,
        api_key_encrypted TEXT,
        api_token_encrypted TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('   ✅ trello_sync_config 表已建立');

    // Step 4: 建立索引
    console.log('📋 Step 4: 建立索引...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_teacher_course_progress_teacher ON teacher_course_progress(teacher_id)',
      'CREATE INDEX IF NOT EXISTS idx_teacher_course_progress_student ON teacher_course_progress(student_email)',
      'CREATE INDEX IF NOT EXISTS idx_teacher_course_progress_closer ON teacher_course_progress(closer_id)',
      'CREATE INDEX IF NOT EXISTS idx_teacher_course_progress_trello ON teacher_course_progress(trello_card_id)',
      'CREATE INDEX IF NOT EXISTS idx_teacher_course_progress_status ON teacher_course_progress(status)',
      'CREATE INDEX IF NOT EXISTS idx_teacher_course_progress_board ON teacher_course_progress(trello_board_id)',
      'CREATE INDEX IF NOT EXISTS idx_teacher_card_completions_progress ON teacher_card_completions(progress_id)',
      'CREATE INDEX IF NOT EXISTS idx_teacher_card_completions_teacher ON teacher_card_completions(teacher_id)',
      'CREATE INDEX IF NOT EXISTS idx_teacher_card_completions_student ON teacher_card_completions(student_email)',
      'CREATE INDEX IF NOT EXISTS idx_teacher_card_completions_completed ON teacher_card_completions(completed_at)',
    ];
    for (const idx of indexes) {
      await pool.query(idx);
    }
    console.log('   ✅ 索引已建立');

    // Step 5: 建立 updated_at 觸發器函數
    console.log('📋 Step 5: 建立觸發器...');
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_teacher_progress_updated_at()
      RETURNS TRIGGER AS $func$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $func$ LANGUAGE plpgsql
    `);

    // 建立觸發器 (先刪除再建立避免重複)
    await pool.query(`DROP TRIGGER IF EXISTS update_teacher_course_progress_updated_at ON teacher_course_progress`);
    await pool.query(`
      CREATE TRIGGER update_teacher_course_progress_updated_at
        BEFORE UPDATE ON teacher_course_progress
        FOR EACH ROW
        EXECUTE FUNCTION update_teacher_progress_updated_at()
    `);
    console.log('   ✅ 觸發器已建立');

    // Step 6: 新增分潤設定欄位到 employee_salary_settings
    console.log('📋 Step 6: 新增分潤設定欄位...');
    const columns = [
      { name: 'card_value_self_closed', type: 'DECIMAL(8,2)', default: '770' },
      { name: 'card_value_other_closed', type: 'DECIMAL(8,2)', default: '654' },
      { name: 'sales_bonus_rate', type: 'DECIMAL(5,4)', default: '0.08' },
      { name: 'track_bonus', type: 'DECIMAL(8,2)', default: '1000' },
      { name: 'pivot_bonus', type: 'DECIMAL(8,2)', default: '1500' },
      { name: 'breath_bonus', type: 'DECIMAL(8,2)', default: '2000' },
    ];

    for (const col of columns) {
      try {
        await pool.query(`
          ALTER TABLE employee_salary_settings
          ADD COLUMN IF NOT EXISTS ${col.name} ${col.type} DEFAULT ${col.default}
        `);
        console.log(`   ✅ 新增欄位: ${col.name}`);
      } catch (e: any) {
        if (!e.message.includes('already exists')) {
          console.log(`   ⚠️ 欄位 ${col.name} 已存在`);
        }
      }
    }

    // Step 7: 啟用 RLS
    console.log('📋 Step 7: 啟用 RLS...');
    await pool.query('ALTER TABLE teacher_course_progress ENABLE ROW LEVEL SECURITY');
    await pool.query('ALTER TABLE teacher_card_completions ENABLE ROW LEVEL SECURITY');
    await pool.query('ALTER TABLE trello_sync_config ENABLE ROW LEVEL SECURITY');

    // 建立 RLS 政策 (先刪除再建立)
    const tables = ['teacher_course_progress', 'teacher_card_completions', 'trello_sync_config'];
    for (const table of tables) {
      await pool.query(`DROP POLICY IF EXISTS "Enable all for service_role" ON ${table}`);
      await pool.query(`CREATE POLICY "Enable all for service_role" ON ${table} FOR ALL USING (true)`);
    }
    console.log('   ✅ RLS 已啟用');

    // 驗證
    console.log('\n📊 驗證結果:');
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('teacher_course_progress', 'teacher_card_completions', 'trello_sync_config')
    `);
    console.log(`   - 建立的表: ${tablesResult.rows.map((r: any) => r.table_name).join(', ')}`);

    const columnsResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'employee_salary_settings'
      AND column_name IN ('card_value_self_closed', 'card_value_other_closed', 'sales_bonus_rate', 'track_bonus', 'pivot_bonus', 'breath_bonus')
    `);
    console.log(`   - 新增欄位: ${columnsResult.rows.map((r: any) => r.column_name).join(', ')}`);

    console.log('\n✅ Migration 090 完成！');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration 執行失敗:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration090();

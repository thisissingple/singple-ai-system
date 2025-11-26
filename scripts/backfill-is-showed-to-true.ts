/**
 * 將所有舊的體驗課記錄的 is_showed 設為 true
 */
import { createPool } from '../server/services/pg-client';

async function backfillIsShowed() {
  const pool = createPool();

  try {
    console.log('🔄 開始更新舊記錄的 is_showed 欄位...\n');

    // 1. 查詢目前有多少筆 is_showed 為 NULL 的記錄
    const countResult = await pool.query(`
      SELECT COUNT(*) as null_count
      FROM trial_class_attendance
      WHERE is_showed IS NULL
    `);

    const nullCount = parseInt(countResult.rows[0].null_count);
    console.log(`📊 發現 ${nullCount} 筆 is_showed 為 NULL 的記錄\n`);

    if (nullCount === 0) {
      console.log('✅ 所有記錄都已有 is_showed 值，無需更新');
      process.exit(0);
    }

    // 2. 更新所有 is_showed 為 NULL 的記錄設為 true
    console.log('⚙️  開始批量更新...');
    const updateResult = await pool.query(`
      UPDATE trial_class_attendance
      SET is_showed = true
      WHERE is_showed IS NULL
    `);

    console.log(`✅ 成功更新 ${updateResult.rowCount} 筆記錄\n`);

    // 3. 驗證更新結果
    const verifyResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE is_showed = true) as showed_true,
        COUNT(*) FILTER (WHERE is_showed = false) as showed_false,
        COUNT(*) FILTER (WHERE is_showed IS NULL) as showed_null,
        COUNT(*) as total
      FROM trial_class_attendance
    `);

    const stats = verifyResult.rows[0];
    console.log('📈 更新後的統計數據:');
    console.table({
      '有上線 (true)': stats.showed_true,
      '未上線 (false)': stats.showed_false,
      '未記錄 (null)': stats.showed_null,
      '總計': stats.total
    });

    // 4. 顯示一些樣本資料
    console.log('\n📝 隨機樣本資料 (前 5 筆):');
    const sampleResult = await pool.query(`
      SELECT
        id,
        student_name,
        class_date,
        teacher_name,
        is_showed
      FROM trial_class_attendance
      ORDER BY class_date DESC
      LIMIT 5
    `);

    console.table(sampleResult.rows);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ 更新失敗:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

backfillIsShowed();

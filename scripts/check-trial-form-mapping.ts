/**
 * 檢查體驗課表單的欄位映射
 */
import { createPool } from '../server/services/pg-client';

async function checkFormMapping() {
  const pool = createPool();

  try {
    console.log('🔍 查詢體驗課表單配置...\n');

    const result = await pool.query(`
      SELECT id, name, storage_type, target_table, field_mappings, fields
      FROM custom_forms
      WHERE id = '7721acc7-5e6a-4ded-b70f-3db4aff0f840'
    `);

    if (result.rows.length === 0) {
      console.log('❌ 找不到表單 ID: 7721acc7-5e6a-4ded-b70f-3db4aff0f840');
      process.exit(1);
    }

    const form = result.rows[0];
    console.log('表單名稱:', form.name);
    console.log('儲存模式:', form.storage_type);
    console.log('目標表格:', form.target_table);
    console.log('\n欄位映射 (field_mappings):');
    console.log(JSON.stringify(form.field_mappings, null, 2));
    console.log('\n表單欄位 (fields):');
    console.log(JSON.stringify(form.fields, null, 2));

    // 檢查是否有 isShowed 映射
    const hasIsShowed = form.field_mappings && form.field_mappings.isShowed;
    if (hasIsShowed) {
      console.log('\n✅ isShowed 欄位已存在映射:', form.field_mappings.isShowed);
    } else {
      console.log('\n⚠️  isShowed 欄位尚未配置映射，需要新增');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ 查詢失敗:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkFormMapping();

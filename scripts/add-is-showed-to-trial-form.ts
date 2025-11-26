/**
 * 新增 is_showed 欄位到體驗課表單
 */
import { createPool } from '../server/services/pg-client';

async function updateFormConfig() {
  const pool = createPool();

  try {
    console.log('📝 更新體驗課表單配置...\n');

    // 1. 取得現有配置
    const currentForm = await pool.query(`
      SELECT field_mappings, fields
      FROM custom_forms
      WHERE id = '7721acc7-5e6a-4ded-b70f-3db4aff0f840'
    `);

    if (currentForm.rows.length === 0) {
      console.log('❌ 找不到表單');
      process.exit(1);
    }

    const { field_mappings, fields } = currentForm.rows[0];

    // 2. 新增 isShowed 映射
    const updatedMappings = {
      ...field_mappings,
      isShowed: 'is_showed'
    };

    // 3. 新增 isShowed 欄位配置
    const newField = {
      id: 'isShowed',
      type: 'select',
      label: '學員是否上線',
      order: 4.5, // 插入到 teacherName (4) 和 notes (5) 之間
      required: true,
      options: ['true', 'false'],
      placeholder: '請選擇學員出席狀態'
    };

    // 4. 將新欄位插入到適當位置（在 teacherName 之後）
    const updatedFields = [...fields];
    // 找到 teacherName 的索引
    const teacherIndex = updatedFields.findIndex((f: any) => f.id === 'teacherName');
    // 在其後插入新欄位
    updatedFields.splice(teacherIndex + 1, 0, newField);

    // 5. 重新排序 order
    updatedFields.forEach((field: any, index: number) => {
      field.order = index + 1;
    });

    // 6. 更新資料庫
    await pool.query(`
      UPDATE custom_forms
      SET
        field_mappings = $1,
        fields = $2,
        updated_at = NOW()
      WHERE id = '7721acc7-5e6a-4ded-b70f-3db4aff0f840'
    `, [
      JSON.stringify(updatedMappings),
      JSON.stringify(updatedFields)
    ]);

    console.log('✅ 表單配置更新成功！\n');
    console.log('新增欄位映射:');
    console.log('  isShowed -> is_showed\n');
    console.log('新增表單欄位:');
    console.log(JSON.stringify(newField, null, 2));

    process.exit(0);
  } catch (error: any) {
    console.error('❌ 更新失敗:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateFormConfig();

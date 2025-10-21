import { queryDatabase } from '../server/services/pg-client';

/**
 * Phase 19.2 Step 2: 批次遷移歷史資料
 *
 * 目標：將所有歷史資料表中的人員名稱對應到業務身份編號
 *
 * 處理順序：
 * 1. trial_class_attendance (145 筆) - teacher_name → teacher_code
 * 2. teaching_quality_analysis (152 筆) - teacher_name → teacher_id
 * 3. income_expense_records (637 筆) - notes JSON → teacher/consultant/sales codes
 */

interface BusinessIdentity {
  user_id: string;
  identity_code: string;
  identity_type: string;
  display_name: string;
}

// 建立名稱到業務身份的對應表
async function buildNameToIdentityMap(): Promise<Map<string, BusinessIdentity[]>> {
  const result = await queryDatabase(`
    SELECT
      bi.user_id,
      bi.identity_code,
      bi.identity_type,
      bi.display_name,
      u.first_name
    FROM business_identities bi
    JOIN users u ON u.id = bi.user_id
    ORDER BY bi.identity_type, bi.identity_code
  `);

  const nameMap = new Map<string, BusinessIdentity[]>();

  for (const row of result.rows) {
    const name = row.display_name || row.first_name;
    const lowerName = name.toLowerCase();

    if (!nameMap.has(lowerName)) {
      nameMap.set(lowerName, []);
    }

    nameMap.get(lowerName)!.push({
      user_id: row.user_id,
      identity_code: row.identity_code,
      identity_type: row.identity_type,
      display_name: name,
    });
  }

  return nameMap;
}

// Step 1: 更新 trial_class_attendance
async function migrateTrialClassAttendance(nameMap: Map<string, BusinessIdentity[]>) {
  console.log('\n📝 Step 1: 更新 trial_class_attendance...');

  // 先查詢所有需要更新的記錄
  const records = await queryDatabase(`
    SELECT id, teacher_name
    FROM trial_class_attendance
    WHERE teacher_name IS NOT NULL
    ORDER BY teacher_name
  `);

  console.log(`   找到 ${records.rows.length} 筆記錄需要更新`);

  let updated = 0;
  let notFound = 0;
  const notFoundNames = new Set<string>();

  for (const record of records.rows) {
    const teacherName = record.teacher_name;
    const lowerName = teacherName.toLowerCase();

    const identities = nameMap.get(lowerName);

    if (identities) {
      // 找到對應的教師身份
      const teacherIdentity = identities.find(i => i.identity_type === 'teacher');

      if (teacherIdentity) {
        await queryDatabase(`
          UPDATE trial_class_attendance
          SET teacher_code = $1
          WHERE id = $2
        `, [teacherIdentity.identity_code, record.id]);

        updated++;

        if (updated % 50 === 0) {
          console.log(`   已更新 ${updated} 筆...`);
        }
      } else {
        notFound++;
        notFoundNames.add(teacherName);
      }
    } else {
      notFound++;
      notFoundNames.add(teacherName);
    }
  }

  console.log(`\n   ✅ 完成！更新 ${updated} 筆記錄`);
  if (notFound > 0) {
    console.log(`   ⚠️  找不到對應: ${notFound} 筆`);
    console.log(`   名稱: ${Array.from(notFoundNames).join(', ')}`);
  }

  return { updated, notFound, notFoundNames: Array.from(notFoundNames) };
}

// Step 2: 更新 teaching_quality_analysis
async function migrateTeachingQualityAnalysis(nameMap: Map<string, BusinessIdentity[]>) {
  console.log('\n📝 Step 2: 更新 teaching_quality_analysis...');

  const records = await queryDatabase(`
    SELECT id, teacher_name
    FROM teaching_quality_analysis
    WHERE teacher_name IS NOT NULL
    ORDER BY teacher_name
  `);

  console.log(`   找到 ${records.rows.length} 筆記錄需要更新`);

  let updated = 0;
  let notFound = 0;
  const notFoundNames = new Set<string>();

  for (const record of records.rows) {
    const teacherName = record.teacher_name;
    const lowerName = teacherName.toLowerCase();

    const identities = nameMap.get(lowerName);

    if (identities) {
      const teacherIdentity = identities.find(i => i.identity_type === 'teacher');

      if (teacherIdentity) {
        await queryDatabase(`
          UPDATE teaching_quality_analysis
          SET teacher_id = $1
          WHERE id = $2
        `, [teacherIdentity.user_id, record.id]);

        updated++;

        if (updated % 50 === 0) {
          console.log(`   已更新 ${updated} 筆...`);
        }
      } else {
        notFound++;
        notFoundNames.add(teacherName);
      }
    } else {
      notFound++;
      notFoundNames.add(teacherName);
    }
  }

  console.log(`\n   ✅ 完成！更新 ${updated} 筆記錄`);
  if (notFound > 0) {
    console.log(`   ⚠️  找不到對應: ${notFound} 筆`);
    console.log(`   名稱: ${Array.from(notFoundNames).join(', ')}`);
  }

  return { updated, notFound, notFoundNames: Array.from(notFoundNames) };
}

// Step 3: 更新 income_expense_records
async function migrateIncomeExpenseRecords(nameMap: Map<string, BusinessIdentity[]>) {
  console.log('\n📝 Step 3: 更新 income_expense_records...');

  // 查詢所有有 notes 的記錄
  const records = await queryDatabase(`
    SELECT id, notes
    FROM income_expense_records
    WHERE notes IS NOT NULL AND notes::text != '{}'
    ORDER BY id
  `);

  console.log(`   找到 ${records.rows.length} 筆記錄需要檢查`);

  let updatedTeacher = 0;
  let updatedConsultant = 0;
  let updatedSales = 0;
  let skipped = 0;
  const notFoundNames = new Set<string>();

  for (const record of records.rows) {
    const notes = record.notes || {};
    let hasUpdate = false;

    // 準備更新的欄位
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // 處理教師
    if (notes.teacher || notes.Teacher || notes.授課教師 || notes.teacher_name) {
      const teacherName = notes.teacher || notes.Teacher || notes.授課教師 || notes.teacher_name;
      const lowerName = teacherName.toLowerCase();
      const identities = nameMap.get(lowerName);

      if (identities) {
        const teacherIdentity = identities.find(i => i.identity_type === 'teacher');
        if (teacherIdentity) {
          updates.push(`teacher_id = $${paramIndex++}`);
          values.push(teacherIdentity.user_id);
          updates.push(`teacher_code = $${paramIndex++}`);
          values.push(teacherIdentity.identity_code);
          updatedTeacher++;
          hasUpdate = true;
        } else {
          notFoundNames.add(`${teacherName} (teacher)`);
        }
      } else {
        notFoundNames.add(`${teacherName} (teacher)`);
      }
    }

    // 處理諮詢師
    if (notes.consultant || notes.Consultant || notes.諮詢師 || notes.consultant_name) {
      const consultantName = notes.consultant || notes.Consultant || notes.諮詢師 || notes.consultant_name;
      const lowerName = consultantName.toLowerCase();
      const identities = nameMap.get(lowerName);

      if (identities) {
        const consultantIdentity = identities.find(i => i.identity_type === 'consultant');
        if (consultantIdentity) {
          updates.push(`consultant_id = $${paramIndex++}`);
          values.push(consultantIdentity.user_id);
          updates.push(`consultant_code = $${paramIndex++}`);
          values.push(consultantIdentity.identity_code);
          updatedConsultant++;
          hasUpdate = true;
        } else {
          notFoundNames.add(`${consultantName} (consultant)`);
        }
      } else {
        notFoundNames.add(`${consultantName} (consultant)`);
      }
    }

    // 處理銷售
    if (notes.sales || notes.Sales || notes.業務 || notes.銷售 || notes.sales_person_name) {
      const salesName = notes.sales || notes.Sales || notes.業務 || notes.銷售 || notes.sales_person_name;
      const lowerName = salesName.toLowerCase();
      const identities = nameMap.get(lowerName);

      if (identities) {
        const salesIdentity = identities.find(i => i.identity_type === 'sales');
        if (salesIdentity) {
          updates.push(`sales_person_id = $${paramIndex++}`);
          values.push(salesIdentity.user_id);
          updates.push(`sales_code = $${paramIndex++}`);
          values.push(salesIdentity.identity_code);
          updatedSales++;
          hasUpdate = true;
        } else {
          notFoundNames.add(`${salesName} (sales)`);
        }
      } else {
        notFoundNames.add(`${salesName} (sales)`);
      }
    }

    // 執行更新
    if (hasUpdate) {
      values.push(record.id);
      await queryDatabase(`
        UPDATE income_expense_records
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
      `, values);

      if ((updatedTeacher + updatedConsultant + updatedSales) % 50 === 0) {
        console.log(`   已處理 ${updatedTeacher + updatedConsultant + updatedSales} 筆...`);
      }
    } else {
      skipped++;
    }
  }

  console.log(`\n   ✅ 完成！`);
  console.log(`   - 教師欄位更新: ${updatedTeacher} 筆`);
  console.log(`   - 諮詢師欄位更新: ${updatedConsultant} 筆`);
  console.log(`   - 銷售欄位更新: ${updatedSales} 筆`);
  console.log(`   - 跳過（無人員資訊）: ${skipped} 筆`);

  if (notFoundNames.size > 0) {
    console.log(`   ⚠️  找不到對應: ${notFoundNames.size} 個名稱`);
    console.log(`   名稱: ${Array.from(notFoundNames).join(', ')}`);
  }

  return {
    updatedTeacher,
    updatedConsultant,
    updatedSales,
    skipped,
    notFoundNames: Array.from(notFoundNames)
  };
}

// 主執行函數
async function main() {
  console.log('🚀 開始批次遷移歷史資料...\n');

  try {
    // 建立名稱對應表
    console.log('📋 建立名稱對應表...');
    const nameMap = await buildNameToIdentityMap();
    console.log(`   找到 ${nameMap.size} 個不同的名稱`);

    // 顯示對應表
    console.log('\n📊 業務身份對應表:');
    for (const [name, identities] of nameMap.entries()) {
      const codes = identities.map(i => `${i.identity_type}:${i.identity_code}`).join(', ');
      console.log(`   ${name} → ${codes}`);
    }

    // Step 1: trial_class_attendance
    const result1 = await migrateTrialClassAttendance(nameMap);

    // Step 2: teaching_quality_analysis
    const result2 = await migrateTeachingQualityAnalysis(nameMap);

    // Step 3: income_expense_records
    const result3 = await migrateIncomeExpenseRecords(nameMap);

    // 總結
    console.log('\n\n✨ 遷移完成！\n');
    console.log('📊 總結:');
    console.log(`   trial_class_attendance: ${result1.updated} 筆更新`);
    console.log(`   teaching_quality_analysis: ${result2.updated} 筆更新`);
    console.log(`   income_expense_records:`);
    console.log(`     - 教師: ${result3.updatedTeacher} 筆`);
    console.log(`     - 諮詢師: ${result3.updatedConsultant} 筆`);
    console.log(`     - 銷售: ${result3.updatedSales} 筆`);

    // 收集所有找不到的名稱
    const allNotFound = new Set([
      ...result1.notFoundNames,
      ...result2.notFoundNames,
      ...result3.notFoundNames,
    ]);

    if (allNotFound.size > 0) {
      console.log(`\n⚠️  需要注意的名稱 (${allNotFound.size} 個):`);
      for (const name of allNotFound) {
        console.log(`   - ${name}`);
      }
    }

  } catch (error) {
    console.error('❌ 錯誤:', error);
    throw error;
  }
}

// 執行
main();

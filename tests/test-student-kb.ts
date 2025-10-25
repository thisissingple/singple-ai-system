import 'dotenv/config';
import * as studentKnowledgeService from '../server/services/student-knowledge-service';

async function testStudentKB() {
  console.log('\n🔍 測試學員知識庫服務...\n');

  try {
    const testEmail = 'lawjoey1998@gmail.com';
    const testName = 'Law Joey';

    // 1. Get or create student KB
    console.log('1️⃣ 取得或創建學員 KB...');
    const kb = await studentKnowledgeService.getOrCreateStudentKB(testEmail, testName);
    console.log(`   ✅ 學員 KB ID: ${kb.id}`);
    console.log(`   - 學員姓名: ${kb.student_name}`);
    console.log(`   - Email: ${kb.student_email}`);
    console.log(`   - 總上課次數: ${kb.total_classes}`);
    console.log(`   - 總諮詢次數: ${kb.total_consultations}`);
    console.log(`   - 首次接觸: ${kb.first_contact_date}`);
    console.log(`   - 最後互動: ${kb.last_interaction_date}`);

    // 2. Get full context
    console.log('\n2️⃣ 取得完整學員資訊...');
    const context = await studentKnowledgeService.getStudentFullContext(testEmail);
    console.log(`   ✅ 上課記錄: ${context.trialClasses.length} 堂`);
    console.log(`   ✅ EODS 記錄: ${context.eodsRecords.length} 筆`);
    console.log(`   ✅ AI 分析: ${context.aiAnalyses.length} 次`);
    console.log(`   ✅ 購課記錄: ${context.purchases.length} 筆`);

    if (context.trialClasses.length > 0) {
      console.log('\n   📅 上課記錄詳情:');
      context.trialClasses.forEach((c: any, idx: number) => {
        console.log(`      ${idx + 1}. ${c.class_date} - ${c.teacher_name}`);
      });
    }

    if (context.purchases.length > 0) {
      console.log('\n   💳 購課記錄詳情:');
      context.purchases.forEach((p: any, idx: number) => {
        console.log(`      ${idx + 1}. ${p.purchase_date} - ${p.package_name} (剩餘: ${p.remaining_classes})`);
      });
    }

    // 3. Test update
    console.log('\n3️⃣ 測試更新學員檔案...');
    await studentKnowledgeService.updateStudentProfile(testEmail, {
      profileSummary: {
        basicInfo: {
          age: '25-30',
          occupation: '未知',
          priceSensitivity: '中',
          lastUpdatedAt: new Date().toISOString()
        }
      },
      stats: {
        totalClasses: context.trialClasses.length,
        totalConsultations: context.eodsRecords.length,
        lastInteractionDate: context.trialClasses[context.trialClasses.length - 1]?.class_date
      }
    });
    console.log('   ✅ 學員檔案更新成功');

    // 4. Verify update
    console.log('\n4️⃣ 驗證更新結果...');
    const updatedKB = await studentKnowledgeService.getStudentKB(testEmail);
    if (updatedKB) {
      console.log('   ✅ 驗證成功');
      console.log(`   - 總上課次數: ${updatedKB.total_classes}`);
      console.log(`   - 總諮詢次數: ${updatedKB.total_consultations}`);
      console.log(`   - 總互動次數: ${updatedKB.total_interactions}`);
      console.log(`   - 基本資訊: ${JSON.stringify(updatedKB.profile_summary.basicInfo)}`);
    }

    console.log('\n✅ 所有測試通過！\n');

  } catch (error: any) {
    console.error('\n❌ 測試失敗:', error.message);
    console.error('錯誤詳情:', error);
  }
}

testStudentKB();

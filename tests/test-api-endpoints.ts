import 'dotenv/config';

async function testAPIEndpoints() {
  console.log('\n🔍 測試 AI 對話 API 端點...\n');

  const baseURL = 'http://localhost:5001';
  const testEmail = 'lawjoey1998@gmail.com';

  try {
    // 1. Test get preset questions
    console.log('1️⃣ 測試取得預設問題清單...');
    const presetQuestionsRes = await fetch(`${baseURL}/api/teaching-quality/preset-questions`);
    const presetQuestions = await presetQuestionsRes.json();

    if (presetQuestions.success) {
      console.log('   ✅ 預設問題清單:');
      Object.values(presetQuestions.data).forEach((q: any) => {
        console.log(`      - ${q.label}: ${q.description}`);
      });
    } else {
      console.log('   ❌ 失敗:', presetQuestions.error);
    }

    // 2. Test get student profile
    console.log('\n2️⃣ 測試取得學員完整檔案...');
    const profileRes = await fetch(`${baseURL}/api/teaching-quality/student/${encodeURIComponent(testEmail)}/profile`);
    const profile = await profileRes.json();

    if (profile.success) {
      console.log('   ✅ 學員檔案:');
      console.log(`      - 姓名: ${profile.data.kb.student_name}`);
      console.log(`      - Email: ${profile.data.kb.student_email}`);
      console.log(`      - 上課次數: ${profile.data.trialClasses.length} 堂`);
      console.log(`      - EODS 記錄: ${profile.data.eodsRecords.length} 筆`);
      console.log(`      - AI 分析: ${profile.data.aiAnalyses.length} 次`);
      console.log(`      - 購課記錄: ${profile.data.purchases.length} 筆`);
    } else {
      console.log('   ❌ 失敗:', profile.error);
    }

    console.log('\n✅ API 端點測試完成！');
    console.log('\n📝 注意：預設問題和自訂問題的 API 需要驗證（authentication），');
    console.log('   在前端實現時會自動帶上 cookie 進行驗證。');

  } catch (error: any) {
    console.error('\n❌ 測試失敗:', error.message);
  }
}

testAPIEndpoints();

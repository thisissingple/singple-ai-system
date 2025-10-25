import 'dotenv/config';

async function testChenAPIEndpoint() {
  console.log('\n🔍 測試陳冠霖的 API endpoint...\n');

  try {
    const analysisId = 'fb1dbdd0-283b-4a04-b8fd-b3e944375660';

    // Call actual API endpoint (without auth for testing)
    const response = await fetch(`http://localhost:5001/api/teaching-quality/analyses/${analysisId}`, {
      method: 'GET',
      headers: {
        'Cookie': 'connect.sid=test' // Dummy cookie
      }
    });

    if (!response.ok) {
      console.log('❌ API 回應錯誤:', response.status, response.statusText);
      const text = await response.text();
      console.log('回應內容:', text);
      return;
    }

    const result = await response.json();

    console.log('✅ API 回應成功');
    console.log('\n📊 購課資訊:');
    console.log('   student_name:', result.data.student_name);
    console.log('   purchased_package:', result.data.purchased_package);
    console.log('   student_email:', result.data.student_email);
    console.log('   attendance_email:', result.data.attendance_email);
    console.log('   remaining_lessons:', result.data.remaining_lessons);

  } catch (error) {
    console.error('❌ 錯誤:', error);
  }
}

testChenAPIEndpoint();

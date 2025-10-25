async function checkElenaStudents() {
  try {
    const url = `http://localhost:5001/api/reports/trial-class?period=all&baseDate=${new Date().toISOString().split('T')[0]}`;
    const response = await fetch(url);
    const result = await response.json();

    const elenaData = result.data.teacherInsights.find(
      (t: any) => t.teacherName === 'Elena'
    );

    if (elenaData) {
      console.log('\n📊 Elena 教師數據:');
      console.log('已成交學生數 (後端):', elenaData.convertedStudents);

      const elenaStudents = result.data.studentInsights.filter(
        (s: any) => s.teacherName === 'Elena' && s.currentStatus === '已轉高'
      );

      console.log('已轉高學生清單 (前端篩選):');
      elenaStudents.forEach((s: any) => {
        console.log(`  - ${s.studentName} (${s.email}) - ${s.currentStatus}`);
      });
      console.log('清單總數:', elenaStudents.length);

      console.log('\n❌ 問題:', elenaData.convertedStudents, '!== ', elenaStudents.length);
    } else {
      console.log('❌ 找不到 Elena');
    }
  } catch (error) {
    console.error('API 錯誤:', error);
  }
}

checkElenaStudents();

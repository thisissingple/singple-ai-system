/**
 * 通過 API 檢查學生數量差異
 */

async function checkStudentCount() {
  try {
    console.log('🔍 從 API 獲取報表數據...\n');

    const response = await fetch('http://localhost:5001/api/reports/trial-class?period=all&baseDate=2025-10-23', {
      method: 'GET',
      headers: {
        'Cookie': 'connect.sid=s%3AyourSessionId.signature', // 需要登入
      }
    });

    if (!response.ok) {
      console.log('❌ API 返回錯誤，需要先登入');
      console.log('請在瀏覽器登入後再執行此腳本\n');

      console.log('💡 或者直接在瀏覽器開發者工具的 Console 執行以下代碼：');
      console.log(`
// 在瀏覽器 Console 執行
(async () => {
  const response = await fetch('/api/reports/trial-class?period=all&baseDate=2025-10-23');
  const data = await response.json();
  const purchases = data.data.rawData.filter(r => r.source === '體驗課購買表');

  const emailCounts = new Map();
  const emptyEmails = [];

  purchases.forEach((row, index) => {
    const email = (
      row.data?.學員信箱 ||
      row.data?.studentEmail ||
      row.data?.email ||
      ''
    ).toLowerCase().trim();

    if (email) {
      emailCounts.set(email, (emailCounts.get(email) || 0) + 1);
    } else {
      emptyEmails.push({
        index: index + 1,
        name: row.data?.學員姓名 || row.data?.studentName || '未知',
        status: row.data?.目前狀態 || row.data?.currentStatus || '未知'
      });
    }
  });

  console.log(\`📊 購買記錄總數: \${purchases.length}\`);
  console.log(\`👥 唯一 email 數量: \${emailCounts.size}\`);
  console.log(\`❌ 沒有 email 的記錄: \${emptyEmails.length}\`);

  const duplicates = Array.from(emailCounts.entries())
    .filter(([_, count]) => count > 1);

  if (duplicates.length > 0) {
    console.log('\\n🔄 重複購買的學生:');
    duplicates.forEach(([email, count]) => {
      console.log(\`  - \${email}: \${count} 次購買\`);
    });
  }

  if (emptyEmails.length > 0) {
    console.log('\\n⚠️  沒有 email 的記錄:');
    emptyEmails.forEach(record => {
      console.log(\`  - #\${record.index}: \${record.name} (狀態: \${record.status})\`);
    });
  }
})();
      `);
      return;
    }

    const result = await response.json();
    console.log('✅ 成功獲取數據');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ 錯誤:', error);
  }
}

checkStudentCount();

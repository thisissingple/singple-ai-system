import { createPool } from '../server/services/pg-client';

async function checkMissingInKPI() {
  const pool = createPool();

  try {
    // 這 20 位學生應該都是「已轉高」
    const expectedEmails = [
      'ballade1108@gmail.com',
      'jp.sdfjkl@gmail.com',
      'kowai0323@gmail.com',
      'chuckyu326@gmail.com',
      'kyoko0933442518@gmail.com',
      'a0909075080@gmail.com',
      'stephenlzq@gmail.com',
      'c0004532000@yahoo.com.tw',
      'shiaoping.fang@gmail.com',
      'daniel.cock@yahoo.com.tw',
      'linbilly810042@gmail.com',
      'xl3196@gmail.com',
      'cl009015@gmail.com',
      'wadeginobili@gmail.com',
      'v79228@gmail.com',
      'monkey02191129@gmail.com',
      'jitw331@gmail.com',
      'macauoscar@gmail.com',
      'ssaa.42407@gmail.com',
      'afianren@gmail.com'
    ];

    console.log(`\n🔍 檢查 ${expectedEmails.length} 位已轉高學生在各表中的記錄...\n`);

    for (const email of expectedEmails) {
      // 檢查 trial_class_purchases
      const purchaseQuery = `
        SELECT student_name, purchase_date
        FROM trial_class_purchases
        WHERE LOWER(TRIM(student_email)) = LOWER(TRIM($1))
      `;
      const purchaseResult = await pool.query(purchaseQuery, [email]);

      // 檢查 eods_for_closers
      const eodsQuery = `
        SELECT student_name, deal_date, actual_amount, plan
        FROM eods_for_closers
        WHERE LOWER(TRIM(student_email)) = LOWER(TRIM($1))
          AND actual_amount IS NOT NULL
          AND actual_amount != 'NT$0.00'
          AND (plan LIKE '%高階一對一訓練%')
      `;
      const eodsResult = await pool.query(eodsQuery, [email]);

      if (purchaseResult.rows.length === 0) {
        console.log(`❌ ${email}: 無體驗課購買記錄`);
      } else if (eodsResult.rows.length === 0) {
        console.log(`❌ ${email}: 無高階成交記錄`);
      } else {
        const purchase = purchaseResult.rows[0];
        const eods = eodsResult.rows[0];

        if (!eods.deal_date) {
          console.log(`❌ ${purchase.student_name}: 缺少成交日期`);
        } else if (!purchase.purchase_date) {
          console.log(`❌ ${purchase.student_name}: 缺少購買日期`);
        } else {
          const dealDate = new Date(eods.deal_date);
          const purchaseDate = new Date(purchase.purchase_date);

          if (dealDate >= purchaseDate) {
            console.log(`✅ ${purchase.student_name}: 符合條件 (購買: ${purchase.purchase_date}, 成交: ${eods.deal_date})`);
          } else {
            console.log(`❌ ${purchase.student_name}: 成交日期早於購買日期`);
          }
        }
      }
    }

    await pool.end();
  } catch (error: any) {
    console.error('查詢錯誤:', error.message);
    process.exit(1);
  }
}

checkMissingInKPI();

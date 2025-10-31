/**
 * 檢查 eods_for_closers 資料結構和內容
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEodsData() {
  console.log('🔍 檢查 eods_for_closers 資料...\n');

  // 1. 取得總筆數
  const { data: allDeals, error: allError } = await supabase
    .from('eods_for_closers')
    .select('*')
    .limit(5);

  if (allError) {
    console.error('❌ 查詢錯誤:', allError);
    return;
  }

  console.log(`📊 總共有 ${allDeals?.length || 0} 筆記錄（僅顯示前 5 筆）\n`);

  if (allDeals && allDeals.length > 0) {
    console.log('📋 第一筆記錄的欄位：');
    console.log(Object.keys(allDeals[0]));
    console.log('\n📋 第一筆完整資料：');
    console.log(JSON.stringify(allDeals[0], null, 2));

    // 檢查關鍵欄位
    console.log('\n🔑 關鍵欄位檢查：');
    const firstDeal = allDeals[0];
    console.log('- student_email:', firstDeal.student_email || 'N/A');
    console.log('- plan:', firstDeal.plan || 'N/A');
    console.log('- actual_amount:', firstDeal.actual_amount || 'N/A');
    console.log('- deal_amount:', firstDeal.deal_amount || 'N/A');
    console.log('- deal_date:', firstDeal.deal_date || 'N/A');

    // 檢查 data 欄位
    if (firstDeal.data) {
      console.log('\n📦 data 欄位內容：');
      console.log(JSON.stringify(firstDeal.data, null, 2));
    }

    // 檢查有多少筆包含「高階一對一」
    console.log('\n🔍 篩選包含「高階一對一」的記錄...');
    const highLevelDeals = allDeals.filter(deal => {
      const plan = deal.plan || deal.data?.plan || deal.data?.成交方案 || '';
      return plan.includes('高階一對一') || plan.includes('高音');
    });
    console.log(`✅ 找到 ${highLevelDeals.length} 筆高階方案`);

    if (highLevelDeals.length > 0) {
      console.log('\n📋 高階方案範例：');
      highLevelDeals.forEach((deal, idx) => {
        console.log(`\n[${idx + 1}] email: ${deal.student_email || deal.data?.student_email || 'N/A'}`);
        console.log(`    plan: ${deal.plan || deal.data?.plan || deal.data?.成交方案 || 'N/A'}`);
        console.log(`    amount: ${deal.actual_amount || deal.deal_amount || deal.data?.actual_amount || 'N/A'}`);
      });
    }
  }

  // 2. 檢查 trial_class_purchases
  console.log('\n\n🔍 檢查 trial_class_purchases 資料...\n');
  const { data: purchases, error: purchaseError } = await supabase
    .from('trial_class_purchases')
    .select('*')
    .limit(5);

  if (purchaseError) {
    console.error('❌ 查詢錯誤:', purchaseError);
    return;
  }

  console.log(`📊 總共有 ${purchases?.length || 0} 筆記錄（僅顯示前 5 筆）\n`);

  if (purchases && purchases.length > 0) {
    console.log('📋 第一筆記錄的欄位：');
    console.log(Object.keys(purchases[0]));
    console.log('\n📋 第一筆完整資料：');
    console.log(JSON.stringify(purchases[0], null, 2));

    console.log('\n🔑 關鍵欄位檢查：');
    const firstPurchase = purchases[0];
    console.log('- student_email:', firstPurchase.student_email || 'N/A');
    console.log('- status:', firstPurchase.status || 'N/A');
    console.log('- data:', firstPurchase.data ? 'exists' : 'N/A');
  }
}

checkEodsData().catch(console.error);

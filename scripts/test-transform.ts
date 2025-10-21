import { transformToSupabaseRecord } from '../server/services/reporting/sheetMappingService';

async function main() {
  const rawPurchase = {
    '姓名': 'Test Student',
    'Email': 'test@example.com',
    '體驗課購買日期': '2025/08/21',
    '方案名稱': '試用方案',
    '目前狀態（自動計算）': '已購買',
  };

  const purchaseResult = await transformToSupabaseRecord(
    rawPurchase,
    'trial_purchase',
    'spreadsheet-1',
    1
  );

  console.log('Purchase transform:', purchaseResult);

  const rawDeal = {
    '姓名': 'Test Student',
    'Email': 'test@example.com',
    '（諮詢）成交日期': '2021/8/25',
    '（諮詢）實收金額': 'NT$86,000',
  };

  const dealResult = await transformToSupabaseRecord(
    rawDeal,
    'eods',
    'spreadsheet-1',
    2
  );

  console.log('Deal transform:', dealResult);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

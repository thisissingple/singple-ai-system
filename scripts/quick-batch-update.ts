/**
 * Quick batch update using raw SQL queries via Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('=== Quick Batch Update (Using RPC) ===\n');

  // Check if we can use the raw query approach
  console.log('📋 Updating remaining deals...\n');

  // Get all deals that need updating
  const { data: dealsToUpdate } = await client
    .from('eods_for_closers')
    .select('id, raw_data')
    .or('deal_date.is.null,deal_amount.is.null')
    .limit(1000);

  if (!dealsToUpdate || dealsToUpdate.length === 0) {
    console.log('✓ All deals already updated!');
    return;
  }

  console.log(`Found ${dealsToUpdate.length} deals to update`);

  // Process in parallel chunks
  const chunkSize = 50;
  const chunks = [];
  for (let i = 0; i < dealsToUpdate.length; i += chunkSize) {
    chunks.push(dealsToUpdate.slice(i, i + chunkSize));
  }

  let updated = 0;
  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async (deal) => {
        const updateData: any = {};

        // Parse date
        const rawDate = deal.raw_data?.['（諮詢）成交日期'];
        if (rawDate) {
          const dateStr = String(rawDate).replace(/\//g, '-');
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            updateData.deal_date = date.toISOString().split('T')[0];
          }
        }

        // Parse amount
        const rawAmount = deal.raw_data?.['（諮詢）實收金額'];
        if (rawAmount) {
          const cleaned = String(rawAmount)
            .replace(/NT\$/gi, '')
            .replace(/\$/g, '')
            .replace(/,/g, '')
            .replace(/\s/g, '');
          const parsed = parseFloat(cleaned);
          if (!isNaN(parsed)) {
            updateData.deal_amount = parsed;
          }
        }

        if (Object.keys(updateData).length > 0) {
          const { error } = await client
            .from('eods_for_closers')
            .update(updateData)
            .eq('id', deal.id);

          if (!error) {
            updated++;
            if (updated % 50 === 0) {
              console.log(`  Progress: ${updated}/${dealsToUpdate.length}`);
            }
          }
        }
      })
    );
  }

  console.log(`\n✓ Updated ${updated} deals`);

  // Verify
  const { count: dealsWithDate } = await client
    .from('eods_for_closers')
    .select('*', { count: 'exact', head: true })
    .not('deal_date', 'is', null);

  const { count: dealsWithAmount } = await client
    .from('eods_for_closers')
    .select('*', { count: 'exact', head: true })
    .not('deal_amount', 'is', null);

  console.log(`\n📊 Final Status:`);
  console.log(`   Deals with deal_date: ${dealsWithDate} / 995`);
  console.log(`   Deals with deal_amount: ${dealsWithAmount} / 995`);
}

main().catch(console.error);

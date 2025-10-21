/**
 * Re-process existing Supabase data to extract purchase_date, deal_date, deal_amount
 * from raw_data using the updated field mappings
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Parse date from various formats (2025/08/21, 2025-08-21, etc.)
 */
function parseDate(value: any): string | null {
  if (!value || value === '') return null;

  const dateStr = String(value).trim();

  // Convert 2025/08/21 to 2025-08-21
  const normalized = dateStr.replace(/\//g, '-');

  // Try to parse as date
  const date = new Date(normalized);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  return null;
}

/**
 * Parse number from currency format (NT$86,000, $4,000.00)
 */
function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;

  if (typeof value === 'string') {
    const cleaned = value
      .replace(/NT\$/gi, '')
      .replace(/\$/g, '')
      .replace(/,/g, '')
      .replace(/\s/g, '');

    const parsed = parseFloat(cleaned);
    return !isNaN(parsed) ? parsed : null;
  }

  return null;
}

async function reprocessPurchases() {
  console.log('📋 Re-processing trial_class_purchase...\n');

  const { data: records, error } = await client
    .from('trial_class_purchase')
    .select('*');

  if (error) {
    console.error('Error fetching purchases:', error);
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const record of records) {
    const purchaseDate = parseDate(record.raw_data?.['體驗課購買日期']);
    const classDate = parseDate(record.raw_data?.['最近一次上課日期']);

    if (purchaseDate || classDate) {
      const updates: any = {};
      if (purchaseDate) updates.purchase_date = purchaseDate;
      if (classDate && !record.class_date) updates.class_date = classDate;

      const { error: updateError } = await client
        .from('trial_class_purchase')
        .update(updates)
        .eq('id', record.id);

      if (updateError) {
        console.error(`Error updating ${record.id}:`, updateError.message);
      } else {
        updated++;
      }
    } else {
      skipped++;
    }
  }

  console.log(`✓ Updated ${updated} purchase records`);
  console.log(`  Skipped ${skipped} records (no valid dates)\n`);
}

async function reprocessDeals() {
  console.log('📋 Re-processing eods_for_closers...\n');

  const { data: records, error } = await client
    .from('eods_for_closers')
    .select('*');

  if (error) {
    console.error('Error fetching deals:', error);
    return;
  }

  let updated = 0;
  let skipped = 0;
  const batchSize = 100;

  // Process in batches
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const updates = [];

    for (const record of batch) {
      const dealDate = parseDate(record.raw_data?.['（諮詢）成交日期']);
      const dealAmount = parseNumber(record.raw_data?.['（諮詢）實收金額']);

      if (dealDate || dealAmount !== null) {
        // Use UPDATE instead of UPSERT to avoid NOT NULL constraints
        const updateData: any = {};
        if (dealDate) updateData.deal_date = dealDate;
        if (dealAmount !== null) updateData.deal_amount = dealAmount;

        const { error: updateError } = await client
          .from('eods_for_closers')
          .update(updateData)
          .eq('id', record.id);

        if (updateError) {
          console.error(`Error updating ${record.id}:`, updateError.message);
        } else {
          updated++;
        }
      } else {
        skipped++;
      }
    }

    if (updated > 0 && updated % 100 === 0) {
      console.log(`  Processed ${updated}/${records.length}...`);
    }
  }

  console.log(`✓ Updated ${updated} deal records`);
  console.log(`  Skipped ${skipped} records (no valid data)\n`);
}

async function main() {
  console.log('=== Re-processing Supabase Data ===\n');

  await reprocessPurchases();
  await reprocessDeals();

  // Verify results
  console.log('=== Verification ===\n');

  const { count: purchasesWithDate } = await client
    .from('trial_class_purchase')
    .select('*', { count: 'exact', head: true })
    .not('purchase_date', 'is', null);

  const { count: dealsWithDate } = await client
    .from('eods_for_closers')
    .select('*', { count: 'exact', head: true })
    .not('deal_date', 'is', null);

  const { count: dealsWithAmount } = await client
    .from('eods_for_closers')
    .select('*', { count: 'exact', head: true })
    .not('deal_amount', 'is', null);

  console.log(`📊 Results:`);
  console.log(`   Purchases with purchase_date: ${purchasesWithDate}`);
  console.log(`   Deals with deal_date: ${dealsWithDate}`);
  console.log(`   Deals with deal_amount: ${dealsWithAmount}`);
}

main().catch(console.error);

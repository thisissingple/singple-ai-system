import dotenv from 'dotenv';
import { createPool } from '../server/services/pg-client';

dotenv.config({ override: true });

async function testQuery() {
  const pool = createPool('session');

  try {
    console.log('🧪 Testing students list query...\n');

    const result = await pool.query(`
      SELECT
        skb.id,
        skb.student_email,
        skb.student_name,
        skb.total_classes,
        skb.total_consultations,
        skb.total_interactions,
        skb.first_contact_date,
        skb.last_interaction_date,
        skb.is_deleted,

        -- Phone
        COALESCE(
          (SELECT student_phone FROM eods_for_closers
           WHERE student_email = skb.student_email
           AND student_phone IS NOT NULL
           ORDER BY created_at DESC LIMIT 1),
          (SELECT student_phone FROM trial_class_attendance
           WHERE student_email = skb.student_email
           AND student_phone IS NOT NULL
           ORDER BY class_date DESC LIMIT 1)
        ) as phone,

        -- Total spent
        COALESCE(
          (SELECT SUM(
             CAST(
               REGEXP_REPLACE(
                 REGEXP_REPLACE(actual_amount, '[^0-9.]', '', 'g'),
                 '^\\.+|\\.+$', '', 'g'
               ) AS NUMERIC
             )
           )
           FROM eods_for_closers
           WHERE student_email = skb.student_email
           AND actual_amount IS NOT NULL
           AND actual_amount != ''
           AND REGEXP_REPLACE(actual_amount, '[^0-9.]', '', 'g') ~ '^[0-9.]+$'),
          0
        ) as total_spent,

        -- Conversion status
        CASE
          WHEN (
            SELECT COUNT(*) FROM eods_for_closers
            WHERE student_email = skb.student_email
            AND plan LIKE '%高階一對一訓練%'
            AND actual_amount IS NOT NULL
            AND actual_amount != ''
            AND REGEXP_REPLACE(actual_amount, '[^0-9.]', '', 'g') ~ '^[0-9.]+$'
            AND CAST(REGEXP_REPLACE(actual_amount, '[^0-9.]', '', 'g') AS NUMERIC) > 0
          ) >= 2 THEN 'renewed_high'

          WHEN (
            SELECT COUNT(*) FROM eods_for_closers
            WHERE student_email = skb.student_email
            AND plan LIKE '%高階一對一訓練%'
            AND actual_amount IS NOT NULL
            AND actual_amount != ''
            AND REGEXP_REPLACE(actual_amount, '[^0-9.]', '', 'g') ~ '^[0-9.]+$'
            AND CAST(REGEXP_REPLACE(actual_amount, '[^0-9.]', '', 'g') AS NUMERIC) > 0
          ) = 1 THEN 'purchased_high'

          WHEN EXISTS(
            SELECT 1 FROM trial_class_purchases
            WHERE student_email = skb.student_email
          ) THEN 'purchased_trial'

          ELSE 'not_purchased'
        END as conversion_status,

        -- Consultation status
        CASE
          WHEN EXISTS(
            SELECT 1 FROM eods_for_closers
            WHERE student_email = skb.student_email
            AND is_show != '已上線'
          ) THEN 'no_show'

          WHEN EXISTS(
            SELECT 1 FROM eods_for_closers
            WHERE student_email = skb.student_email
            AND is_show = '已上線'
          ) THEN 'consulted'

          ELSE 'not_consulted'
        END as consultation_status,

        -- Teacher
        (SELECT teacher_name FROM trial_class_attendance
         WHERE student_email = skb.student_email
         ORDER BY class_date DESC LIMIT 1) as teacher,

        -- Consultant
        (SELECT closer_name FROM eods_for_closers
         WHERE student_email = skb.student_email
         ORDER BY created_at DESC LIMIT 1) as consultant

      FROM student_knowledge_base skb
      WHERE (skb.is_deleted = false OR skb.is_deleted IS NULL)
      LIMIT 5
    `);

    console.log(`✅ Query executed successfully`);
    console.log(`📊 Returned ${result.rows.length} rows`);

    if (result.rows.length > 0) {
      console.log('\n📋 Sample row:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    }

  } catch (error: any) {
    console.error('❌ Query failed:', error.message);
    console.error('\n🔍 Error details:', error);
  } finally {
    await pool.end();
  }
}

testQuery();

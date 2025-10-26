/**
 * Manually add Chen Guanlin's analysis to KB
 */

import 'dotenv/config';
import { createPool } from '../server/services/pg-client';

async function main() {
  const pool = createPool();

  try {
    console.log('📝 Manually adding analysis to knowledge base...\n');

    const result = await pool.query(`
      UPDATE student_knowledge_base
      SET data_sources = jsonb_set(
        COALESCE(data_sources, '{}'::jsonb),
        '{ai_analyses}',
        COALESCE(data_sources->'ai_analyses', '[]'::jsonb) || $1::jsonb,
        true
      ),
      updated_at = NOW()
      WHERE student_email = $2
      RETURNING data_sources
    `, [
      JSON.stringify(['fb1dbdd0-283b-4a04-b8fd-b3e944375660']),
      'ssaa.42407@gmail.com'
    ]);

    if (result.rows.length > 0) {
      console.log('✅ Successfully added to knowledge base!');
      console.log('  Updated data_sources:', JSON.stringify(result.rows[0].data_sources, null, 2));
    } else {
      console.log('⚠️  No rows updated');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

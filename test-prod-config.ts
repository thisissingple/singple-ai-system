/**
 * Test production consultation_analysis_config table
 */

import pg from 'pg';

const { Pool } = pg;

async function testProdConfig() {
  console.log('Testing production consultation_analysis_config table...\n');

  const pool = new Pool({
    connectionString: 'postgresql://postgres.vqkkqkjaywkjtraepqbg:Fff1359746!@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Test 1: Check if table exists
    console.log('1. Checking if table exists...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'consultation_analysis_config'
      );
    `);
    console.log('   Table exists:', tableCheck.rows[0].exists);

    if (!tableCheck.rows[0].exists) {
      console.log('\n❌ Table does not exist! Migration not executed.');
      return;
    }

    // Test 2: Check table structure
    console.log('\n2. Checking table structure...');
    const structure = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'consultation_analysis_config'
      ORDER BY ordinal_position;
    `);
    console.log('   Columns:');
    structure.rows.forEach((row: any) => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    // Test 3: Check if config record exists
    console.log('\n3. Checking if config record exists...');
    const configCheck = await pool.query(`
      SELECT id, ai_model, temperature, max_tokens,
             LENGTH(analysis_prompt) as prompt_length,
             updated_at, updated_by
      FROM consultation_analysis_config
      WHERE id = '00000000-0000-0000-0000-000000000001'::UUID;
    `);

    if (configCheck.rows.length === 0) {
      console.log('   ❌ Config record does not exist!');
      console.log('\n   Trying to insert default config...');

      const insertResult = await pool.query(`
        INSERT INTO consultation_analysis_config (
          id, ai_model, temperature, max_tokens, analysis_prompt, updated_at, updated_by
        ) VALUES (
          '00000000-0000-0000-0000-000000000001'::UUID,
          'gpt-4o',
          0.7,
          4000,
          '你是一位專精教育銷售的策略顧問',
          NOW(),
          'test-script'
        ) RETURNING *;
      `);
      console.log('   ✅ Default config inserted:', insertResult.rows[0]);
    } else {
      console.log('   ✅ Config record exists:');
      console.log('   ', configCheck.rows[0]);
    }

    // Test 4: Try to update config (simulate save)
    console.log('\n4. Testing UPDATE operation...');
    try {
      const updateResult = await pool.query(`
        UPDATE consultation_analysis_config
        SET
          ai_model = $1,
          temperature = $2,
          max_tokens = $3,
          analysis_prompt = $4,
          updated_at = NOW(),
          updated_by = $5
        WHERE id = '00000000-0000-0000-0000-000000000001'::UUID
        RETURNING *;
      `, ['gpt-4o', 0.7, 4000, 'Test prompt from script', 'test-script']);

      console.log('   ✅ UPDATE successful!');
      console.log('   Updated record:', {
        id: updateResult.rows[0].id,
        ai_model: updateResult.rows[0].ai_model,
        temperature: updateResult.rows[0].temperature,
        max_tokens: updateResult.rows[0].max_tokens,
        prompt_length: updateResult.rows[0].analysis_prompt.length,
        updated_by: updateResult.rows[0].updated_by,
      });
    } catch (updateError: any) {
      console.log('   ❌ UPDATE failed:', updateError.message);
    }

    console.log('\n✅ All tests completed!');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testProdConfig();

/**
 * Check Consultant AI Conversations for 童義螢
 */

import * as dotenv from 'dotenv';
import { createPool } from '../server/services/pg-client.ts';

dotenv.config({ override: true });

async function checkConversations() {
  const pool = createPool('session');

  try {
    // Check consultant conversations
    console.log('📋 檢查諮詢師 AI 對話記錄...\n');

    const result = await pool.query(`
      SELECT
        id,
        consultant_id,
        student_email,
        question,
        question_type,
        preset_question_key,
        created_at,
        tokens_used,
        api_cost_usd
      FROM consultant_ai_conversations
      WHERE student_email LIKE '%童%'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`找到 ${result.rows.length} 筆記錄：\n`);

    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. 問題：${row.question}`);
      console.log(`   Email: ${row.student_email}`);
      console.log(`   諮詢師: ${row.consultant_id}`);
      console.log(`   類型: ${row.question_type} ${row.preset_question_key ? `(${row.preset_question_key})` : ''}`);
      console.log(`   時間: ${row.created_at}`);
      console.log(`   Cost: $${row.api_cost_usd || 0}`);
      console.log('');
    });

    // Check consultation analyses for comparison
    console.log('\n📊 檢查諮詢 AI 分析記錄 (對照)...\n');

    const analysisResult = await pool.query(`
      SELECT
        id,
        eod_id,
        analyzed_at,
        overall_rating
      FROM consultation_quality_analysis
      WHERE eod_id IN (
        SELECT id FROM eods_for_closers
        WHERE student_email LIKE '%童%'
      )
      ORDER BY analyzed_at DESC
      LIMIT 5
    `);

    console.log(`找到 ${analysisResult.rows.length} 筆諮詢分析記錄：\n`);

    analysisResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. 分析時間：${row.analyzed_at}`);
      console.log(`   EOD ID: ${row.eod_id}`);
      console.log(`   評分: ${row.overall_rating}/10`);
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ 查詢失敗:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

checkConversations().catch(console.error);

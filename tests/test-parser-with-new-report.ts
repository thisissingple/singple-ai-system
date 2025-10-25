/**
 * Test parser with the new report format (with reasoning field)
 */

import 'dotenv/config';
import { createPool } from '../server/services/pg-client';

// Import the parser (we'll need to adjust path)
// For now, let's just test the regex pattern

async function testParser() {
  const pool = createPool();

  try {
    console.log('🧪 測試解析器能否提取「理由」欄位...\n');

    // Get the latest report
    const query = `
      SELECT class_summary
      FROM teaching_quality_analysis tqa
      JOIN trial_class_attendance tca ON tqa.attendance_id = tca.id
      WHERE tca.student_email = $1
      ORDER BY tqa.created_at DESC
      LIMIT 1
    `;
    const result = await pool.query(query, ['ssaa.42407@gmail.com']);

    if (result.rows.length === 0) {
      console.log('❌ 找不到報告');
      return;
    }

    const report = result.rows[0].class_summary;

    // Test extracting one metric
    const scoresSection = report.match(/# 🧮 成交策略評估[\s\S]*?(?=# |$)/);
    if (!scoresSection) {
      console.log('❌ 找不到評分段落');
      return;
    }

    const sectionBody = scoresSection[0];

    // Test parsing one metric
    const label = '呼應痛點程度';
    const metricRegex = new RegExp(
      `\\*\\*${label}[：:]\\s*(\\d+)/(\\d+)\\*\\*([\\s\\S]*?)(?=\\n\\*\\*[^證理]+[：:]\\s*\\d+/\\d+|$)`,
      'i'
    );
    const match = sectionBody.match(metricRegex);

    if (match) {
      const value = parseInt(match[1], 10);
      const maxValue = parseInt(match[2], 10);
      const content = match[3].trim();

      console.log(`✅ 找到指標：${label} ${value}/${maxValue}\n`);

      console.log('🔍 Content to parse:');
      console.log(content);
      console.log('\n' + '='.repeat(80) + '\n');

      // Extract evidence (with more flexible pattern to handle nested bullets)
      const evidenceMatch = content.match(/[-–—]\s*\*\*證據[^*]*\*\*\s*([\s\S]*?)(?=\n-\s*\*\*理由|$)/);
      const evidenceText = evidenceMatch ? evidenceMatch[1].trim() : '';

      // Extract reasoning (with more flexible pattern)
      const reasoningMatch = content.match(/[-–—]\s*\*\*理由[：:]\*\*\s*([\s\S]*?)(?=\n\*\*[^*]+[：:]|$)/);
      const reasoningText = reasoningMatch ? reasoningMatch[1].trim() : '';

      console.log('📋 證據：');
      console.log(evidenceText || '(empty)');
      console.log('\n💭 理由：');
      console.log(reasoningText || '(empty)');

      if (reasoningText) {
        console.log('✅ 成功提取「理由」欄位！');
      } else {
        console.log('❌ 未能提取「理由」欄位');
      }
    } else {
      console.log(`❌ 無法匹配指標：${label}`);
    }
  } catch (error) {
    console.error('❌ 錯誤：', error);
  } finally {
    await pool.end();
  }
}

testParser();

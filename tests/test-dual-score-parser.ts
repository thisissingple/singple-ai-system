/**
 * Test parser with dual scoring system
 */

import 'dotenv/config';
import { createPool } from '../server/services/pg-client';
import { parseTeachingAnalysisMarkdown } from '../client/src/lib/parse-teaching-analysis';
import { calculateOverallScore } from '../client/src/lib/calculate-overall-score';

async function testDualScoreParser() {
  const pool = createPool();

  try {
    console.log('🧪 測試雙評分系統解析器...\n');

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
    const parsed = parseTeachingAnalysisMarkdown(report);

    if (!parsed) {
      console.log('❌ 解析失敗');
      return;
    }

    console.log('✅ 解析成功！\n');

    // Teaching Quality Metrics
    console.log('📚 教學品質評估：');
    console.log('='.repeat(80));
    if (parsed.teachingMetrics && parsed.teachingMetrics.length > 0) {
      parsed.teachingMetrics.forEach(metric => {
        console.log(`  ${metric.label}: ${metric.value}/${metric.maxValue}`);
        if (metric.evidence) {
          console.log(`    證據: ${metric.evidence.substring(0, 80)}...`);
        }
        if (metric.reasoning) {
          console.log(`    理由: ${metric.reasoning.substring(0, 80)}...`);
        }
      });
      console.log(`\n  教學品質總分: ${parsed.teachingTotalScore}/${parsed.teachingMaxScore}`);
    } else {
      console.log('  ❌ 未解析到教學評分');
    }
    console.log('='.repeat(80));
    console.log('');

    // Sales Strategy Metrics
    console.log('🧮 成交策略評估：');
    console.log('='.repeat(80));
    if (parsed.salesMetrics && parsed.salesMetrics.length > 0) {
      parsed.salesMetrics.forEach(metric => {
        console.log(`  ${metric.label}: ${metric.value}/${metric.maxValue}`);
        if (metric.evidence) {
          console.log(`    證據: ${metric.evidence.substring(0, 80)}...`);
        }
        if (metric.reasoning) {
          console.log(`    理由: ${metric.reasoning.substring(0, 80)}...`);
        }
      });
      console.log(`\n  推課評分總分: ${parsed.salesTotalScore}/${parsed.salesMaxScore}`);
    } else {
      console.log('  ❌ 未解析到推課評分');
    }
    console.log('='.repeat(80));
    console.log('');

    // Overall Score Calculation
    console.log('🏆 整體評分計算：');
    console.log('='.repeat(80));
    const overall = calculateOverallScore(
      parsed.teachingTotalScore || 0,
      parsed.salesTotalScore || 0,
      parsed.probability || 0
    );

    console.log(`  教學品質: ${parsed.teachingTotalScore}/25 → 貢獻 ${overall.breakdown.teaching}/30`);
    console.log(`  推課策略: ${parsed.salesTotalScore}/25 → 貢獻 ${overall.breakdown.sales}/30`);
    console.log(`  成交機率: ${parsed.probability}% → 貢獻 ${overall.breakdown.conversion}/40`);
    console.log(`\n  總分: ${overall.score}/100`);
    console.log(`  等級: ${overall.grade}`);
    console.log(`  顏色: ${overall.breakdown.teaching + overall.breakdown.sales + overall.breakdown.conversion}`);
    console.log('='.repeat(80));

    console.log('\n✅ 所有測試完成！');
  } catch (error) {
    console.error('❌ 錯誤：', error);
  } finally {
    await pool.end();
  }
}

testDualScoreParser();

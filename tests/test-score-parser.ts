/**
 * Test the score parser with Chen Guanlin's Markdown
 */

import 'dotenv/config';
import { createPool } from '../server/services/pg-client';
import { parseScoresFromMarkdown } from '../server/services/parse-teaching-scores';

async function main() {
  const pool = createPool();

  try {
    console.log('🧪 Testing score parser with Chen Guanlin analysis...\n');

    // Get Chen Guanlin's analysis
    const result = await pool.query(`
      SELECT class_summary
      FROM teaching_quality_analysis
      WHERE student_name LIKE '%陳冠霖%'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('❌ No analysis found for Chen Guanlin');
      return;
    }

    const markdown = result.rows[0].class_summary;

    console.log('📄 Parsing Markdown...\n');
    const scores = parseScoresFromMarkdown(markdown);

    console.log('✅ Parsed Scores:');
    console.log('  Teaching Score: %d/25', scores.teachingScore);
    console.log('  Sales Score: %d/25', scores.salesScore);
    console.log('  Conversion Probability: %d%%', scores.conversionProbability);
    console.log('  Overall Score: %d/100', scores.overallScore);
    console.log('');

    console.log('📊 Calculation Breakdown:');
    const teachingContrib = (scores.teachingScore / 25) * 30;
    const salesContrib = (scores.salesScore / 25) * 30;
    const conversionContrib = scores.conversionProbability * 0.4;

    console.log('  Teaching contribution: (20/25 × 30) = %.1f', teachingContrib);
    console.log('  Sales contribution: (15/25 × 30) = %.1f', salesContrib);
    console.log('  Conversion contribution: (55 × 0.4) = %.1f', conversionContrib);
    console.log('  Total: %.1f → %d (rounded)', teachingContrib + salesContrib + conversionContrib, scores.overallScore);
    console.log('');

    // Expected values
    const expected = {
      teachingScore: 20,
      salesScore: 15,
      conversionProbability: 55,
      overallScore: 64,
    };

    console.log('✅ Validation:');
    console.log('  Teaching Score: %s', scores.teachingScore === expected.teachingScore ? '✓' : `✗ (expected ${expected.teachingScore}, got ${scores.teachingScore})`);
    console.log('  Sales Score: %s', scores.salesScore === expected.salesScore ? '✓' : `✗ (expected ${expected.salesScore}, got ${scores.salesScore})`);
    console.log('  Conversion Probability: %s', scores.conversionProbability === expected.conversionProbability ? '✓' : `✗ (expected ${expected.conversionProbability}, got ${scores.conversionProbability})`);
    console.log('  Overall Score: %s', scores.overallScore === expected.overallScore ? '✓' : `✗ (expected ${expected.overallScore}, got ${scores.overallScore})`);

    if (
      scores.teachingScore === expected.teachingScore &&
      scores.salesScore === expected.salesScore &&
      scores.conversionProbability === expected.conversionProbability &&
      scores.overallScore === expected.overallScore
    ) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log('\n❌ Some tests failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

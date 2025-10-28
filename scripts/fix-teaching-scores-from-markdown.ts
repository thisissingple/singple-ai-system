/**
 * Fix Teaching Quality Scores from Markdown
 *
 * Problem: 157 out of 158 records have teaching_score=0, sales_score=0
 * because the backend was parsing from analysis.summary instead of
 * conversion_suggestions.markdownOutput
 *
 * This script re-parses all records with zero scores from their stored Markdown.
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import parse function (we'll inline it if needed)
function parseTeachingScore(markdown: string): number {
  // Pattern 1: Strict match with bold
  let match = markdown.match(/\*\*教學品質總分[：:]\s*(\d+)\s*\/\s*(\d+)\*\*/);

  // Pattern 2: Moderate tolerance
  if (!match) {
    match = markdown.match(/\*\*教學品質總分[：:]\*\*\s*(\d+)\s*\/\s*(\d+)/);
  }

  // Pattern 3: Maximum tolerance
  if (!match) {
    match = markdown.match(/教學品質總分[^0-9]*(\d+)\s*\/\s*(\d+)/);
  }

  if (match) {
    const score = parseInt(match[1], 10);
    const maxScore = parseInt(match[2], 10);

    if (score >= 0 && score <= maxScore && maxScore === 25) {
      return score;
    }
  }

  return 0;
}

function parseSalesScore(markdown: string): number {
  let totalMatch = markdown.match(/總[評分][^0-9]{0,20}(\d+)\s*\/\s*25/);

  if (totalMatch) {
    const score = parseInt(totalMatch[1], 10);
    if (score >= 0 && score <= 25) {
      return score;
    }
  }

  return 0;
}

function parseConversionProbability(markdown: string): number {
  let match = markdown.match(/預估成交機率[^0-9]{0,20}(\d+)%/);

  if (match) {
    const prob = parseInt(match[1], 10);
    if (prob >= 0 && prob <= 100) {
      return prob;
    }
  }

  return 55;
}

function calculateOverallScore(
  teachingScore: number,
  salesScore: number,
  conversionProbability: number
): number {
  const teachingContribution = (teachingScore / 25) * 30;
  const salesContribution = (salesScore / 25) * 30;
  const conversionContribution = conversionProbability * 0.4;

  const total = teachingContribution + salesContribution + conversionContribution;

  return Math.max(0, Math.min(100, Math.round(total)));
}

function parseScoresFromMarkdown(markdown: string) {
  const teachingScore = parseTeachingScore(markdown);
  const salesScore = parseSalesScore(markdown);
  const conversionProbability = parseConversionProbability(markdown);
  const overallScore = calculateOverallScore(teachingScore, salesScore, conversionProbability);

  return {
    teachingScore,
    salesScore,
    conversionProbability,
    overallScore,
  };
}

interface AnalysisRecord {
  id: string;
  student_name: string;
  conversion_suggestions: any;
  teaching_score: number;
  sales_score: number;
  conversion_probability: number;
  overall_score: number;
}

async function fixTeachingScores() {
  const dbUrl = process.env.SUPABASE_SESSION_DB_URL || process.env.SESSION_DB_URL || process.env.DATABASE_URL;

  if (!dbUrl) {
    throw new Error('No database URL found in environment variables');
  }

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('supabase.co') ? { rejectUnauthorized: false } : undefined
  });

  console.log('🔍 Starting to fix teaching quality scores...\n');

  try {
    // Step 1: Fetch all records with zero scores but have markdown
    console.log('📊 Fetching records with zero scores...');
    const result = await pool.query<AnalysisRecord>(`
      SELECT
        id,
        student_name,
        conversion_suggestions,
        teaching_score,
        sales_score,
        conversion_probability,
        overall_score
      FROM teaching_quality_analysis
      WHERE (teaching_score = 0 OR sales_score = 0)
        AND conversion_suggestions IS NOT NULL
      ORDER BY created_at DESC
    `);

    const records = result.rows;
    console.log(`✅ Found ${records.length} records to fix\n`);

    if (records.length === 0) {
      console.log('✨ No records need fixing!');
      await pool.end();
      return;
    }

    // Step 2: Process each record
    let successCount = 0;
    let failCount = 0;
    const failures: Array<{ id: string; name: string; error: string }> = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const progress = `[${i + 1}/${records.length}]`;

      try {
        // Parse conversion_suggestions
        const conversionSuggestions = typeof record.conversion_suggestions === 'string'
          ? JSON.parse(record.conversion_suggestions)
          : record.conversion_suggestions;

        const markdownOutput = conversionSuggestions?.markdownOutput;

        if (!markdownOutput || typeof markdownOutput !== 'string') {
          console.log(`⚠️  ${progress} ${record.student_name} - No markdownOutput found, skipping`);
          failCount++;
          failures.push({
            id: record.id,
            name: record.student_name,
            error: 'No markdownOutput'
          });
          continue;
        }

        // Parse scores from markdown
        const parsedScores = parseScoresFromMarkdown(markdownOutput);

        // Check if parsing was successful (scores should not all be 0)
        if (parsedScores.teachingScore === 0 && parsedScores.salesScore === 0) {
          console.log(`⚠️  ${progress} ${record.student_name} - Parsing failed (all scores = 0)`);
          console.log(`     Markdown preview: ${markdownOutput.substring(0, 100)}...`);
          failCount++;
          failures.push({
            id: record.id,
            name: record.student_name,
            error: 'Parsing returned all zeros'
          });
          continue;
        }

        // Update database
        await pool.query(`
          UPDATE teaching_quality_analysis
          SET teaching_score = $1,
              sales_score = $2,
              conversion_probability = $3,
              overall_score = $4,
              updated_at = NOW()
          WHERE id = $5
        `, [
          parsedScores.teachingScore,
          parsedScores.salesScore,
          parsedScores.conversionProbability,
          parsedScores.overallScore,
          record.id
        ]);

        console.log(`✅ ${progress} ${record.student_name}`);
        console.log(`     Old: T=${record.teaching_score} S=${record.sales_score} C=${record.conversion_probability}% → Overall=${record.overall_score}`);
        console.log(`     New: T=${parsedScores.teachingScore} S=${parsedScores.salesScore} C=${parsedScores.conversionProbability}% → Overall=${parsedScores.overallScore}\n`);

        successCount++;
      } catch (error: any) {
        console.error(`❌ ${progress} ${record.student_name} - Error:`, error.message);
        failCount++;
        failures.push({
          id: record.id,
          name: record.student_name,
          error: error.message
        });
      }
    }

    // Step 3: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully fixed: ${successCount} records`);
    console.log(`❌ Failed: ${failCount} records`);
    console.log(`📈 Success rate: ${((successCount / records.length) * 100).toFixed(1)}%`);

    if (failures.length > 0) {
      console.log('\n⚠️  Failed records:');
      failures.forEach(f => {
        console.log(`   - ${f.name} (${f.id}): ${f.error}`);
      });
    }

    // Step 4: Verify final state
    console.log('\n🔍 Verifying database state...');
    const verifyResult = await pool.query(`
      SELECT
        COUNT(*) as total_records,
        SUM(CASE WHEN teaching_score = 0 AND sales_score = 0 THEN 1 ELSE 0 END) as zero_score_records,
        SUM(CASE WHEN conversion_suggestions IS NOT NULL THEN 1 ELSE 0 END) as has_markdown_records
      FROM teaching_quality_analysis
    `);

    const stats = verifyResult.rows[0];
    console.log(`   Total records: ${stats.total_records}`);
    console.log(`   Records with zero scores: ${stats.zero_score_records}`);
    console.log(`   Records with markdown: ${stats.has_markdown_records}`);

    await pool.end();
    console.log('\n✨ Done!');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run the script
fixTeachingScores().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

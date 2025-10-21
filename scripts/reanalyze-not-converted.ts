/**
 * Re-analyze not_converted records to generate proper conversion_suggestions
 */

import { queryDatabase } from '../server/services/pg-client';
import { analyzeTeachingQuality } from '../server/services/teaching-quality-gpt-service';

async function main() {
  try {
    console.log('🔍 Finding not_converted records without proper conversion_suggestions...\n');

    // Find all not_converted records
    const query = `
      SELECT
        tqa.id,
        tqa.student_name,
        tqa.teacher_name,
        tqa.class_topic,
        tqa.transcript_text,
        tqa.conversion_suggestions
      FROM teaching_quality_analysis tqa
      WHERE tqa.conversion_status = 'not_converted'
      AND tqa.transcript_text IS NOT NULL
      LIMIT 5
    `;
    const result = await queryDatabase(query, []);

    if (result.rows.length === 0) {
      console.log('❌ No not_converted records found');
      return;
    }

    console.log(`✅ Found ${result.rows.length} not_converted records\n`);

    for (const record of result.rows) {
      console.log(`\n📊 Processing: ${record.student_name} (ID: ${record.id})`);
      console.log(`   Teacher: ${record.teacher_name}`);
      console.log(`   Current suggestions: ${JSON.stringify(record.conversion_suggestions)?.substring(0, 100) || 'null'}`);

      // Check if it already has proper conversion_suggestions
      if (record.conversion_suggestions &&
          typeof record.conversion_suggestions === 'object' &&
          !Array.isArray(record.conversion_suggestions) &&
          record.conversion_suggestions.studentAnalysis) {
        console.log(`   ✅ Already has proper conversion_suggestions, skipping...`);
        continue;
      }

      try {
        console.log(`   🤖 Re-analyzing with GPT...`);

        const analysis = await analyzeTeachingQuality(
          record.transcript_text,
          record.student_name,
          record.teacher_name,
          record.class_topic
        );

        console.log(`   ✅ Analysis complete`);
        console.log(`   📊 Overall Score: ${analysis.overallScore}/10`);
        console.log(`   📌 Conversion Probability: ${analysis.conversionSuggestions?.conversionProbability || 'N/A'}%`);
        console.log(`   📝 Has student analysis: ${!!analysis.conversionSuggestions?.studentAnalysis}`);
        console.log(`   💼 Has sales strategy: ${!!analysis.conversionSuggestions?.salesStrategy}`);

        // Update database
        const updateQuery = `
          UPDATE teaching_quality_analysis
          SET
            conversion_suggestions = $1,
            overall_score = $2,
            updated_at = NOW()
          WHERE id = $3
        `;

        await queryDatabase(updateQuery, [
          JSON.stringify(analysis.conversionSuggestions),
          analysis.overallScore,
          record.id
        ]);

        console.log(`   💾 Database updated successfully`);

      } catch (error) {
        console.error(`   ❌ Error analyzing ${record.student_name}:`, error);
        continue;
      }

      // Add a delay to avoid rate limiting
      console.log(`   ⏳ Waiting 5 seconds before next record...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log('\n\n✅ Re-analysis complete!');
    console.log('\n📊 Summary:');
    console.log(`   Processed: ${result.rows.length} records`);
    console.log(`\n💡 Check the results in the Teaching Quality page`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();

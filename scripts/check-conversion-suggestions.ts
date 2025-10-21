/**
 * Check conversion_suggestions format in database
 */

import { queryDatabase } from '../server/services/pg-client';

async function main() {
  try {
    console.log('🔍 Checking conversion_suggestions data...\n');

    // Find a record with conversion_suggestions
    const query = `
      SELECT
        id,
        student_name,
        conversion_status,
        conversion_suggestions
      FROM teaching_quality_analysis
      WHERE conversion_status = 'not_converted'
        AND conversion_suggestions IS NOT NULL
      LIMIT 1
    `;
    const result = await queryDatabase(query, []);

    if (result.rows.length === 0) {
      console.log('❌ No records with conversion_suggestions found');
      console.log('\n🔍 Checking all not_converted records...\n');

      const query2 = `
        SELECT id, student_name, conversion_status, conversion_suggestions IS NULL as no_suggestions
        FROM teaching_quality_analysis
        WHERE conversion_status = 'not_converted'
        LIMIT 5
      `;
      const allNotConverted = await queryDatabase(query2, []);

      console.log(`Found ${allNotConverted.rows.length} not_converted records:`);
      console.table(allNotConverted.rows);
      return;
    }

    const record = result.rows[0];
    console.log('✅ Found record:');
    console.log(`ID: ${record.id}`);
    console.log(`Student: ${record.student_name}`);
    console.log(`Status: ${record.conversion_status}\n`);

    console.log('📊 Conversion Suggestions Data:');
    console.log(JSON.stringify(record.conversion_suggestions, null, 2));

    // Check structure
    const suggestions = record.conversion_suggestions;
    if (suggestions) {
      console.log('\n🔍 Structure Check:');
      console.log(`Has studentAnalysis: ${!!suggestions.studentAnalysis}`);
      console.log(`Has salesStrategy: ${!!suggestions.salesStrategy}`);
      console.log(`Has finalClosingScript: ${!!suggestions.finalClosingScript}`);
      console.log(`Has conversionProbability: ${!!suggestions.conversionProbability}`);

      if (suggestions.studentAnalysis) {
        console.log('\n📋 Student Analysis Keys:', Object.keys(suggestions.studentAnalysis));
        console.log(`technicalIssues length: ${suggestions.studentAnalysis.technicalIssues?.length || 0}`);
        console.log(`Example technical issue:`, suggestions.studentAnalysis.technicalIssues?.[0]);
      }

      if (suggestions.salesStrategy) {
        console.log('\n💼 Sales Strategy Keys:', Object.keys(suggestions.salesStrategy));
        console.log(`scriptDesign length: ${suggestions.salesStrategy.scriptDesign?.length || 0}`);
        console.log(`Example script:`, suggestions.salesStrategy.scriptDesign?.[0]);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();

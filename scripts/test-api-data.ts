import { queryDatabase } from '../server/services/pg-client';

const analysisId = 'f844c6cd-21fd-49b3-8f59-0d408f114f8c'; // 徐承靖

const query = `
  SELECT
    id,
    student_name,
    conversion_status,
    conversion_suggestions
  FROM teaching_quality_analysis
  WHERE id = $1
`;

queryDatabase(query, [analysisId]).then(result => {
  if (result.rows.length > 0) {
    const analysis = result.rows[0];
    console.log('Student:', analysis.student_name);
    console.log('Status:', analysis.conversion_status);
    console.log('\n=== Conversion Suggestions ===\n');

    const suggestions = analysis.conversion_suggestions;

    if (suggestions && suggestions.studentAnalysis) {
      console.log('🎯 學員狀況分析:');
      console.log('\n1. 技術面問題:');
      suggestions.studentAnalysis.technicalIssues?.forEach((issue: string) => {
        console.log(`   • ${issue}`);
      });

      console.log('\n2. 心理面問題:');
      suggestions.studentAnalysis.psychologicalIssues?.forEach((issue: string) => {
        console.log(`   • ${issue}`);
      });

      console.log('\n3. 動機來源:');
      console.log(`   ${suggestions.studentAnalysis.motivationSource}`);

      console.log('\n4. 學員屬性:');
      console.log(`   ${suggestions.studentAnalysis.studentProfile}`);
    }

    if (suggestions && suggestions.salesStrategy) {
      console.log('\n\n🧠 成交策略:');

      console.log('\n1. 痛點放大:');
      console.log(`   ${suggestions.salesStrategy.painPointAmplification}`);

      console.log('\n2. 夢想畫面:');
      console.log(`   ${suggestions.salesStrategy.dreamVision}`);

      console.log('\n3. 產品匹配:');
      console.log(`   ${suggestions.salesStrategy.productMatch}`);

      console.log('\n4. 話術設計:');
      suggestions.salesStrategy.scriptDesign?.forEach((script: string, i: number) => {
        console.log(`   [話術 ${i + 1}] ${script}`);
      });

      console.log('\n5. 成交收斂:');
      console.log(`   ${suggestions.salesStrategy.closingScript}`);
    }

    if (suggestions && suggestions.finalClosingScript) {
      console.log('\n\n✨ 完整成交話術:');
      console.log(suggestions.finalClosingScript);
    }

  } else {
    console.log('❌ Record not found');
  }
}).catch(console.error);

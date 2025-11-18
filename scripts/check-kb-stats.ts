import { queryDatabase } from '../server/services/pg-client';

async function main() {
  console.log('📊 Checking student_knowledge_base statistics...\n');

  // Total count
  const totalResult = await queryDatabase(`
    SELECT COUNT(*) as total FROM student_knowledge_base
  `);
  console.log(`Total KB records: ${totalResult.rows[0].total}`);

  // Active vs deleted
  const statusResult = await queryDatabase(`
    SELECT
      COUNT(CASE WHEN is_deleted = false THEN 1 END) as active,
      COUNT(CASE WHEN is_deleted = true THEN 1 END) as deleted
    FROM student_knowledge_base
  `);
  console.log(`Active students: ${statusResult.rows[0].active}`);
  console.log(`Deleted students: ${statusResult.rows[0].deleted}\n`);

  // Sample records
  const sampleResult = await queryDatabase(`
    SELECT
      student_email,
      student_name,
      total_classes,
      total_consultations,
      is_deleted
    FROM student_knowledge_base
    ORDER BY total_interactions DESC
    LIMIT 5
  `);

  console.log('Top 5 students by interaction count:');
  sampleResult.rows.forEach((row: any, index: number) => {
    console.log(`${index + 1}. ${row.student_name} (${row.student_email})`);
    console.log(`   Classes: ${row.total_classes}, Consultations: ${row.total_consultations}, Deleted: ${row.is_deleted}`);
  });

  process.exit(0);
}

main();

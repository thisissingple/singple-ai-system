/**
 * Test student profile parser with new format
 */

import 'dotenv/config';
import { createPool } from '../server/services/pg-client';

// Import parser (we need to test it from Node.js, so let's use dynamic import)
async function testStudentProfileParser() {
  const pool = createPool();

  try {
    console.log('🧪 Testing student profile parser...\n');

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
      console.log('❌ No report found');
      return;
    }

    const report = result.rows[0].class_summary;

    // Test regex patterns manually (simulating the parser)
    const profileSection = report.match(/# 🧑‍🏫 學員狀況掌握[\s\S]*?(?=# 📚|$)/);

    if (!profileSection) {
      console.log('❌ Student profile section not found');
      return;
    }

    const sectionBody = profileSection[0];
    console.log('✅ Student profile section found\n');

    // Test lifestyle extraction
    const lifestyleMatch = sectionBody.match(/\*\*生活型態與時間結構[：:]\*\*\s*([\s\S]*?)(?=\n\s*\*\*練習環境|$)/);
    console.log('📋 Lifestyle extraction:');
    console.log(lifestyleMatch ? '✅ Found' : '❌ Not found');
    if (lifestyleMatch) {
      console.log('Content:', lifestyleMatch[1].trim().slice(0, 100));
    }
    console.log();

    // Test environment extraction
    const envMatch = sectionBody.match(/\*\*練習環境與限制[：:]\*\*\s*([\s\S]*?)(?=\n\s*\*\*購課決策|$)/);
    console.log('🏠 Environment extraction:');
    console.log(envMatch ? '✅ Found' : '❌ Not found');
    if (envMatch) {
      console.log('Content:', envMatch[1].trim().slice(0, 100));
    }
    console.log();

    // Test purchase decision extraction
    const purchaseMatch = sectionBody.match(/\*\*購課決策與付費指標[：:]\*\*\s*([\s\S]*?)(?=\n\s*\*\*推斷說明|$)/);
    console.log('💰 Purchase decision extraction:');
    console.log(purchaseMatch ? '✅ Found' : '❌ Not found');
    if (purchaseMatch) {
      console.log('Content:', purchaseMatch[1].trim().slice(0, 100));
    }
    console.log();

    // Test voice status extraction
    const voiceMatch = sectionBody.match(/[-–—]\s*\*\*🎤\s*聲音現況[^*]*\*\*\s*([^\n]+)/);
    console.log('🎤 Voice status extraction:');
    console.log(voiceMatch ? '✅ Found' : '❌ Not found');
    if (voiceMatch) {
      console.log('Content:', voiceMatch[1].trim());
    }
    console.log();

    // Test needs to ask extraction
    const needsMatch = sectionBody.match(/[-–—]\s*\*\*📝\s*仍需補問\*\*\s*([\s\S]*?)(?=\n---|\n#|$)/);
    console.log('📝 Needs to ask extraction:');
    console.log(needsMatch ? '✅ Found' : '❌ Not found');
    if (needsMatch) {
      const bulletRegex = /[-–—]\s*([^\n]+)/g;
      const items: string[] = [];
      let match;
      while ((match = bulletRegex.exec(needsMatch[1])) !== null) {
        items.push(match[1].trim());
      }
      console.log(`Found ${items.length} items:`, items);
    }
    console.log();

    console.log('✅ Parser test complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testStudentProfileParser();

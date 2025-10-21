import bcrypt from 'bcryptjs';
import { queryDatabase } from './server/services/pg-client';

async function testElenaPassword() {
  console.log('Testing Elena password verification...\n');

  const query = `
    SELECT id, email, password_hash
    FROM users
    WHERE LOWER(email) = LOWER($1)
  `;

  const result = await queryDatabase(query, ['elena@singple.com']);

  if (result.rows.length === 0) {
    console.log('❌ User not found!');
    return;
  }

  const user = result.rows[0];
  console.log(`✓ Found user: ${user.email}`);
  console.log(`  ID: ${user.id}`);
  console.log(`  Hash preview: ${user.password_hash?.substring(0, 30)}...\n`);

  const testPassword = 'admin123';
  console.log(`Testing password: "${testPassword}"`);

  if (!user.password_hash) {
    console.log('❌ No password hash found!');
    return;
  }

  const isMatch = await bcrypt.compare(testPassword, user.password_hash);
  console.log(`Password match: ${isMatch ? '✅ YES' : '❌ NO'}`);

  // Test admin account too
  console.log('\n--- Testing Admin Account ---\n');
  const adminResult = await queryDatabase(query, ['admin@example.com']);

  if (adminResult.rows.length === 0) {
    console.log('❌ Admin not found!');
    return;
  }

  const admin = adminResult.rows[0];
  console.log(`✓ Found admin: ${admin.email}`);
  console.log(`  ID: ${admin.id}`);
  console.log(`  Hash preview: ${admin.password_hash?.substring(0, 30)}...\n`);

  const adminMatch = await bcrypt.compare(testPassword, admin.password_hash);
  console.log(`Admin password match: ${adminMatch ? '✅ YES' : '❌ NO'}`);
}

testElenaPassword()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });

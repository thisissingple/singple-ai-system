/**
 * Create Admin User Script
 * 建立管理員帳號腳本
 *
 * Usage: npx tsx scripts/create-admin-user.ts
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔑 Environment variables loaded:');
console.log(`   SUPABASE_URL: ${supabaseUrl ? '✓ Set' : '✗ Missing'}`);
console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✓ Set (length: ' + supabaseServiceKey.length + ')' : '✗ Missing'}`);
console.log('');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🔍 Checking existing users in database...\n');

  // Check existing users
  const { data: existingUsers, error: fetchError } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, role, roles, status')
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('❌ Error fetching users:', fetchError);
    process.exit(1);
  }

  console.log(`📊 Found ${existingUsers?.length || 0} existing users:\n`);

  if (existingUsers && existingUsers.length > 0) {
    existingUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Roles: ${JSON.stringify(user.roles)}`);
      console.log(`   Status: ${user.status}`);
      console.log('');
    });

    // Check if admin exists
    const hasAdmin = existingUsers.some(u =>
      u.roles?.includes('admin') || u.role === 'admin'
    );

    if (hasAdmin) {
      console.log('✅ Admin user already exists!');
      console.log('ℹ️  If you need to reset password, use the admin panel or database directly.');
      return;
    }
  }

  console.log('⚠️  No admin user found. Creating default admin account...\n');

  // Create admin user
  const adminEmail = 'admin@singple.com';
  const adminPassword = 'Admin123!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({
      email: adminEmail,
      first_name: 'Admin',
      last_name: 'User',
      password_hash: passwordHash,
      role: 'admin',
      roles: ['admin'],
      status: 'active',
      must_change_password: false,
      department: null,
      failed_login_attempts: 0,
      locked_until: null,
    })
    .select()
    .single();

  if (insertError) {
    console.error('❌ Error creating admin user:', insertError);
    process.exit(1);
  }

  console.log('✅ Admin user created successfully!\n');
  console.log('📝 Login credentials:');
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log('\n⚠️  IMPORTANT: Please change this password after first login!\n');
  console.log('🔗 Login at: https://singple-ai-system.zeabur.app/login\n');
}

main().catch(console.error);

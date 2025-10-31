/**
 * 批量建立教師帳號
 *
 * 使用方式：
 * npx tsx scripts/create-teacher-accounts.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface TeacherAccount {
  name: string;
  email: string;
  password: string; // 初始密碼
  chineseName?: string; // 中文姓名（選填）
}

// 🔧 在這裡輸入要建立的教師帳號
const teachersToCreate: TeacherAccount[] = [
  {
    name: 'teacher1',
    email: 'teacher1@example.com',
    password: 'Teacher123!',
    chineseName: '張老師',
  },
  {
    name: 'teacher2',
    email: 'teacher2@example.com',
    password: 'Teacher123!',
    chineseName: '李老師',
  },
  // 繼續新增更多教師...
];

async function createTeacherAccounts() {
  console.log('🚀 開始建立教師帳號...\n');

  for (const teacher of teachersToCreate) {
    try {
      console.log(`📝 建立帳號: ${teacher.email} (${teacher.chineseName || teacher.name})`);

      // 1. 檢查帳號是否已存在
      const { data: existing } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', teacher.email)
        .single();

      if (existing) {
        console.log(`   ⚠️  帳號已存在，跳過\n`);
        continue;
      }

      // 2. 加密密碼
      const hashedPassword = await bcrypt.hash(teacher.password, 10);

      // 3. 建立使用者
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: teacher.email,
          first_name: teacher.chineseName || teacher.name,
          last_name: '',
          password_hash: hashedPassword,
          roles: [], // ✅ 不預設角色，由管理員手動分配
          status: 'active',
          must_change_password: true, // ✅ 強制首次登入修改密碼
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error(`   ❌ 建立失敗: ${createError.message}\n`);
        continue;
      }

      console.log(`   ✅ 建立成功！`);
      console.log(`      ID: ${newUser.id}`);
      console.log(`      初始密碼: ${teacher.password}`);
      console.log(`      首次登入需修改密碼: 是\n`);

    } catch (error) {
      console.error(`   ❌ 發生錯誤:`, error);
      console.log('');
    }
  }

  console.log('✨ 完成！\n');
  console.log('📋 建立摘要：');
  console.log(`   總共嘗試建立: ${teachersToCreate.length} 個帳號`);
  console.log('\n💡 提醒：');
  console.log('   1. 請將初始密碼提供給教師');
  console.log('   2. 教師首次登入時會被要求修改密碼');
  console.log('   3. 預設角色為 teacher，如需調整請至權限管理頁面設定');
}

// 執行
createTeacherAccounts()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('腳本執行失敗:', error);
    process.exit(1);
  });

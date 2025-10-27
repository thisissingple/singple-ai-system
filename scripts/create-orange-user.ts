import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const SALT_ROUNDS = 10;

async function createOrangeUser() {
  // 從環境變數讀取 Supabase 連線資訊
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ 錯誤: SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 環境變數未設定');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('🔍 查詢 xk4xk4563022@gmail.com 的權限...');

    // 查詢參考帳號的權限
    const { data: referenceUser, error: refError } = await supabase
      .from('users')
      .select('email, roles, is_active, status')
      .eq('email', 'xk4xk4563022@gmail.com')
      .single();

    if (refError || !referenceUser) {
      console.error('❌ 找不到參考帳號 xk4xk4563022@gmail.com');
      process.exit(1);
    }

    console.log('✅ 參考帳號資訊:');
    console.log('   Email:', referenceUser.email);
    console.log('   Roles:', referenceUser.roles);
    console.log('   Is Active:', referenceUser.is_active);
    console.log('   Status:', referenceUser.status);

    // 加密密碼
    console.log('\n🔐 加密密碼...');
    const defaultPassword = 'Orange@2025';
    const passwordHash = await bcrypt.hash(defaultPassword, SALT_ROUNDS);

    // 建立 Orange 帳號
    console.log('\n👤 建立 Orange 帳號...');
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .upsert({
        email: 'orange@thisissingple.com',
        password_hash: passwordHash,
        first_name: 'Orange',
        last_name: '',
        roles: referenceUser.roles,
        is_active: referenceUser.is_active,
        status: referenceUser.status || 'active',
        must_change_password: true,  // 首次登入需要修改密碼
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ 建立帳號失敗:', createError);
      process.exit(1);
    }

    console.log('\n✅ Orange 帳號建立成功！');
    console.log('');
    console.log('📧 Email: orange@thisissingple.com');
    console.log('🔑 預設密碼: Orange@2025');
    console.log('👥 權限: ', newUser.roles);
    console.log('⚡ 狀態: ', newUser.is_active ? '啟用' : '停用');
    console.log('');
    console.log('⚠️  重要提示:');
    console.log('   1. 請告知 Orange 使用預設密碼登入');
    console.log('   2. 首次登入後系統會要求修改密碼');
    console.log('   3. 請妥善保管新密碼');

  } catch (error) {
    console.error('❌ 執行失敗:', error);
    process.exit(1);
  }
}

createOrangeUser();

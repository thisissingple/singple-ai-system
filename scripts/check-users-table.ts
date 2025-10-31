import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsersTable() {
  console.log('🔍 檢查 users 表結構...\n');

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  if (error) {
    console.error('查詢錯誤:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('📋 users 表欄位：');
    console.log(Object.keys(data[0]));
  }
}

checkUsersTable();

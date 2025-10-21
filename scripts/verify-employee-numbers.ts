/**
 * 驗證員工編號建立結果
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 缺少環境變數');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifyEmployeeNumbers() {
  console.log('🔍 驗證員工編號與角色身份...\n');

  try {
    // 查詢所有員工資料
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, email, status')
      .order('first_name', { ascending: true });

    if (usersError) throw usersError;

    // 查詢 employee_profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('employee_profiles')
      .select('user_id, employee_number');

    if (profilesError) throw profilesError;

    // 查詢 business_identities
    const { data: identities, error: identitiesError } = await supabase
      .from('business_identities')
      .select('user_id, identity_type, identity_code, is_active');

    if (identitiesError) throw identitiesError;

    // 組合資料
    const profileMap = new Map(profiles?.map(p => [p.user_id, p.employee_number]) || []);
    const identitiesMap = new Map();

    identities?.forEach(id => {
      if (!identitiesMap.has(id.user_id)) {
        identitiesMap.set(id.user_id, []);
      }
      identitiesMap.get(id.user_id).push({
        code: id.identity_code,
        type: id.identity_type,
        active: id.is_active
      });
    });

    console.log('📊 員工編號與角色身份對照表\n');
    console.log('姓名           員工編號    角色身份編號                  狀態');
    console.log('─'.repeat(75));

    let totalEmployees = 0;
    let withEmployeeNumber = 0;
    let withBusinessIdentity = 0;

    users?.forEach(user => {
      totalEmployees++;
      const name = (user.first_name || user.email || 'Unknown').padEnd(15).substring(0, 15);
      const empNum = (profileMap.get(user.id) || '-').padEnd(12);
      const status = user.status === 'active' ? '在職' : '離職';

      if (profileMap.get(user.id)) withEmployeeNumber++;

      const ids = identitiesMap.get(user.id) || [];
      if (ids.length > 0) withBusinessIdentity++;

      const identitiesStr = ids
        .map(id => `${id.code}(${id.type})${id.active ? '✓' : '✗'}`)
        .join(', ') || '-';

      console.log(`${name} ${empNum} ${identitiesStr.padEnd(30)} ${status}`);
    });

    console.log('─'.repeat(75));
    console.log(`\n📈 統計資料：`);
    console.log(`   總員工數: ${totalEmployees}`);
    console.log(`   有員工編號: ${withEmployeeNumber} (${Math.round(withEmployeeNumber/totalEmployees*100)}%)`);
    console.log(`   有角色身份: ${withBusinessIdentity} (${Math.round(withBusinessIdentity/totalEmployees*100)}%)`);

    console.log(`\n✅ 驗證完成！`);

  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
    process.exit(1);
  }
}

verifyEmployeeNumbers();

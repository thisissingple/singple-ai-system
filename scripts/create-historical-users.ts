/**
 * 建立歷史人員記錄（已離職）
 * 這些人員在歷史資料中出現過，但目前已不在職
 */

import { createPool, queryDatabase } from '../server/services/pg-client';

interface UserToCreate {
  first_name: string;
  role: 'consultant' | 'sales' | 'teacher';
  email: string;
  identities: Array<'teacher' | 'consultant' | 'sales'>;
}

const historicalUsers: UserToCreate[] = [
  // 諮詢師（已離職）
  {
    first_name: 'Vivi',
    role: 'consultant',
    email: 'vivi@example.com',
    identities: ['consultant'],
  },
  {
    first_name: 'Wendy',
    role: 'consultant',
    email: 'wendy@example.com',
    identities: ['consultant'],
  },
  {
    first_name: '47',
    role: 'consultant',
    email: '47@example.com',
    identities: ['consultant', 'sales'],
  },
  {
    first_name: 'JU',
    role: 'consultant',
    email: 'ju@example.com',
    identities: ['consultant'],
  },
  {
    first_name: 'Isha',
    role: 'consultant',
    email: 'isha@example.com',
    identities: ['consultant'],
  },
  {
    first_name: 'Ivan',
    role: 'consultant',
    email: 'ivan@example.com',
    identities: ['consultant'],
  },

  // 銷售（已離職）
  {
    first_name: '翊瑄',
    role: 'sales',
    email: 'yixuan@example.com',
    identities: ['sales'],
  },
  {
    first_name: '文軒',
    role: 'sales',
    email: 'wenxuan@example.com',
    identities: ['sales'],
  },
];

async function createHistoricalUsers() {
  console.log('🚀 開始建立歷史人員記錄...\n');

  for (const user of historicalUsers) {
    try {
      // 檢查是否已存在
      const existing = await queryDatabase(
        'SELECT id, first_name FROM users WHERE first_name = $1',
        [user.first_name]
      );

      if (existing.rows.length > 0) {
        console.log(`⏭️  ${user.first_name} 已存在，跳過`);
        continue;
      }

      // 建立 user（狀態設為 inactive - 離職）
      const result = await queryDatabase(
        `INSERT INTO users (first_name, email, role, status)
         VALUES ($1, $2, $3, 'inactive')
         RETURNING id, first_name, role, status`,
        [user.first_name, user.email, user.role]
      );

      const userId = result.rows[0].id;
      console.log(`✅ 已建立 ${user.first_name} (${user.role}) - 狀態: inactive (離職)`);

      // 為每個身份建立 business_identity
      for (const identityType of user.identities) {
        const identityResult = await queryDatabase(
          `INSERT INTO business_identities (
            user_id,
            identity_type,
            display_name,
            effective_from,
            effective_to,
            is_active
          )
          VALUES ($1, $2, $3, '2024-01-01', CURRENT_DATE, false)
          RETURNING identity_code, identity_type`,
          [userId, identityType, user.first_name]
        );

        const { identity_code, identity_type } = identityResult.rows[0];
        console.log(`   └─ 業務身份: ${identity_type} ${identity_code} (已停用)`);
      }

      console.log('');
    } catch (error) {
      console.error(`❌ 建立 ${user.first_name} 失敗:`, error);
      throw error;
    }
  }

  console.log('✨ 完成！所有歷史人員已建立');
}

// 執行
createHistoricalUsers().catch((error) => {
  console.error('執行失敗:', error);
  process.exit(1);
});
